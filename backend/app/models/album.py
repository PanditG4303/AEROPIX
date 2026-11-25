"""Album and album-image membership models."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from ..utils.time import utcnow


class Album(Base):
    __tablename__ = "albums"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_albums_user_name"),
        Index("ix_albums_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="albums")  # noqa: F821
    image_links: Mapped[list["AlbumImage"]] = relationship(
        back_populates="album", cascade="all, delete-orphan"
    )

    @property
    def images(self) -> list["Image"]:  # noqa: F821
        return [link.image for link in self.image_links if link.image is not None]


class AlbumImage(Base):
    """Explicit join table so membership timestamps can be stored."""

    __tablename__ = "album_images"

    album_id: Mapped[int] = mapped_column(
        ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True
    )
    image_id: Mapped[int] = mapped_column(
        ForeignKey("images.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    added_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    album: Mapped["Album"] = relationship(back_populates="image_links")
    image: Mapped["Image"] = relationship(back_populates="album_links")  # noqa: F821
