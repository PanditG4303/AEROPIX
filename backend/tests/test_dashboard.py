"""Dashboard statistics must reflect real database values."""
from __future__ import annotations

from tests.conftest import auth_headers, make_image_bytes, register_user, upload_image


def test_dashboard_statistics(client, auth):
    headers = auth["headers"]
    first = upload_image(client, headers, filename="one.png").json()
    second = upload_image(
        client,
        headers,
        filename="two.jpg",
        content=make_image_bytes(fmt="JPEG", color=(120, 180, 90)),
        mime="image/jpeg",
    ).json()
    third = upload_image(client, headers, filename="three.png").json()

    client.patch(f"/api/images/{first['id']}", headers=headers, json={"is_favorite": True})
    album = client.post(
        "/api/albums", headers=headers, json={"name": "Trip", "description": "Test album"}
    ).json()
    client.post(
        f"/api/albums/{album['id']}/images", headers=headers, json={"image_ids": [first["id"]]}
    )

    response = client.get("/api/dashboard", headers=headers)
    assert response.status_code == 200, response.text
    stats = response.json()

    assert stats["total_images"] == 3
    assert stats["total_albums"] == 1
    assert stats["total_favorites"] == 1
    assert stats["storage_used_bytes"] == first["size_bytes"] + second["size_bytes"] + third["size_bytes"]
    assert stats["storage_quota_bytes"] == 5120 * 1024 * 1024
    assert 0 <= stats["storage_used_percent"] <= 100
    assert len(stats["activity"]) == 14
    assert stats["activity"][-1]["uploads"] == 3
    assert len(stats["recent_uploads"]) == 3
    assert {item["type"] for item in stats["storage_by_type"]} == {"PNG", "JPG"}
    assert len(stats["recent_albums"]) == 1
    assert stats["recent_albums"][0]["image_count"] == 1
    assert stats["largest_image_bytes"] > 0


def test_dashboard_is_user_scoped(client):
    owner = register_user(client, email="dash-owner@example.com")
    stranger = register_user(client, email="dash-stranger@example.com")
    owner_headers = auth_headers(owner["access_token"])
    stranger_headers = auth_headers(stranger["access_token"])
    upload_image(client, owner_headers)

    owner_stats = client.get("/api/dashboard", headers=owner_headers).json()
    stranger_stats = client.get("/api/dashboard", headers=stranger_headers).json()
    assert owner_stats["total_images"] == 1
    assert stranger_stats["total_images"] == 0
    assert stranger_stats["storage_used_bytes"] == 0


def test_storage_status_endpoint(client, auth):
    response = client.get("/api/storage/status", headers=auth["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["backend"] == "local"
    assert body["private"] is True
    assert body["configured"] is True
    assert body["reachable"] is True
    assert body["max_upload_mb"] == 15
    assert "secret" not in str(body).lower()
    assert "aws_access" not in str(body).lower()
