"""Dashboard and storage status schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_serializer

from ..utils.time import iso_utc
from .image import AlbumOut, ImageOut


class ActivityPoint(BaseModel):
    date: str
    uploads: int


class TypeUsage(BaseModel):
    type: str
    count: int
    bytes: int


class DashboardStats(BaseModel):
    total_images: int
    total_albums: int
    total_favorites: int
    storage_used_bytes: int
    storage_quota_bytes: int
    storage_used_percent: float
    recent_uploads: list[ImageOut]
    recent_albums: list[AlbumOut]
    activity: list[ActivityPoint]
    storage_by_type: list[TypeUsage]
    largest_image_bytes: int


class StorageStatusOut(BaseModel):
    backend: str
    provider: str
    mode: str
    configured: bool
    reachable: bool | None
    health_detail: str
    latency_ms: int | None = None
    bucket: str | None = None
    region: str | None = None
    encryption: str
    presign_ttl_seconds: int
    max_upload_mb: int
    quota_mb: int
    allowed_types: list[str]
    private: bool
    prefix: str | None = None
    local_path: str | None = None


class HealthOut(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    storage_backend: str
    database: str
    time: datetime
    demo_enabled: bool

    @field_serializer("time")
    def _serialize_time(self, value: datetime) -> str:
        return iso_utc(value)
