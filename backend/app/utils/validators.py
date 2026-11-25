"""Image validation and filename hygiene.

Security rules:
* The original filename is never used as an object key.
* The extension must be allow-listed AND match the actual decoded image format.
* MIME type is sniffed with Pillow, not trusted from the request.
* Oversized / decompression-bomb images are rejected.
"""
from __future__ import annotations

import io
import os
import re
import unicodedata
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

# Guard against decompression bombs before Pillow loads pixel data.
Image.MAX_IMAGE_PIXELS = 50_000_000

ALLOWED_FORMATS: dict[str, tuple[str, str]] = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
    "GIF": ("gif", "image/gif"),
}
ALLOWED_MIME_TYPES = {mime for _, mime in ALLOWED_FORMATS.values()} | {"image/jpg"}
EXTENSION_ALIASES = {"jpeg": "jpg"}
SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._ ()\-]+")


class ImageValidationError(ValueError):
    """Base class for user-correctable upload errors."""

    status_code = 415


class UnsupportedImageError(ImageValidationError):
    status_code = 415


class InvalidImageError(ImageValidationError):
    status_code = 422


class ImageTooLargeError(ImageValidationError):
    status_code = 413


@dataclass(frozen=True)
class ValidatedImage:
    width: int
    height: int
    extension: str
    mime_type: str
    normalized_filename: str
    frames: int


def sanitize_filename(filename: str | None, fallback: str = "untitled") -> str:
    """Keep a human-readable display name; strip paths and control chars."""
    raw = os.path.basename((filename or "").replace("\\", "/")).strip()
    normalized = unicodedata.normalize("NFKC", raw)
    cleaned = SAFE_FILENAME_RE.sub("_", normalized).strip(" .")
    if not cleaned:
        cleaned = fallback
    if "." not in cleaned:
        cleaned = f"{cleaned}.jpg"
    stem, dot, ext = cleaned.rpartition(".")
    stem = stem[:180].strip(" ._") or fallback
    ext = ext.lower()[:10]
    return f"{stem}{dot}{ext}" if ext else cleaned


def validate_image_bytes(
    data: bytes,
    *,
    filename: str | None,
    claimed_mime: str | None,
    max_bytes: int,
    allowed_extensions: set[str],
    max_pixels: int = 50_000_000,
) -> ValidatedImage:
    if not data:
        raise InvalidImageError("The uploaded file is empty.")
    if len(data) > max_bytes:
        limit_mb = max_bytes / (1024 * 1024)
        raise ImageTooLargeError(f"File is too large. Maximum upload size is {limit_mb:.0f} MB.")
    if claimed_mime and claimed_mime.lower() not in ALLOWED_MIME_TYPES and claimed_mime != "application/octet-stream":
        raise UnsupportedImageError("Only JPG, PNG, WEBP and GIF images are supported.")

    display_name = sanitize_filename(filename)
    extension = display_name.rsplit(".", 1)[-1].lower()
    extension = EXTENSION_ALIASES.get(extension, extension)
    allowed = {EXTENSION_ALIASES.get(ext.lower(), ext.lower()) for ext in allowed_extensions}
    if extension not in allowed:
        pretty = ", ".join(sorted(ext.upper() for ext in allowed))
        raise UnsupportedImageError(f"Unsupported file extension. Allowed types: {pretty}.")

    try:
        with Image.open(io.BytesIO(data)) as probe:
            detected_format = probe.format
            width, height = probe.size
            frames = getattr(probe, "n_frames", 1)
            probe.verify()
        if detected_format not in ALLOWED_FORMATS:
            raise UnsupportedImageError("The file is not a supported image format.")
        if width <= 0 or height <= 0 or width * height > max_pixels:
            raise InvalidImageError("Image dimensions are outside the allowed range.")
        canonical_ext, mime_type = ALLOWED_FORMATS[detected_format]
        if extension != canonical_ext:
            raise UnsupportedImageError(
                "File extension does not match the actual image format. "
                f"Rename the file to .{canonical_ext} and try again."
            )
    except UnsupportedImageError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        raise InvalidImageError("The file could not be decoded as a valid image.") from exc

    stem = display_name.rsplit(".", 1)[0]
    normalized_filename = f"{stem}.{canonical_ext}"
    return ValidatedImage(
        width=width,
        height=height,
        extension=canonical_ext,
        mime_type=mime_type,
        normalized_filename=normalized_filename,
        frames=frames,
    )


def make_thumbnail(data: bytes, max_edge: int = 960, quality: int = 84) -> bytes:
    """Create a stripped, sRGB JPEG thumbnail (no EXIF metadata)."""
    try:
        with Image.open(io.BytesIO(data)) as opened:
            frame = ImageOps.exif_transpose(opened)
            if frame.mode in {"RGBA", "LA", "P"}:
                rgba = frame.convert("RGBA")
                background = Image.new("RGB", rgba.size, (247, 244, 238))
                background.paste(rgba, mask=rgba.getchannel("A"))
                frame = background
            else:
                frame = frame.convert("RGB")
            frame.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            frame.save(buffer, format="JPEG", quality=quality, optimize=True, progressive=True)
            return buffer.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("The image could not be prepared for the gallery.") from exc
