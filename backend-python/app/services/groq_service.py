"""
Groq AI service — symptom parsing, patient insight, doctor summary, escalation verdict.
All calls are wrapped with error handling so AI failures don't crash the app.
"""

from __future__ import annotations

import json
from typing import Any

from groq import AsyncGroq

from app.core.config import settings
from app.core.constants import CACHE_TTL, GROQ
from app.core.logger import logger
from app.core.redis import redis_client

client = AsyncGroq(api_key=settings.groq_api_key)


async def _chat(system_prompt: str, user_prompt: str, cache_key: str | None = None, ttl: int = 3600) -> dict[str, Any] | None:
    """Generic Groq chat completion with optional Redis caching."""
    # Check cache
    if cache_key:
        cached = await redis_client.get(cache_key)
        if cached:
            logger.info("groq_cache_hit", key=cache_key)
            return json.loads(cached)

    try:
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=GROQ["max_tokens"],
            temperature=GROQ["temperature"],
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        result = json.loads(content)

        # Cache result
        if cache_key:
            await redis_client.set(cache_key, json.dumps(result), ex=ttl)

        return result

    except Exception as e:
        logger.error("groq_error", error=str(e))
        return None


async def parse_symptom_input(notes: str) -> dict[str, Any] | None:
    """Parse free-text symptom notes into structured data."""
    system = (
        "You are a medical symptom parser. Extract symptoms from the patient's notes. "
        "Return JSON: {\"symptoms\": [{\"name\": str, \"severity\": \"mild|moderate|severe\", \"duration\": str|null}], "
        "\"concerns\": [str], \"recommendations\": [str]}"
    )
    return await _chat(system, notes)


async def generate_patient_insight(patient_data: dict) -> dict[str, Any] | None:
    """Generate a personalized insight for the patient based on their recent logs."""
    cache_key = f"insight:{patient_data.get('patient_id')}:{patient_data.get('date', 'latest')}"
    system = (
        "You are a compassionate recovery assistant. Analyze the patient's symptom data and provide "
        "encouraging, actionable insights. Return JSON: {\"summary\": str, \"tips\": [str], "
        "\"encouragement\": str, \"warning_signs\": [str]}"
    )
    return await _chat(system, json.dumps(patient_data), cache_key=cache_key, ttl=CACHE_TTL["patient_insight"])


async def generate_doctor_summary(patient_data: dict) -> dict[str, Any] | None:
    """Generate a clinical summary for the doctor reviewing a patient."""
    cache_key = f"doc_summary:{patient_data.get('patient_id')}:{patient_data.get('log_count', 0)}"
    system = (
        "You are a clinical assistant. Summarize the patient's recovery progress for their doctor. "
        "Return JSON: {\"overview\": str, \"trends\": {\"improving\": [str], \"declining\": [str], \"stable\": [str]}, "
        "\"risk_factors\": [str], \"recommendations\": [str]}"
    )
    return await _chat(system, json.dumps(patient_data), cache_key=cache_key, ttl=CACHE_TTL["doctor_summary"])


async def get_escalation_verdict(symptom_data: dict, rule_results: list[dict]) -> dict[str, Any] | None:
    """Ask AI to validate rule-based escalation triggers and provide a verdict."""
    cache_key = f"escalation:{symptom_data.get('log_id')}"
    system = (
        "You are a clinical escalation reviewer. Given the patient's symptoms and rule-based triggers, "
        "decide if escalation is warranted. Return JSON: {\"should_escalate\": bool, \"severity\": \"LOW|MEDIUM|HIGH|CRITICAL\", "
        "\"reasoning\": str, \"immediate_actions\": [str]}"
    )
    prompt = json.dumps({"symptoms": symptom_data, "triggered_rules": rule_results})
    return await _chat(system, prompt, cache_key=cache_key, ttl=CACHE_TTL["escalation_verdict"])
