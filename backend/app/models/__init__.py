"""Model registry — imported by init_db() and tests."""
from .album import Album, AlbumImage
from .image import Image
from .user import User

__all__ = ["User", "Image", "Album", "AlbumImage"]
