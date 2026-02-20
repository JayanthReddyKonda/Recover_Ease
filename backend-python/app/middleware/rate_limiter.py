"""
Rate-limiting via slowapi.
Applied as middleware — no per-endpoint decorators needed.
"""

from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.core.constants import RATE_LIMITS

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[RATE_LIMITS["general"]],
)

# Rate limit strings for reference
GENERAL_LIMIT = RATE_LIMITS["general"]
AUTH_LIMIT = RATE_LIMITS["auth"]
AI_LIMIT = RATE_LIMITS["ai"]
