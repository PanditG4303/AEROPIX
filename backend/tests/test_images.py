"""Image upload, validation, gallery, signed URLs and deletion tests."""
from __future__ import annotations

import os
from pathlib import Path

from app.config import settings
from tests.conftest import (
    auth_headers,
    make_image_bytes,
    register_user,
    upload_image,
)


def test_upload_valid_png_and_signed_media_url(client, auth):
    response = upload_image(client, auth["headers"], filename="holiday.png")
    assert response.status_code == 201, response.text
    image = response.json()
    assert image["original_filename"] == "holiday.png"
    assert image["mime_type"] == "image/png"
    assert image["extension"] == "png"
    assert image["width"] == 64
    assert image["height"] == 48
    assert image["size_bytes"] > 0
    assert image["storage_backend"] == "local"
    assert image["object_key"].startswith(f"users/{auth['user']['id']}/images/")
    assert image["url"].startswith("/api/media/")
    assert image["thumbnail_url"].startswith("/api/media/")
    assert "storage_backend" in image

    media = client.get(image["url"])
    assert media.status_code == 200
    assert media.headers["content-type"] == "image/png"
    assert media.headers["x-content-type-options"] == "nosniff"

    thumbnail = client.get(image["thumbnail_url"])
    assert thumbnail.status_code == 200
    assert thumbnail.headers["content-type"] == "image/jpeg"


def test_signed_media_url_rejects_tampering(client, auth):
    image = upload_image(client, auth["headers"]).json()
    tampered = image["url"].replace("sig=", "sig=0")
    assert client.get(tampered).status_code == 403
    assert client.get(image["url"].split("?")[0]).status_code == 403


def test_upload_rejects_invalid_file_type(client, auth):
    response = upload_image(
        client,
        auth["headers"],
        filename="notes.txt",
        content=b"this is not an image",
        mime="text/plain",
    )
    assert response.status_code == 415
    assert "supported" in response.json()["detail"].lower()


def test_upload_rejects_extension_mismatch(client, auth):
    png = make_image_bytes(fmt="PNG")
    response = client.post(
        "/api/images",
        headers=auth["headers"],
        files={"file": ("fake.jpg", png, "image/jpeg")},
    )
    assert response.status_code == 415
    assert "does not match" in response.json()["detail"].lower()


def test_upload_rejects_corrupt_image(client, auth):
    response = upload_image(
        client,
        auth["headers"],
        filename="corrupt.png",
        content=b"\x89PNG\r\n\x1a\nnot-really",
        mime="image/png",
    )
    assert response.status_code == 422


def test_upload_size_limit(client, auth, monkeypatch):
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    big = make_image_bytes(width=1600, height=1600, noise=True)
    assert len(big) > 1024 * 1024
    response = upload_image(client, auth["headers"], filename="large.png", content=big)
    assert response.status_code == 413
    assert "maximum upload size" in response.json()["detail"].lower()


def test_upload_requires_authentication(client):
    response = client.post(
        "/api/images", files={"file": ("a.png", make_image_bytes(), "image/png")}
    )
    assert response.status_code == 401


def test_gallery_search_sort_and_type_filter(client, auth):
    headers = auth["headers"]
    upload_image(client, headers, filename="zebra.png")
    upload_image(client, headers, filename="apple.png")
    upload_image(client, headers, filename="beach.jpg", content=make_image_bytes(fmt="JPEG", color=(200, 130, 90)), mime="image/jpeg")

    newest = client.get("/api/images", headers=headers).json()
    assert newest["total"] == 3
    assert newest["items"][0]["original_filename"] == "beach.jpg"

    oldest = client.get("/api/images?sort=oldest", headers=headers).json()
    assert oldest["items"][0]["original_filename"] == "zebra.png"

    by_name = client.get("/api/images?sort=name_asc", headers=headers).json()
    assert [item["original_filename"] for item in by_name["items"]] == [
        "apple.png",
        "beach.jpg",
        "zebra.png",
    ]

    search = client.get("/api/images?search=ea", headers=headers).json()
    assert [item["original_filename"] for item in search["items"]] == ["beach.jpg"]

    png_only = client.get("/api/images?file_type=png", headers=headers).json()
    assert png_only["total"] == 2
    assert all(item["extension"] == "png" for item in png_only["items"])

    invalid_filter = client.get("/api/images?file_type=exe", headers=headers)
    assert invalid_filter.status_code == 422


def test_favorite_and_rename(client, auth):
    image = upload_image(client, auth["headers"]).json()
    response = client.patch(
        f"/api/images/{image['id']}",
        headers=auth["headers"],
        json={"is_favorite": True, "original_filename": "Summer afternoon.png"},
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["is_favorite"] is True
    assert updated["original_filename"] == "Summer afternoon.png"

    favorites = client.get("/api/images?favorite=true", headers=auth["headers"]).json()
    assert favorites["total"] == 1


def test_image_detail_and_delete_removes_object(client, auth):
    image = upload_image(client, auth["headers"]).json()
    storage_path = Path(settings.local_storage_path) / image["object_key"]
    thumbnail_key = image["object_key"].replace("/images/", "/thumbnails/").rsplit(".", 1)[0] + ".jpg"
    thumbnail_path = Path(settings.local_storage_path) / thumbnail_key
    assert storage_path.is_file()
    assert thumbnail_path.is_file()

    detail = client.get(f"/api/images/{image['id']}", headers=auth["headers"])
    assert detail.status_code == 200
    assert detail.json()["id"] == image["id"]

    deleted = client.delete(f"/api/images/{image['id']}", headers=auth["headers"])
    assert deleted.status_code == 200
    assert "deleted" in deleted.json()["message"].lower()

    assert client.get(f"/api/images/{image['id']}", headers=auth["headers"]).status_code == 404
    assert not storage_path.exists()
    assert not thumbnail_path.exists()
    assert client.get("/api/images", headers=auth["headers"]).json()["total"] == 0


def test_ownership_isolation(client):
    owner = register_user(client, email="owner@example.com")
    stranger = register_user(client, email="stranger@example.com")
    owner_headers = auth_headers(owner["access_token"])
    stranger_headers = auth_headers(stranger["access_token"])

    image = upload_image(client, owner_headers).json()

    assert client.get(f"/api/images/{image['id']}", headers=stranger_headers).status_code == 404
    assert client.delete(f"/api/images/{image['id']}", headers=stranger_headers).status_code == 404
    assert client.patch(
        f"/api/images/{image['id']}", headers=stranger_headers, json={"is_favorite": True}
    ).status_code == 404
    assert client.get("/api/images", headers=stranger_headers).json()["total"] == 0
    # Original owner still has access
    assert client.get(f"/api/images/{image['id']}", headers=owner_headers).status_code == 200


def test_bulk_delete(client, auth):
    first = upload_image(client, auth["headers"]).json()
    second = upload_image(client, auth["headers"]).json()
    upload_image(client, auth["headers"])

    response = client.post(
        "/api/images/bulk-delete",
        headers=auth["headers"],
        json={"image_ids": [first["id"], second["id"]]},
    )
    assert response.status_code == 200
    assert response.json()["deleted"] == 2
    assert client.get("/api/images", headers=auth["headers"]).json()["total"] == 1
