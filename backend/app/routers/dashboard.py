"""Dashboard statistics derived entirely from the database."""
from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies.authentication import get_current_user
from ..models import Album, Image, User
from ..schemas.common import ActivityPoint, DashboardStats, TypeUsage
from ..services import image_service
from ..services.storage import StorageBackend, get_storage

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardStats)
def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> DashboardStats:
    user_filter = Image.user_id == current_user.id

    total_images = int(db.scalar(select(func.count(Image.id)).where(user_filter)) or 0)
    total_favorites = int(
        db.scalar(
            select(func.count(Image.id)).where(user_filter, Image.is_favorite.is_(True))
        )
        or 0
    )
    storage_used = image_service.user_storage_used(db, current_user.id)
    total_albums = int(
        db.scalar(select(func.count(Album.id)).where(Album.user_id == current_user.id)) or 0
    )

    recent_images = db.scalars(
        image_service.image_query_for_user(current_user.id)
        .order_by(Image.created_at.desc(), Image.id.desc())
        .limit(6)
    ).all()

    recent_album_models = db.scalars(
        image_service.album_query_for_user(current_user.id)
        .order_by(Album.created_at.desc())
        .limit(3)
    ).all()

    # --- Last 14 days of upload activity ---------------------------------
    today = datetime.now(timezone.utc).date()
    start_day = today - timedelta(days=13)
    start_dt = datetime.combine(start_day, time.min)
    rows = db.execute(
        select(func.date(Image.created_at), func.count(Image.id))
        .where(user_filter, Image.created_at >= start_dt)
        .group_by(func.date(Image.created_at))
    ).all()
    counts: dict[str, int] = {}
    for day_value, count in rows:
        key = day_value if isinstance(day_value, str) else day_value.isoformat()
        counts[key] = int(count)
    activity = [
        ActivityPoint(
            date=(start_day + timedelta(days=offset)).isoformat(),
            uploads=counts.get((start_day + timedelta(days=offset)).isoformat(), 0),
        )
        for offset in range(14)
    ]

    # --- Storage by file type --------------------------------------------
    type_rows = db.execute(
        select(Image.extension, func.count(Image.id), func.coalesce(func.sum(Image.size_bytes), 0))
        .where(user_filter)
        .group_by(Image.extension)
        .order_by(func.sum(Image.size_bytes).desc())
    ).all()
    storage_by_type = [
        TypeUsage(type=str(ext).upper(), count=int(count), bytes=int(total or 0))
        for ext, count, total in type_rows
    ]

    largest = int(
        db.scalar(select(func.coalesce(func.max(Image.size_bytes), 0)).where(user_filter)) or 0
    )
    quota = settings.storage_quota_bytes
    percent = round(min(100.0, (storage_used / quota) * 100.0), 2) if quota else 0.0

    return DashboardStats(
        total_images=total_images,
        total_albums=total_albums,
        total_favorites=total_favorites,
        storage_used_bytes=storage_used,
        storage_quota_bytes=quota,
        storage_used_percent=percent,
        recent_uploads=[image_service.serialize_image(image, storage) for image in recent_images],
        recent_albums=[
            image_service.serialize_album(album, storage) for album in recent_album_models
        ],
        activity=activity,
        storage_by_type=storage_by_type,
        largest_image_bytes=largest,
    )
