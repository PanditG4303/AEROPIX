"""Image domain logic: validation, storage orchestration and serialisation."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..models import Album, AlbumImage, Image, User
from ..schemas.image import AlbumOut, AlbumDetailOut, AlbumRef, ImageOut
from ..utils.time import utcnow
from ..utils.validators import (
    ImageTooLargeError,
    ImageValidationError,
    make_thumbnail,
    sanitize_filename,
    validate_image_bytes,
)
from .storage import StorageBackend, StorageError


def selectinload_albums():
    """Loader options for Image.album_links -> Album."""
    return selectinload(Image.album_links).selectinload(AlbumImage.album)


def serialize_image(image: Image, storage: StorageBackend) -> ImageOut:
    ttl = settings.media_url_ttl_seconds
    try:
        url = storage.url(image.object_key, ttl)
    except StorageError:
        url = None
    try:
        thumbnail_url = storage.url(image.thumbnail_key or image.object_key, ttl)
    except StorageError:
        thumbnail_url = None

    albums = sorted(
        (
            AlbumRef(id=link.album.id, name=link.album.name)
            for link in image.album_links
            if link.album is not None
        ),
        key=lambda album: album.name.lower(),
    )
    return ImageOut(
        id=image.id,
        original_filename=image.original_filename,
        mime_type=image.mime_type,
        extension=image.extension,
        size_bytes=image.size_bytes,
        width=image.width,
        height=image.height,
        is_favorite=image.is_favorite,
        is_demo=image.is_demo,
        created_at=image.created_at,
        albums=albums,
        url=url,
        thumbnail_url=thumbnail_url or url,
        storage_backend=storage.name,
        storage_provider=storage.provider,
        object_key=image.object_key,
    )


def serialize_album(album: Album, storage: StorageBackend) -> AlbumOut:
    image_links = sorted(album.image_links, key=lambda link: link.added_at, reverse=True)
    cover_url = None
    if image_links:
        newest = image_links[0]
        if newest.image is not None:
            try:
                cover_url = storage.url(
                    newest.image.thumbnail_key or newest.image.object_key,
                    settings.media_url_ttl_seconds,
                )
            except StorageError:
                cover_url = None
    return AlbumOut(
        id=album.id,
        name=album.name,
        description=album.description,
        image_count=len(image_links),
        cover_url=cover_url,
        created_at=album.created_at,
        updated_at=album.updated_at,
    )


def image_query_for_user(user_id: int):
    return select(Image).where(Image.user_id == user_id).options(selectinload_albums())


def serialize_album_detail(album: Album, storage: StorageBackend) -> AlbumDetailOut:
    base = serialize_album(album, storage)
    ordered_links = sorted(album.image_links, key=lambda link: link.added_at, reverse=True)
    images = [
        serialize_image(link.image, storage)
        for link in ordered_links
        if link.image is not None
    ]
    return AlbumDetailOut(**base.model_dump(), images=images)


def album_query_for_user(user_id: int):
    return (
        select(Album)
        .where(Album.user_id == user_id)
        .options(
            selectinload(Album.image_links).selectinload(AlbumImage.image),
        )
    )


def user_storage_used(db: Session, user_id: int) -> int:
    value = db.scalar(select(func.coalesce(func.sum(Image.size_bytes), 0)).where(Image.user_id == user_id))
    return int(value or 0)


def get_owned_image(db: Session, user: User, image_id: int) -> Image | None:
    return db.scalar(
        image_query_for_user(user.id).where(Image.id == image_id)
    )


def get_owned_album(db: Session, user: User, album_id: int) -> Album | None:
    return db.scalar(album_query_for_user(user.id).where(Album.id == album_id))


def create_image(
    db: Session,
    user: User,
    storage: StorageBackend,
    *,
    raw: bytes,
    filename: str | None,
    content_type: str | None,
    album_id: int | None = None,
    is_demo: bool = False,
    created_at: datetime | None = None,
) -> Image:
    validated = validate_image_bytes(
        raw,
        filename=filename,
        claimed_mime=content_type,
        max_bytes=settings.max_upload_bytes,
        allowed_extensions=settings.allowlisted_extensions,
    )

    used = user_storage_used(db, user.id)
    if used + len(raw) > settings.storage_quota_bytes:
        quota_gb = settings.storage_quota_mb / 1024
        raise ImageTooLargeError(
            f"This upload would exceed your {quota_gb:.1f} GB storage quota. "
            "Delete some images and try again."
        )

    album: Album | None = None
    if album_id is not None:
        album = get_owned_album(db, user, album_id)
        if album is None:
            raise LookupError("The selected album does not exist.")

    token = uuid.uuid4().hex
    object_key = f"users/{user.id}/images/{token}.{validated.extension}"
    thumbnail_key = f"users/{user.id}/thumbnails/{token}.jpg"

    original_saved = False
    thumbnail_saved = False
    try:
        storage.save(object_key, raw, validated.mime_type)
        original_saved = True
        thumbnail_bytes = make_thumbnail(raw)
        storage.save(thumbnail_key, thumbnail_bytes, "image/jpeg")
        thumbnail_saved = True

        image = Image(
            user_id=user.id,
            original_filename=validated.normalized_filename,
            object_key=object_key,
            thumbnail_key=thumbnail_key,
            mime_type=validated.mime_type,
            extension=validated.extension,
            size_bytes=len(raw),
            width=validated.width,
            height=validated.height,
            is_favorite=False,
            is_demo=is_demo,
            created_at=created_at or utcnow(),
        )
        db.add(image)
        db.flush()
        if album is not None:
            db.add(AlbumImage(album_id=album.id, image_id=image.id))
        db.commit()
        db.refresh(image)
        return image
    except Exception:
        db.rollback()
        if thumbnail_saved:
            try:
                storage.delete(thumbnail_key)
            except StorageError:
                pass
        if original_saved:
            try:
                storage.delete(object_key)
            except StorageError:
                pass
        raise


def delete_image_record(db: Session, storage: StorageBackend, image: Image) -> None:
    """Delete binaries first, then metadata. Raises StorageError if binaries fail."""
    keys = [image.object_key]
    if image.thumbnail_key:
        keys.append(image.thumbnail_key)
    for key in keys:
        storage.delete(key)
    db.delete(image)
    db.commit()


def bulk_delete_images(
    db: Session, storage: StorageBackend, user: User, image_ids: Sequence[int]
) -> tuple[int, list[str]]:
    images = db.scalars(
        select(Image).where(Image.user_id == user.id, Image.id.in_(list(image_ids)))
    ).all()
    deleted = 0
    errors: list[str] = []
    for image in images:
        try:
            delete_image_record(db, storage, image)
            deleted += 1
        except StorageError:
            db.rollback()
            errors.append(f"Could not delete image #{image.id} from storage.")
    return deleted, errors


def rename_image(image: Image, new_name: str) -> None:
    safe_name = sanitize_filename(new_name, fallback="untitled")
    stem = safe_name.rsplit(".", 1)[0]
    image.original_filename = f"{stem[:180]}.{image.extension}"
