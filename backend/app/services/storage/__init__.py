"""Storage backend selection and status reporting."""
from __future__ import annotations

from typing import Any

from ...config import settings
from .base import StorageBackend, StorageError, StorageObjectNotFound
from .local import LocalStorage
from .s3 import S3Storage


def get_storage() -> StorageBackend:
    """FastAPI dependency — returns the backend configured by STORAGE_BACKEND."""
    if settings.storage_backend == "s3":
        return S3Storage(settings)
    return LocalStorage(
        settings.local_storage_path,
        settings.secret_key,
        ttl_seconds=settings.local_url_ttl_seconds,
    )


def storage_status(storage: StorageBackend) -> dict[str, Any]:
    health = storage.health()
    payload = storage.describe()
    payload.update(
        {
            "configured": health.configured,
            "reachable": health.reachable,
            "health_detail": health.detail,
            "latency_ms": health.latency_ms,
            "max_upload_mb": settings.max_upload_mb,
            "quota_mb": settings.storage_quota_mb,
            "presign_ttl_seconds": settings.media_url_ttl_seconds,
            "allowed_types": ["jpg", "jpeg", "png", "webp", "gif"],
        }
    )
    if health.extras.get("path") and payload.get("backend") == "local":
        payload["local_path"] = health.extras["path"]
    return payload


__all__ = [
    "StorageBackend",
    "StorageError",
    "StorageObjectNotFound",
    "LocalStorage",
    "S3Storage",
    "get_storage",
    "storage_status",
]
