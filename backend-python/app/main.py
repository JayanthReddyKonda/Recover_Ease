"""
FastAPI application entry point.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine
from app.core.logger import logger, setup_logging
from app.core.redis import redis_client
from app.middleware.error_handler import register_exception_handlers
from app.middleware.rate_limiter import limiter
from app.models.models import Base
from app.socket.manager import sio

# ── API Routers ─────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.symptom import router as symptom_router
from app.api.request import router as request_router
from app.api.patient import router as patient_router
from app.api.ai import router as ai_router

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    setup_logging()
    logger.info("starting", port=settings.port, env=settings.node_env)

    # Create tables (dev only — use Alembic in production)
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("database_tables_synced")

    # Verify Redis
    try:
        await redis_client.ping()
        logger.info("redis_connected")
    except Exception as e:
        logger.warning("redis_unavailable", error=str(e))

    yield

    # Shutdown
    logger.info("shutting_down")
    await engine.dispose()
    await redis_client.close()


def create_app() -> socketio.ASGIApp:
    """Build and return the FastAPI application."""
    app = FastAPI(
        title="Recovery Companion API",
        version="1.0.0",
        description="Post-discharge patient recovery monitoring",
        lifespan=lifespan,
    )

    # ── Middleware ───────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # Custom error handlers
    register_exception_handlers(app)

    # ── Health Check ────────────────────────────────
    @app.get("/health")
    async def health():
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "uptime": round(time.time() - START_TIME, 2),
        }

    # ── API Routes ──────────────────────────────────
    app.include_router(auth_router, prefix="/api")
    app.include_router(symptom_router, prefix="/api")
    app.include_router(request_router, prefix="/api")
    app.include_router(patient_router, prefix="/api")
    app.include_router(ai_router, prefix="/api")

    # ── Mount Socket.IO ─────────────────────────────
    sio_asgi = socketio.ASGIApp(sio, other_asgi_app=app)

    return sio_asgi


# Module-level app for `uvicorn app.main:app`
app = create_app()
