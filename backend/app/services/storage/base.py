"""Storage abstraction shared by the local and Amazon S3 backends."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from typing import Any


class StorageError(RuntimeError):
    """Raised when an object store operation fails."""

    status_code = 503


class StorageObjectNotFound(StorageError):
    status_code = 404


@dataclass
class StorageHealth:
    backend: str
    provider: str
    configured: bool
    reachable: bool | None
    detail: str
    latency_ms: int | None = None
    bucket: str | None = None
    region: str | None = None
    extras: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class StorageBackend(ABC):
    """Interface implemented by LocalStorage and S3Storage."""

    name: str
    provider: str

    @abstractmethod
    def save(self, key: str, data: bytes, content_type: str) -> None: ...

    @abstractmethod
    def read(self, key: str) -> bytes: ...

    @abstractmethod
    def delete(self, key: str) -> None: ...

    @abstractmethod
    def exists(self, key: str) -> bool: ...

    @abstractmethod
    def url(self, key: str, ttl_seconds: int) -> str: ...

    @abstractmethod
    def health(self) -> StorageHealth: ...

    @abstractmethod
    def describe(self) -> dict[str, Any]: ...
