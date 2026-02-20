"""
Groq AI service — symptom parsing, patient insight, doctor summary, escalation verdict.
All calls are wrapped with retry logic and error handling so AI failures never crash the app.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from groq import AsyncGroq, APIError, APITimeoutError, RateLimitError

from app.core.config import settings
from app.core.constants import CACHE_TTL, GROQ
from app.core.logger import logger
from app.core.redis import redis_client

client = AsyncGroq(
    api_key=settings.groq_api_key,
    timeout=float(GROQ["timeout"]),
)

MAX_RETRIES = 2


def _extract_json(text: str) -> dict[str, Any] | None:
    """Robustly extract JSON from LLM response (handles markdown fences, extra text)."""
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```", "", cleaned).strip()

    # Try direct parse
    try:
        return json.loads(cleaned)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        pass

    # Try to find JSON object within text
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group())  # type: ignore[no-any-return]
        except json.JSONDecodeError:
            pass

    return None


async def _chat(
    system_prompt: str,
    user_prompt: str,
    cache_key: str | None = None,
    ttl: int = 3600,
    max_tokens: int | None = None,
) -> dict[str, Any] | None:
    """Generic Groq chat completion with Redis caching and retry logic."""
    # Check cache first
    if cache_key:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                logger.info("groq_cache_hit", key=cache_key)
                return json.loads(cached)
        except Exception:
            pass  # Redis failure shouldn't block AI calls

    tokens = max_tokens or GROQ["max_tokens"]

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=tokens,
                temperature=GROQ["temperature"],
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or "{}"
            result = _extract_json(content)

            if result is None:
                logger.warning("groq_json_parse_failed", response_preview=content[:200])
                return None

            # Cache result
            if cache_key:
                try:
                    await redis_client.set(cache_key, json.dumps(result), ex=ttl)
                except Exception:
                    pass  # Cache write failure is non-critical

            return result

        except RateLimitError:
            logger.warning("groq_rate_limited", attempt=attempt)
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)
                continue
            return None

        except APITimeoutError:
            logger.warning("groq_timeout", attempt=attempt)
            if attempt < MAX_RETRIES:
                continue
            return None

        except APIError as e:
            logger.error("groq_api_error", status=getattr(e, "status_code", None), error=str(e))
            return None

        except Exception as e:
            logger.error("groq_unexpected_error", error=str(e))
            return None

    return None


async def parse_symptom_input(notes: str) -> dict[str, Any] | None:
    """Parse free-text symptom notes into structured data."""
    system = (
        "You are a medical symptom parser. Extract symptoms from the patient's notes. "
        "Return JSON: {\"symptoms\": [{\"name\": str, \"severity\": \"mild|moderate|severe\", \"duration\": str|null}], "
        "\"concerns\": [str], \"recommendations\": [str]}"
    )
    return await _chat(system, notes, max_tokens=300)


async def generate_patient_insight(patient_data: dict) -> dict[str, Any] | None:
    """Generate a personalized insight for the patient based on their recent logs."""
    cache_key = f"insight:{patient_data.get('patient_id')}:{patient_data.get('date', 'latest')}"
    system = (
        "You are a compassionate recovery assistant. Analyze the patient's symptom data and provide "
        "encouraging, actionable insights. Return JSON: {\"summary\": str, \"tips\": [str], "
        "\"encouragement\": str, \"warning_signs\": [str]}"
    )
    return await _chat(system, json.dumps(patient_data), cache_key=cache_key, ttl=CACHE_TTL["patient_insight"], max_tokens=500)


async def generate_doctor_summary(patient_data: dict) -> dict[str, Any] | None:
    """Generate a clinical summary for the doctor reviewing a patient."""
    cache_key = f"doc_summary:{patient_data.get('patient_id')}:{patient_data.get('log_count', 0)}"
    system = (
        "You are a clinical assistant. Summarize the patient's recovery progress for their doctor. "
        "Return JSON: {\"overview\": str, \"trends\": {\"improving\": [str], \"declining\": [str], \"stable\": [str]}, "
        "\"risk_factors\": [str], \"recommendations\": [str]}"
    )
    return await _chat(system, json.dumps(patient_data), cache_key=cache_key, ttl=CACHE_TTL["doctor_summary"], max_tokens=600)


async def get_escalation_verdict(symptom_data: dict, rule_results: list[dict]) -> dict[str, Any] | None:
    """Ask AI to validate rule-based escalation triggers and provide a verdict."""
    cache_key = f"escalation:{symptom_data.get('log_id')}"
    system = (
        "You are a clinical escalation reviewer. Given the patient's symptoms and rule-based triggers, "
        "decide if escalation is warranted. Return JSON: {\"should_escalate\": bool, \"severity\": \"LOW|MEDIUM|HIGH|CRITICAL\", "
        "\"reasoning\": str, \"immediate_actions\": [str]}"
    )
    prompt = json.dumps({"symptoms": symptom_data, "triggered_rules": rule_results})
    result = await _chat(system, prompt, cache_key=cache_key, ttl=CACHE_TTL["escalation_verdict"], max_tokens=400)

    # Safe fallback — if AI fails, default to MONITOR (never silently ignore)
    if result is None:
        logger.warning("groq_escalation_fallback", msg="AI unavailable — defaulting to MONITOR")
        return {
            "should_escalate": True,
            "severity": "MEDIUM",
            "reasoning": "AI analysis unavailable — defaulting to MONITOR for safety",
            "immediate_actions": ["Manual review recommended"],
        }

    return result
