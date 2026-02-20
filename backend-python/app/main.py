"""
FastAPI application entry point — production-ready.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

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
from app.api.chat import router as chat_router
from app.api.care_plan import router as care_plan_router

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    setup_logging()
    logger.info("starting", port=settings.port, env=settings.node_env)

    # Create tables — safe for both dev and production
    # (create_all is idempotent — skips existing tables)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("database_tables_synced")

    # Verify Redis
    try:
        await redis_client.ping()
        logger.info("redis_connected")
    except Exception as e:
        logger.warning("redis_unavailable", error=str(e))

    # Log config summary (no secrets)
    logger.info(
        "app_ready",
        cors=settings.cors_origin,
        resend_enabled=settings.resend_enabled,
        groq_model=settings.groq_model,
    )

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
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
    )

    # ── Middleware ───────────────────────────────────
    origins = settings.cors_origin.split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if "*" in origins else origins,
        allow_credentials="*" not in origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiter -- applied as middleware to ALL routes
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # Custom error handlers
    register_exception_handlers(app)

    # ── Health Check ────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health():
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "uptime": round(time.time() - START_TIME, 2),
            "environment": settings.node_env,
        }

    # ── API Routes ──────────────────────────────────
    app.include_router(auth_router, prefix="/api")
    app.include_router(symptom_router, prefix="/api")
    app.include_router(request_router, prefix="/api")
    app.include_router(patient_router, prefix="/api")
    app.include_router(ai_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(care_plan_router, prefix="/api")

    # ── Mount Socket.IO ─────────────────────────────
    sio_asgi = socketio.ASGIApp(sio, other_asgi_app=app)

    return sio_asgi


# Module-level app for `uvicorn app.main:app`
app = create_app()
