"""
Application settings -- validated via pydantic-settings.
Single source of truth for all environment variables.
Crashes immediately on startup if required vars are invalid.
"""

from pathlib import Path

from pydantic import field_validator
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

    # -- Database --
    database_url: str

    # -- Redis --
    redis_url: str = "redis://127.0.0.1:6379/0"

    # -- JWT --
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # -- Groq AI --
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    # -- SMTP Email (Gmail recommended) --
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""          # your Gmail address
    smtp_password: str = ""      # Gmail App Password (16-char, needs 2FA)
    smtp_from_name: str = "Recovery Companion"

    # -- WhatsApp Business (Meta Cloud API) --
    # Get from: https://developers.facebook.com/apps → WhatsApp → API Setup
    whatsapp_token: str = ""              # permanent or temp access token
    whatsapp_phone_number_id: str = ""    # Phone Number ID (not the phone number itself)
    whatsapp_verify_token: str = "recovery_companion_whatsapp"  # set this in Meta webhook config

    # -- Server --
    port: int = 8000
    cors_origin: str = "*"
    node_env: str = "production"

    @property
    def is_production(self) -> bool:
        return self.node_env == "production"

    @property
    def smtp_enabled(self) -> bool:
        """True when a Gmail address and App Password are configured."""
        return bool(self.smtp_user and self.smtp_password)

    @property
    def whatsapp_enabled(self) -> bool:
        """True when Meta Cloud API credentials are configured."""
        return bool(self.whatsapp_token and self.whatsapp_phone_number_id)

    # -- Validators --
    @field_validator("database_url")
    @classmethod
    def _db_must_be_async(cls, v: str) -> str:
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError(
                "DATABASE_URL must use the asyncpg driver. "
                "Expected: postgresql+asyncpg://user:pass@host:5432/db"
            )
        return v

    @field_validator("jwt_secret")
    @classmethod
    def _jwt_must_be_strong(cls, v: str) -> str:
        if "CHANGE_ME" in v or "change_me" in v:
            raise ValueError(
                "JWT_SECRET still contains placeholder text. "
                'Generate: python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        if len(v) < 32:
            raise ValueError(
                f"JWT_SECRET is only {len(v)} chars -- must be >= 32. "
                'Generate: python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return v

    @field_validator("groq_api_key")
    @classmethod
    def _groq_key_format(cls, v: str) -> str:
        if "CHANGE_ME" in v:
            raise ValueError(
                "GROQ_API_KEY still contains placeholder text. "
                "Get a real key at https://console.groq.com/keys"
            )
        if not v.startswith("gsk_"):
            raise ValueError(
                "GROQ_API_KEY must start with 'gsk_'. "
                "Get one free at https://console.groq.com/keys"
            )
        return v


settings = Settings()
