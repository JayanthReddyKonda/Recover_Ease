"""
Async Redis client.
"""

from redis.asyncio import Redis

from app.core.config import settings

redis_client = Redis.from_url(
    settings.redis_url,
    decode_responses=True,
)


async def get_redis() -> Redis:
    """FastAPI dependency — returns the shared Redis client."""
    return redis_client
