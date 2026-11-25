"""Pytest fixtures: isolated SQLite database + local media directory."""
from __future__ import annotations

import io
import os
import tempfile
import uuid
from pathlib import Path

import pytest
from PIL import Image

# Environment must be configured before importing the application.
TEST_ROOT = Path(tempfile.mkdtemp(prefix="aeropix-tests-"))
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DEBUG": "false",
        "SECRET_KEY": "test-secret-key-that-is-definitely-long-enough-123456",
        "DATABASE_URL": f"sqlite:///{(TEST_ROOT / 'test.db').as_posix()}",
        "STORAGE_BACKEND": "local",
        "LOCAL_STORAGE_PATH": str(TEST_ROOT / "media"),
        "SEED_DEMO_DATA": "false",
        "MAX_UPLOAD_MB": "15",
        "STORAGE_QUOTA_MB": "5120",
        "FRONTEND_DIST": str(TEST_ROOT / "no-frontend-build"),
        "ALLOWED_ORIGINS": "http://localhost:5173",
    }
)

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.services.auth_service import verify_password  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


def make_image_bytes(
    width: int = 64,
    height: int = 48,
    fmt: str = "PNG",
    color: tuple[int, int, int] = (90, 90, 210),
    noise: bool = False,
) -> bytes:
    if noise:
        image = Image.effect_noise((width, height), 120).convert("RGB")
    else:
        image = Image.new("RGB", (width, height), color)
    buffer = io.BytesIO()
    image.save(buffer, format=fmt)
    return buffer.getvalue()


def register_user(
    client: TestClient,
    *,
    name: str = "Test User",
    email: str | None = None,
    password: str = "TestPass123!",
) -> dict:
    email = email or f"user-{uuid.uuid4().hex[:10]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    payload["email"] = email
    payload["password"] = password
    return payload


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def auth(client):
    data = register_user(client)
    return {"headers": auth_headers(data["access_token"]), "user": data["user"], "token": data["access_token"]}


def upload_image(
    client: TestClient,
    headers: dict[str, str],
    *,
    filename: str = "sample.png",
    content: bytes | None = None,
    mime: str = "image/png",
    album_id: int | None = None,
):
    data = {"album_id": str(album_id)} if album_id is not None else None
    return client.post(
        "/api/images",
        headers=headers,
        files={"file": (filename, content or make_image_bytes(), mime)},
        data=data,
    )


@pytest.fixture(scope="session", autouse=True)
def _report_environment():
    print(f"\nTest database: {settings.database_url}")
    print(f"Test storage: {settings.local_storage_path}")
    yield
