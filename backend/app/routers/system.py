"""Health, storage status and signed local media delivery."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies.authentication import get_current_user
from ..models import User
from ..schemas.common import HealthOut, StorageStatusOut
from ..services.storage import LocalStorage, StorageBackend, get_storage, storage_status

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    database_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "unavailable"
    return HealthOut(
        status="ok" if database_status == "connected" else "degraded",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        storage_backend=settings.storage_backend,
        database=database_status,
        time=datetime.now(timezone.utc),
        demo_enabled=settings.seed_demo_data,
    )


@router.get("/storage/status", response_model=StorageStatusOut)
def get_storage_status(
    current_user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
) -> StorageStatusOut:
    return StorageStatusOut(**storage_status(storage))


@router.get("/media/{key:path}", include_in_schema=False)
def serve_local_media(
    key: str,
    expires: str | None = Query(default=None),
    sig: str | None = Query(default=None),
    storage: StorageBackend = Depends(get_storage),
) -> FileResponse:
    """Serve local-mode objects through time-limited signed URLs.

    In S3 mode the browser receives a native presigned S3 URL instead, so this
    endpoint is only used by the local storage backend.
    """
    if not isinstance(storage, LocalStorage):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    if not storage.verify_signed_url(key, expires, sig):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This media link is invalid or has expired. Refresh the gallery.",
        )
    try:
        path = storage.path_for_signed_request(key)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.") from exc
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found.")
    return FileResponse(
        path,
        media_type=storage.content_type_for(key),
        headers={
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    )
