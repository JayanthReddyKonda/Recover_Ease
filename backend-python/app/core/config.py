"""
Application settings — validated via pydantic-settings.
Single source of truth for all environment variables.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to THIS file, not CWD
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ────────────────────────────────────
    database_url: str = "postgresql+asyncpg://rc_user:rc_password@127.0.0.1:5432/recovery_companion"

    # ── Redis ───────────────────────────────────────
    redis_url: str = "redis://127.0.0.1:6379/0"

    # ── JWT ─────────────────────────────────────────
    jwt_secret: str = "change_me_to_a_32_char_random_string!!"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # ── Groq AI ─────────────────────────────────────
    groq_api_key: str = "gsk_placeholder_replace_with_real_key"
    groq_model: str = "llama-3.1-70b-versatile"

    # ── Resend (email) ──────────────────────────────
    resend_api_key: str = "re_placeholder_replace_with_real_key"
    resend_from: str = "Recovery Companion <onboarding@resend.dev>"

    # ── Server ──────────────────────────────────────
    port: int = 8000
    cors_origin: str = "http://localhost:5173"
    node_env: str = "development"  # kept for parity; used as env

    @property
    def is_production(self) -> bool:
        return self.node_env == "production"


settings = Settings()
