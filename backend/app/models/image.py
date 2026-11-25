"""Image metadata model.

Only metadata lives in SQLite. The binary image is stored by the active
storage backend (local disk for development, Amazon S3 in cloud mode).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from ..utils.time import utcnow


class Image(Base):
    __tablename__ = "images"
    __table_args__ = (
        Index("ix_images_user_created", "user_id", "created_at"),
        Index("ix_images_user_favorite", "user_id", "is_favorite"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    object_key: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    thumbnail_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    extension: Mapped[str] = mapped_column(String(10), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )

    user: Mapped["User"] = relationship(back_populates="images")  # noqa: F821
    album_links: Mapped[list["AlbumImage"]] = relationship(  # noqa: F821
        back_populates="image", cascade="all, delete-orphan"
    )

    @property
    def albums(self) -> list["Album"]:  # noqa: F821
        return [link.album for link in self.album_links if link.album is not None]
