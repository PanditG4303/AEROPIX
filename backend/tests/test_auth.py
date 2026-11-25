"""Health, registration, login and password security tests."""
from __future__ import annotations

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.services.auth_service import verify_password
from tests.conftest import auth_headers, register_user


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["storage_backend"] == "local"
    assert body["database"] == "connected"
    assert body["app"] == "AEROPIX"


def test_registration_hashes_password(client):
    data = register_user(client, email="hash-check@example.com")
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "hash-check@example.com"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "hash-check@example.com"))
        assert user is not None
        assert user.password_hash != "TestPass123!"
        assert user.password_hash.startswith("$argon2")
        assert verify_password("TestPass123!", user.password_hash)
        assert not verify_password("WrongPass123!", user.password_hash)
    finally:
        db.close()


def test_registration_rejects_duplicate_email(client):
    register_user(client, email="duplicate@example.com")
    response = client.post(
        "/api/auth/register",
        json={"name": "Another", "email": "DUPLICATE@example.com", "password": "AnotherPass123"},
    )
    assert response.status_code == 409


def test_registration_validates_password_strength(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Weak", "email": "weak@example.com", "password": "password"},
    )
    assert response.status_code == 422


def test_login_success_and_failure(client):
    register_user(client, email="login@example.com", password="LoginPass123!")
    success = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "LoginPass123!"},
    )
    assert success.status_code == 200
    assert success.json()["access_token"]

    bad_password = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "Incorrect123"},
    )
    assert bad_password.status_code == 401
    assert "Incorrect email or password" in bad_password.json()["detail"]

    unknown = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "Whatever123"},
    )
    assert unknown.status_code == 401


def test_protected_endpoint_requires_token(client):
    assert client.get("/api/images").status_code == 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/images", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_profile_update_and_logout(client):
    data = register_user(client, name="Original Name")
    headers = auth_headers(data["access_token"])

    updated = client.patch(
        "/api/auth/me", headers=headers, json={"name": "Updated Name", "theme": "dark"}
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated Name"
    assert updated.json()["theme"] == "dark"

    logout = client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 200
    assert logout.json()["message"] == "Signed out."


def test_change_password(client):
    data = register_user(client, email="change@example.com", password="OldPass123!")
    headers = auth_headers(data["access_token"])

    wrong = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "WrongPass123", "new_password": "NewPass123!"},
    )
    assert wrong.status_code == 400

    changed = client.post(
        "/api/auth/change-password",
        headers=headers,
        json={"current_password": "OldPass123!", "new_password": "NewPass123!"},
    )
    assert changed.status_code == 200

    old_login = client.post(
        "/api/auth/login", json={"email": "change@example.com", "password": "OldPass123!"}
    )
    assert old_login.status_code == 401
    new_login = client.post(
        "/api/auth/login", json={"email": "change@example.com", "password": "NewPass123!"}
    )
    assert new_login.status_code == 200
