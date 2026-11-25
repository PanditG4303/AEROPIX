"""Image and album response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from ..utils.time import iso_utc


class AlbumRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ImageOut(BaseModel):
    id: int
    original_filename: str
    mime_type: str
    extension: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    is_favorite: bool
    is_demo: bool
    created_at: datetime
    albums: list[AlbumRef] = Field(default_factory=list)
    url: str | None = None
    thumbnail_url: str | None = None
    storage_backend: str
    storage_provider: str
    object_key: str

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str:
        return iso_utc(value)


class ImageListOut(BaseModel):
    items: list[ImageOut]
    total: int
    limit: int
    offset: int


class ImageUpdateRequest(BaseModel):
    original_filename: str | None = Field(default=None, min_length=1, max_length=200)
    is_favorite: bool | None = None


class BulkDeleteRequest(BaseModel):
    image_ids: list[int] = Field(min_length=1, max_length=200)


class AlbumOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    image_count: int = 0
    cover_url: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _serialize_dates(self, value: datetime) -> str:
        return iso_utc(value)


class AlbumDetailOut(AlbumOut):
    images: list[ImageOut] = Field(default_factory=list)


class AlbumCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)


class AlbumUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = Field(default=None, max_length=500)


class AlbumImagesRequest(BaseModel):
    image_ids: list[int] = Field(min_length=1, max_length=200)
