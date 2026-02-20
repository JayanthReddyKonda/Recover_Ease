"""
Rate-limiting middleware via slowapi.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.constants import RATE_LIMITS

limiter = Limiter(key_func=get_remote_address)

# Pre-built decorators for common limits
GENERAL_LIMIT = RATE_LIMITS["general"]
AUTH_LIMIT = RATE_LIMITS["auth"]
AI_LIMIT = RATE_LIMITS["ai"]
