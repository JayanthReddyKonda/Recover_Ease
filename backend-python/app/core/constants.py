"""
Application constants — escalation rules, recovery stages, milestones, rate limits.
"""

from __future__ import annotations

from typing import Any

# ── Escalation Rule Thresholds ──────────────────────
ESCALATION_RULES: dict[str, dict[str, Any]] = {
    "high_pain": {
        "description": "Pain level ≥ 8",
        "threshold": 8,
        "field": "pain_level",
        "severity": "high",
    },
    "fever": {
        "description": "Temperature ≥ 38.5 °C",
        "threshold": 38.5,
        "field": "temperature",
        "severity": "high",
    },
    "low_mood": {
        "description": "Mood ≤ 2",
        "threshold": 2,
        "field": "mood",
        "severity": "medium",
        "compare": "lte",
    },
    "low_energy": {
        "description": "Energy ≤ 2",
        "threshold": 2,
        "field": "energy",
        "severity": "medium",
        "compare": "lte",
    },
    "low_sleep": {
        "description": "Sleep hours < 4",
        "threshold": 4,
        "field": "sleep_hours",
        "severity": "medium",
        "compare": "lt",
    },
    "poor_appetite": {
        "description": "Appetite ≤ 2",
        "threshold": 2,
        "field": "appetite",
        "severity": "medium",
        "compare": "lte",
    },
    "consecutive_decline": {
        "description": "3 consecutive days of declining overall well-being",
        "severity": "high",
        "type": "trend",
    },
}

# ── Auth ────────────────────────────────────────────
AUTH = {
    "salt_rounds": 12,
    "token_expiry_hours": 24,
}

# ── Rate Limits ─────────────────────────────────────
RATE_LIMITS = {
    "general": "100/minute",
    "auth": "10/minute",
    "ai": "20/minute",
}

# ── Cache TTLs (seconds) ───────────────────────────
CACHE_TTL = {
    "patient_insight": 3600,       # 1 hour
    "doctor_summary": 1800,        # 30 min
    "symptom_trend": 900,          # 15 min
    "escalation_verdict": 1800,    # 30 min
}

# ── Groq settings ──────────────────────────────────
GROQ = {
    "max_tokens": 1024,
    "temperature": 0.3,
    "timeout": 30,
}

# ── Recovery Stages (days post-discharge) ──────────
RECOVERY_STAGES = [
    {"name": "Critical", "min_day": 0, "max_day": 3, "description": "Immediate post-discharge period"},
    {"name": "Early", "min_day": 4, "max_day": 14, "description": "Early recovery — monitor closely"},
    {"name": "Mid", "min_day": 15, "max_day": 30, "description": "Mid recovery — stable improvement expected"},
    {"name": "Late", "min_day": 31, "max_day": 90, "description": "Late recovery — approaching baseline"},
    {"name": "Maintenance", "min_day": 91, "max_day": 999, "description": "Long-term maintenance"},
]

# ── Milestones ──────────────────────────────────────
MILESTONES = [
    {"key": "first_log", "title": "First Log", "icon": "📝", "check": "log_count", "threshold": 1},
    {"key": "week_streak", "title": "7-Day Streak", "icon": "🔥", "check": "streak", "threshold": 7},
    {"key": "two_week_streak", "title": "14-Day Streak", "icon": "⚡", "check": "streak", "threshold": 14},
    {"key": "month_streak", "title": "30-Day Streak", "icon": "🏆", "check": "streak", "threshold": 30},
    {"key": "improving", "title": "Getting Better", "icon": "📈", "check": "improving", "threshold": 3},
    {"key": "pain_free", "title": "Pain-Free Day", "icon": "🌟", "check": "pain_free", "threshold": 1},
    {"key": "ten_logs", "title": "10 Logs", "icon": "📊", "check": "log_count", "threshold": 10},
    {"key": "fifty_logs", "title": "50 Logs", "icon": "💪", "check": "log_count", "threshold": 50},
]
