#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL..."
until python -c "
import asyncio, asyncpg, os
async def check():
    url = os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
    url = url.replace('postgresql+asyncpg', 'postgresql')
    # Parse asyncpg-style URL
    conn = await asyncpg.connect(dsn=url.replace('postgresql+asyncpg://', 'postgresql://'))
    await conn.close()
asyncio.run(check())
" 2>/dev/null; do
  echo "  PostgreSQL not ready — retrying in 2s..."
  sleep 2
done
echo "✅ PostgreSQL is up"

echo "⏳ Waiting for Redis..."
until python -c "
import redis, os
r = redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
r.ping()
" 2>/dev/null; do
  echo "  Redis not ready — retrying in 2s..."
  sleep 2
done
echo "✅ Redis is up"

echo "🚀 Starting application..."
exec "$@"
