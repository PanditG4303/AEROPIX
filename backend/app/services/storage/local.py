"""Local filesystem storage backend (development mode, no AWS required).

Files are stored under LOCAL_STORAGE_PATH using the same logical keys that S3
mode would use. Viewing is protected by short-lived HMAC-signed URLs, which
mirrors the presigned-URL behaviour of Amazon S3.
"""
from __future__ import annotations

import hashlib
import hmac
import mimetypes
import os
import tempfile
import time
from pathlib import Path
from urllib.parse import quote, urlencode

from .base import StorageBackend, StorageError, StorageHealth, StorageObjectNotFound


class LocalStorage(StorageBackend):
    name = "local"
    provider = "Local disk"

    def __init__(self, root: str | Path, secret_key: str, ttl_seconds: int = 900) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.secret_key = secret_key.encode("utf-8")
        self.default_ttl = ttl_seconds

    # --- key safety --------------------------------------------------------
    def _path_for(self, key: str) -> Path:
        if not key or key.startswith("/") or ".." in Path(key).parts:
            raise StorageError("Invalid storage key.")
        candidate = (self.root / key).resolve()
        if self.root not in candidate.parents and candidate != self.root:
            raise StorageError("Invalid storage key.")
        return candidate

    # --- storage interface -------------------------------------------------
    def save(self, key: str, data: bytes, content_type: str) -> None:
        path = self._path_for(key)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            fd, temp_name = tempfile.mkstemp(dir=path.parent, prefix=".aeropix-", suffix=".tmp")
            try:
                with os.fdopen(fd, "wb") as handle:
                    handle.write(data)
                    handle.flush()
                    os.fsync(handle.fileno())
                os.replace(temp_name, path)
            finally:
                if os.path.exists(temp_name):
                    os.unlink(temp_name)
        except OSError as exc:
            raise StorageError("Could not write the file to local storage.") from exc

    def read(self, key: str) -> bytes:
        path = self._path_for(key)
        try:
            return path.read_bytes()
        except FileNotFoundError as exc:
            raise StorageObjectNotFound("The stored object could not be found.") from exc
        except OSError as exc:
            raise StorageError("Could not read the stored object.") from exc

    def delete(self, key: str) -> None:
        path = self._path_for(key)
        try:
            path.unlink(missing_ok=True)
        except OSError as exc:
            raise StorageError("Could not delete the stored object.") from exc

    def exists(self, key: str) -> bool:
        try:
            return self._path_for(key).is_file()
        except StorageError:
            return False

    # --- signed URLs -------------------------------------------------------
    def _sign(self, key: str, expires: int) -> str:
        message = f"{key}:{expires}".encode()
        return hmac.new(self.secret_key, message, hashlib.sha256).hexdigest()

    def url(self, key: str, ttl_seconds: int | None = None) -> str:
        ttl = ttl_seconds or self.default_ttl
        expires = int(time.time()) + int(ttl)
        signature = self._sign(key, expires)
        query = urlencode({"expires": expires, "sig": signature})
        return f"/api/media/{quote(key, safe='/')}?{query}"

    def verify_signed_url(self, key: str, expires: str | None, signature: str | None) -> bool:
        if not expires or not signature:
            return False
        try:
            expires_at = int(expires)
        except (TypeError, ValueError):
            return False
        if expires_at < int(time.time()):
            return False
        expected = self._sign(key, expires_at)
        return hmac.compare_digest(expected, signature)

    def content_type_for(self, key: str) -> str:
        guessed, _ = mimetypes.guess_type(key)
        return guessed or "application/octet-stream"

    def path_for_signed_request(self, key: str) -> Path:
        return self._path_for(key)

    # --- diagnostics -------------------------------------------------------
    def health(self) -> StorageHealth:
        started = time.perf_counter()
        try:
            self.root.mkdir(parents=True, exist_ok=True)
            probe = self.root / ".aeropix-write-test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            reachable, detail = True, "Local storage directory is writable."
        except OSError as exc:
            reachable, detail = False, f"Local storage is unavailable: {exc}"
        latency = int((time.perf_counter() - started) * 1000)
        return StorageHealth(
            backend=self.name,
            provider=self.provider,
            configured=True,
            reachable=reachable,
            detail=detail,
            latency_ms=latency,
            extras={"path": str(self.root)},
        )

    def describe(self) -> dict:
        return {
            "backend": self.name,
            "provider": self.provider,
            "mode": "Development (no AWS account required)",
            "bucket": None,
            "region": None,
            "encryption": "Filesystem permissions",
            "presign_ttl_seconds": self.default_ttl,
            "private": True,
        }
