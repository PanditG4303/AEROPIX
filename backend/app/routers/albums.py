"""Album and collection routes with strict per-user ownership checks."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.authentication import get_current_user
from ..models import Album, AlbumImage, Image, User
from ..schemas.image import (
    AlbumCreateRequest,
    AlbumDetailOut,
    AlbumImagesRequest,
    AlbumOut,
    AlbumUpdateRequest,
)
from ..schemas.user import MessageResponse
from ..services import image_service
from ..services.storage import StorageBackend, get_storage
from ..utils.time import utcnow

router = APIRouter(prefix="/albums", tags=["Albums"])

AlbumSort = Literal["recent", "name", "images"]


def _get_album_or_404(db: Session, user: User, album_id: int) -> Album:
    album = image_service.get_owned_album(db, user, album_id)
    if album is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Album not found.")
    return album


def _normalise_name(value: str) -> str:
    cleaned = " ".join(value.split())
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Album name cannot be blank."
        )
    return cleaned


@router.get("", response_model=list[AlbumOut])
def list_albums(
    sort: AlbumSort = Query(default="recent"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> list[AlbumOut]:
    albums = db.scalars(
        image_service.album_query_for_user(current_user.id).order_by(Album.created_at.desc())
    ).all()
    serialised = [image_service.serialize_album(album, storage) for album in albums]
    if sort == "name":
        serialised.sort(key=lambda album: album.name.lower())
    elif sort == "images":
        serialised.sort(key=lambda album: (album.image_count, album.created_at), reverse=True)
    return serialised


@router.post("", response_model=AlbumOut, status_code=status.HTTP_201_CREATED)
def create_album(
    payload: AlbumCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> AlbumOut:
    album = Album(
        user_id=current_user.id,
        name=_normalise_name(payload.name),
        description=(payload.description or "").strip() or None,
    )
    db.add(album)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an album with this name.",
        )
    fresh = _get_album_or_404(db, current_user, album.id)
    return image_service.serialize_album(fresh, storage)


@router.get("/{album_id}", response_model=AlbumDetailOut)
def get_album(
    album_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> AlbumDetailOut:
    album = _get_album_or_404(db, current_user, album_id)
    return image_service.serialize_album_detail(album, storage)


@router.patch("/{album_id}", response_model=AlbumOut)
def update_album(
    album_id: int,
    payload: AlbumUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> AlbumOut:
    album = _get_album_or_404(db, current_user, album_id)
    if payload.name is not None:
        album.name = _normalise_name(payload.name)
    if payload.description is not None:
        album.description = payload.description.strip() or None
    album.updated_at = utcnow()
    db.add(album)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an album with this name.",
        )
    fresh = _get_album_or_404(db, current_user, album.id)
    return image_service.serialize_album(fresh, storage)


@router.delete("/{album_id}", response_model=MessageResponse)
def delete_album(
    album_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    album = _get_album_or_404(db, current_user, album_id)
    db.delete(album)
    db.commit()
    return MessageResponse(message="Album deleted. Your images remain in the gallery.")


@router.post("/{album_id}/images", response_model=AlbumDetailOut)
def add_images(
    album_id: int,
    payload: AlbumImagesRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> AlbumDetailOut:
    album = _get_album_or_404(db, current_user, album_id)
    requested = set(payload.image_ids)
    owned = set(
        db.scalars(
            select(Image.id).where(Image.user_id == current_user.id, Image.id.in_(requested))
        ).all()
    )
    missing = requested - owned
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more selected images could not be found.",
        )
    existing = set(
        db.scalars(
            select(AlbumImage.image_id).where(
                AlbumImage.album_id == album.id, AlbumImage.image_id.in_(requested)
            )
        ).all()
    )
    for image_id in requested - existing:
        db.add(AlbumImage(album_id=album.id, image_id=image_id))
    album.updated_at = utcnow()
    db.add(album)
    db.commit()
    db.expire_all()
    fresh = _get_album_or_404(db, current_user, album.id)
    return image_service.serialize_album_detail(fresh, storage)


@router.delete("/{album_id}/images/{image_id}", response_model=MessageResponse)
def remove_image(
    album_id: int,
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    album = _get_album_or_404(db, current_user, album_id)
    link = db.get(AlbumImage, {"album_id": album.id, "image_id": image_id})
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This image is not part of the selected album.",
        )
    db.delete(link)
    album.updated_at = utcnow()
    db.add(album)
    db.commit()
    db.expire_all()
    return MessageResponse(message="Image removed from album.")
