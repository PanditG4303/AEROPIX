"""Application settings for AEROPIX.

Configuration is read from environment variables and an optional `.env` file
at the repository root. No AWS credentials are ever hardcoded here.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DEFAULT_SECRET = "aeropix-development-secret-change-me-in-production"

EnvName = Literal["development", "test", "production"]
StorageBackendName = Literal["local", "s3"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application -------------------------------------------------------
    app_name: str = "AEROPIX"
    app_version: str = "1.0.0"
    environment: EnvName = "development"
    debug: bool = False
    secret_key: str = DEFAULT_SECRET
    access_token_expire_minutes: int = 60 * 24 * 7
    allowed_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )
    allowed_hosts: str = "*"
    log_level: str = "INFO"

    # --- Database ----------------------------------------------------------
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'aeropix.db').as_posix()}"

    # --- Uploads -----------------------------------------------------------
    max_upload_mb: int = Field(default=15, ge=1, le=100)
    storage_quota_mb: int = Field(default=5120, ge=1)
    allowed_extensions: str = "jpg,jpeg,png,webp,gif"

    # --- Storage -----------------------------------------------------------
    storage_backend: StorageBackendName = "local"
    local_storage_path: str = str(BACKEND_DIR / "data" / "media")
    local_url_ttl_seconds: int = Field(default=900, ge=60, le=86400)

    aws_region: str = "ap-south-1"
    aws_bucket_name: str = ""
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_session_token: str | None = None
    aws_endpoint_url: str | None = None
    s3_key_prefix: str = ""
    s3_presign_expire_seconds: int = Field(default=900, ge=60, le=604800)
    s3_use_sse: bool = True

    # --- Demo seed ---------------------------------------------------------
    seed_demo_data: bool = True
    demo_email: str = "demo@aeropix.app"
    demo_password: str = "AeropixDemo123!"
    demo_storage_quota_mb: int = 5120

    # --- Frontend build (served by FastAPI in single-origin deployments) ---
    frontend_dist: str = str(PROJECT_ROOT / "frontend" / "dist")

    @field_validator("secret_key")
    @classmethod
    def _secret_must_be_reasonable(cls, value: str) -> str:
        if len(value) < 24:
            raise ValueError("SECRET_KEY must be at least 24 characters long.")
        return value

    @field_validator("allowed_origins")
    @classmethod
    def _strip_origins(cls, value: str) -> str:
        return ",".join(part.strip() for part in value.split(",") if part.strip())

    @model_validator(mode="after")
    def _production_checks(self) -> "Settings":
        if self.environment == "production":
            if self.secret_key == DEFAULT_SECRET:
                raise ValueError(
                    "Refusing to start in production with the default SECRET_KEY. "
                    "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
                )
            if self.storage_backend == "s3" and not self.aws_bucket_name:
                raise ValueError("STORAGE_BACKEND=s3 requires AWS_BUCKET_NAME to be set.")
        return self

    # --- Convenience properties -------------------------------------------
    @property
    def origins(self) -> list[str]:
        return [origin for origin in self.allowed_origins.split(",") if origin]

    @property
    def hosts(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def storage_quota_bytes(self) -> int:
        return self.storage_quota_mb * 1024 * 1024

    @property
    def allowlisted_extensions(self) -> set[str]:
        return {ext.strip().lower().lstrip(".") for ext in self.allowed_extensions.split(",")}

    @property
    def media_url_ttl_seconds(self) -> int:
        if self.storage_backend == "s3":
            return self.s3_presign_expire_seconds
        return self.local_url_ttl_seconds

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
