"""Seed the AEROPIX demo account with original artwork.

Usage (from the backend directory or with backend on PYTHONPATH):
    python -m app.seed
    python -m app.seed --reset          # removes demo metadata + stored files, then reseeds
    python -m app.seed --allow-s3       # explicitly allow uploading demo images to S3

This is optional. Normal user registration works without seeding.
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import timedelta
from pathlib import Path

from sqlalchemy import select

from .config import BACKEND_DIR, settings
from .database import SessionLocal, init_db
from .demo_art import ALBUM_NOTES, DEMO_ART, generate_all
from .models import Album, Image, User
from .services import image_service
from .services.auth_service import hash_password
from .services.storage import get_storage
from .utils.time import utcnow

logger = logging.getLogger("aeropix.seed")
ART_DIR = BACKEND_DIR / "demo_assets"


def _purge_demo_data(db, user: User, storage) -> None:
    images = db.scalars(select(Image).where(Image.user_id == user.id)).all()
    for image in images:
        try:
            image_service.delete_image_record(db, storage, image)
        except Exception as exc:  # keep seeding even if an old object is missing
            logger.warning("Could not delete demo image #%s: %s", image.id, exc)
            db.delete(image)
            db.commit()
    albums = db.scalars(select(Album).where(Album.user_id == user.id)).all()
    for album in albums:
        db.delete(album)
    db.commit()


def seed(reset: bool = False) -> None:
    init_db()
    db = SessionLocal()
    storage = get_storage()
    try:
        user = db.scalar(select(User).where(User.email == settings.demo_email.lower()))
        if user and reset:
            logger.info("Resetting demo account data…")
            _purge_demo_data(db, user, storage)
        if user is None:
            user = User(
                name="Aeropix Demo",
                email=settings.demo_email.lower(),
                password_hash=hash_password(settings.demo_password),
                theme="system",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info("Created demo user %s", user.email)
        elif db.scalar(select(Image.id).where(Image.user_id == user.id).limit(1)):
            print("Demo data already exists. Use --reset to recreate it.")
            print(f"Demo login: {settings.demo_email} / {settings.demo_password}")
            return

        generated = generate_all(ART_DIR, only_missing=True)
        if generated:
            logger.info("Generated %d demo artworks in %s", len(generated), ART_DIR)

        albums: dict[str, Album] = {}
        for title, note in ALBUM_NOTES.items():
            album = db.scalar(
                select(Album).where(Album.user_id == user.id, Album.name == title)
            )
            if album is None:
                album = Album(user_id=user.id, name=title, description=note)
                db.add(album)
                db.commit()
                db.refresh(album)
            albums[title] = album

        now = utcnow()
        seeded = 0
        for index, spec in enumerate(DEMO_ART):
            path = ART_DIR / spec.filename
            if not path.is_file():
                logger.warning("Missing demo artwork: %s", path)
                continue
            album = albums.get(spec.album)
            image = image_service.create_image(
                db,
                user,
                storage,
                raw=path.read_bytes(),
                filename=f"{spec.title.lower().replace(' ', '-')}.jpg",
                content_type="image/jpeg",
                album_id=album.id if album else None,
                is_demo=True,
                created_at=now - timedelta(days=spec.days_ago, hours=index * 2 + 1),
            )
            if spec.favorite:
                image.is_favorite = True
                db.add(image)
                db.commit()
            seeded += 1

        print()
        print("AEROPIX demo library ready.")
        print(f"  Images : {seeded}")
        print(f"  Albums : {len(albums)}")
        print(f"  Storage: {settings.storage_backend}")
        print(f"  Login  : {settings.demo_email} / {settings.demo_password}")
        print()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed AEROPIX demo content")
    parser.add_argument("--reset", action="store_true", help="Delete existing demo data and reseed")
    parser.add_argument(
        "--allow-s3",
        action="store_true",
        help="Explicitly permit demo uploads when STORAGE_BACKEND=s3",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    ART_DIR.mkdir(parents=True, exist_ok=True)
    generate_all(ART_DIR, only_missing=True)
    if settings.storage_backend == "s3" and not args.allow_s3:
        print(
            "Refusing to seed demo images into Amazon S3 without --allow-s3.\n"
            "Seeding uploads objects and may incur a small AWS charge.",
            file=sys.stderr,
        )
        sys.exit(1)
    seed(reset=args.reset)


if __name__ == "__main__":
    main()
