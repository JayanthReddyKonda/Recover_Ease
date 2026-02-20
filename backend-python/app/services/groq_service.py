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


async def structure_clinical_request(
    disease_description: str,
    medications: list[dict] | None,
    visit_date: str | None,
    patient_name: str | None = None,
    doctor_name: str | None = None,
) -> dict[str, Any] | None:
    """
    AI structures a doctor's clinical request into a formatted care plan.
    Called when a doctor sends a connection request to a patient.
    """
    system = (
        "You are a clinical AI assistant. Structure a doctor's care request for a patient into a "
        "clear, organised care plan. Be concise and patient-friendly. "
        "Return ONLY valid JSON — no extra text or markdown."
    )
    user_prompt = (
        f"Doctor: {doctor_name or 'Unknown'}\n"
        f"Patient: {patient_name or 'Unknown'}\n"
        f"Visit/Surgery Date: {visit_date or 'Not specified'}\n\n"
        f"Condition Description:\n{disease_description}\n\n"
        f"Medications:\n{json.dumps(medications or [], indent=2)}\n\n"
        'Return JSON: {"condition_summary": str, "diagnosis_keywords": [str], '
        '"medication_schedule": [{"name": str, "dosage": str, "frequency": str, '
        '"time_of_day": str, "instructions": str}], '
        '"care_instructions": [str], "dietary_notes": [str], '
        '"activity_restrictions": [str], "follow_up_timeline": str, '
        '"risk_flags": [str], "urgency": "ROUTINE|MODERATE|HIGH"}'
    )
    return await _chat(system, user_prompt, max_tokens=900)


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


# ─── Conversational AI chat ─────────────────────────────────────────────────

RECOVERY_COMPANION_SYSTEM = """You are Recovery Companion AI — a warm, knowledgeable, and empathetic virtual health assistant specialising in post-surgical recovery. You help patients understand their symptoms, manage their recovery journey, and feel supported.

Guidelines:
• Be conversational, supportive, and encouraging — not clinical or cold.
• You can discuss pain levels, medication reminders, sleep, mood, fatigue, physiotherapy exercises, and recovery milestones.
• If the patient describes emergency symptoms (chest pain, severe bleeding, high fever >103°F, loss of consciousness), immediately instruct them to call emergency services and contact their doctor.
• Never diagnose or prescribe — always encourage consulting their doctor for medical decisions.
• Keep responses concise (2-4 sentences unless more detail is asked for).
• You have access to their recent symptom logs if provided in the context message.
• Always end with one encouraging or actionable sentence."""


async def ai_chat_reply(
    conversation_history: list[dict[str, str]],
    patient_context: dict | None = None,
) -> str | None:
    """
    Generate a conversational AI reply given the full message history.

    conversation_history: list of {"role": "user"|"assistant", "content": str}
    patient_context: optional dict with patient's recent symptom data to inject into the system prompt
    """
    system = RECOVERY_COMPANION_SYSTEM
    if patient_context:
        system += f"\n\nPatient context (recent data):\n{json.dumps(patient_context, indent=2)}"

    messages_payload: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages_payload.extend(conversation_history[-20:])  # keep last 20 turns to stay within token limits

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model=settings.groq_model,
                messages=messages_payload,  # type: ignore[arg-type]
                max_tokens=400,
                temperature=0.75,
                # No response_format=json here — we want natural language
            )
            return (response.choices[0].message.content or "").strip()

        except RateLimitError:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)
            else:
                return "I'm a little busy right now — please try again in a moment."

        except (APITimeoutError, APIError, Exception) as e:
            logger.error("groq_chat_error", error=str(e))
            return "Sorry, I couldn't process that. Please try again."

    return None


# ─── WhatsApp message parser ───────────────────────────────────────────────

async def parse_whatsapp_message(text: str) -> dict:
    """
    Parse a free-text WhatsApp message (e.g. "knee hurts, pain 7, slept 5 hours")
    into structured SymptomLog fields.  Missing fields get sensible defaults.
    Returns a dict with all fields required by LogSymptomRequest.
    """
    system = (
        "You are a medical intake assistant for a post-surgery recovery app. "
        "Parse the patient's informal WhatsApp message into structured recovery data. "
        "Extract numeric values where explicitly stated. "
        "Use these defaults for fields NOT mentioned: "
        "pain_level=5, fatigue_level=5, mood=5, sleep_hours=7, appetite=5, energy=5. "
        "pain_level, fatigue_level, mood, appetite, energy are integers 1-10. "
        "sleep_hours is a float 0-24. "
        "Return ONLY valid JSON: "
        '{"pain_level": int, "fatigue_level": int, "mood": int, '
        '"sleep_hours": float, "appetite": int, "energy": int, '
        '"notes": str, "parsed_fields": [str]}'
        " where parsed_fields lists ONLY the field names the patient explicitly mentioned."
    )
    result = await _chat(system, f"Patient WhatsApp message: {text}", max_tokens=250)

    defaults = {
        "pain_level": 5, "fatigue_level": 5, "mood": 5,
        "sleep_hours": 7.0, "appetite": 5, "energy": 5,
        "notes": text, "parsed_fields": [],
    }

    if result is None:
        return defaults

    # Merge + clamp values against valid ranges
    for field, lo, hi in [
        ("pain_level", 1, 10), ("fatigue_level", 1, 10), ("mood", 1, 10),
        ("appetite", 1, 10), ("energy", 1, 10),
    ]:
        try:
            defaults[field] = max(lo, min(hi, int(result.get(field, defaults[field]))))
        except (TypeError, ValueError):
            pass

    try:
        sleep = float(result.get("sleep_hours", 7.0))
        defaults["sleep_hours"] = max(0.0, min(24.0, sleep))
    except (TypeError, ValueError):
        pass

    defaults["notes"] = str(result.get("notes") or text).strip() or text
    defaults["parsed_fields"] = result.get("parsed_fields", [])

    return defaults


# ─── Audio transcription ────────────────────────────────────────────────────

async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe recorded voice audio using Groq's Whisper-large-v3-turbo model.
    Returns the transcript text.
    """
    import io
    try:
        response = await client.audio.transcriptions.create(
            file=(filename, io.BytesIO(audio_bytes), "audio/webm"),
            model="whisper-large-v3-turbo",
            response_format="text",
        )
        # response is a plain string when response_format="text"
        return (response if isinstance(response, str) else str(response)).strip()
    except Exception as e:
        logger.error("groq_transcription_error", error=str(e))
        raise RuntimeError(f"Transcription failed: {e}") from e
