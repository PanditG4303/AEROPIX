"""Image library, upload and deletion routes."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies.authentication import get_current_user
from ..models import AlbumImage, Image, User
from ..schemas.image import BulkDeleteRequest, ImageListOut, ImageOut, ImageUpdateRequest
from ..schemas.user import MessageResponse
from ..services import image_service
from ..services.storage import StorageBackend, StorageError
from ..services.storage import get_storage
from ..utils.validators import ImageValidationError

router = APIRouter(prefix="/images", tags=["Images"])

SortOption = Literal["newest", "oldest", "name_asc", "name_desc", "size_desc", "size_asc"]


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _get_image_or_404(db: Session, user: User, image_id: int) -> Image:
    image = image_service.get_owned_image(db, user, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")
    return image


@router.get("", response_model=ImageListOut)
def list_images(
    search: str | None = Query(default=None, max_length=120),
    album_id: int | None = Query(default=None, ge=1),
    file_type: str | None = Query(default=None, max_length=60),
    favorite: bool | None = Query(default=None),
    sort: SortOption = Query(default="newest"),
    limit: int = Query(default=60, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> ImageListOut:
    if album_id is not None:
        if image_service.get_owned_album(db, current_user, album_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Album not found.")

    conditions = [Image.user_id == current_user.id]
    if search and search.strip():
        conditions.append(
            Image.original_filename.ilike(f"%{_escape_like(search.strip())}%", escape="\\")
        )
    if file_type:
        requested = {
            "jpg" if item.lower().strip() in {"jpeg", "jpg"} else item.lower().strip().lstrip(".")
            for item in file_type.split(",")
            if item.strip()
        }
        invalid = requested - settings.allowlisted_extensions
        if invalid or not requested:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unsupported file type filter: {', '.join(sorted(invalid)) or 'empty'}",
            )
        conditions.append(Image.extension.in_(requested))
    if favorite is not None:
        conditions.append(Image.is_favorite.is_(favorite))

    order_by = {
        "newest": Image.created_at.desc(),
        "oldest": Image.created_at.asc(),
        "name_asc": func.lower(Image.original_filename).asc(),
        "name_desc": func.lower(Image.original_filename).desc(),
        "size_desc": Image.size_bytes.desc(),
        "size_asc": Image.size_bytes.asc(),
    }[sort]

    count_stmt = select(func.count(Image.id)).where(*conditions)
    query = (
        select(Image)
        .where(*conditions)
        .options(
            image_service.selectinload_albums(),
        )
    )
    if album_id is not None:
        count_stmt = count_stmt.join(AlbumImage, AlbumImage.image_id == Image.id).where(
            AlbumImage.album_id == album_id
        )
        query = query.join(AlbumImage, AlbumImage.image_id == Image.id).where(
            AlbumImage.album_id == album_id
        )
    total = int(db.scalar(count_stmt) or 0)
    images = db.scalars(query.order_by(order_by, Image.id.desc()).offset(offset).limit(limit)).all()
    return ImageListOut(
        items=[image_service.serialize_image(image, storage) for image in images],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ImageOut, status_code=status.HTTP_201_CREATED)
def upload_image(
    file: UploadFile = File(..., description="JPG, PNG, WEBP or GIF image"),
    album_id: int | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> ImageOut:
    if album_id is not None and image_service.get_owned_album(db, current_user, album_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Album not found.")
    try:
        raw = file.file.read(settings.max_upload_bytes + 1)
    finally:
        file.file.close()
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. Maximum upload size is {settings.max_upload_mb} MB.",
        )
    try:
        image = image_service.create_image(
            db,
            current_user,
            storage,
            raw=raw,
            filename=file.filename,
            content_type=file.content_type,
            album_id=album_id,
        )
    except ImageValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    fresh = _get_image_or_404(db, current_user, image.id)
    return image_service.serialize_image(fresh, storage)


@router.get("/{image_id}", response_model=ImageOut)
def get_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> ImageOut:
    image = _get_image_or_404(db, current_user, image_id)
    return image_service.serialize_image(image, storage)


@router.patch("/{image_id}", response_model=ImageOut)
def update_image(
    image_id: int,
    payload: ImageUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> ImageOut:
    image = _get_image_or_404(db, current_user, image_id)
    if payload.original_filename is not None:
        image_service.rename_image(image, payload.original_filename)
    if payload.is_favorite is not None:
        image.is_favorite = payload.is_favorite
    db.add(image)
    db.commit()
    fresh = _get_image_or_404(db, current_user, image.id)
    return image_service.serialize_image(fresh, storage)


@router.delete("/{image_id}", response_model=MessageResponse)
def delete_image(
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> MessageResponse:
    image = _get_image_or_404(db, current_user, image_id)
    try:
        image_service.delete_image_record(db, storage, image)
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The file could not be removed from storage: {exc}",
        ) from exc
    return MessageResponse(message="Image deleted from the gallery and storage.")


@router.post("/bulk-delete", response_model=dict)
def bulk_delete(
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> dict:
    deleted, errors = image_service.bulk_delete_images(
        db, storage, current_user, payload.image_ids
    )
    if deleted == 0 and not errors:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching images found.")
    return {
        "message": f"{deleted} image{'s' if deleted != 1 else ''} deleted.",
        "deleted": deleted,
        "errors": errors,
    }
