"""Album CRUD, membership and ownership tests."""
from __future__ import annotations

from tests.conftest import auth_headers, register_user, upload_image


def _create_album(client, headers, name="Summer", description="Warm days"):
    response = client.post(
        "/api/albums", headers=headers, json={"name": name, "description": description}
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_album_crud(client, auth):
    headers = auth["headers"]
    album = _create_album(client, headers)
    assert album["name"] == "Summer"
    assert album["image_count"] == 0
    assert album["cover_url"] is None

    duplicate = client.post("/api/albums", headers=headers, json={"name": "Summer"})
    assert duplicate.status_code == 409

    renamed = client.patch(
        f"/api/albums/{album['id']}",
        headers=headers,
        json={"name": "Summer Days", "description": "Updated"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Summer Days"

    listing = client.get("/api/albums", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    deleted = client.delete(f"/api/albums/{album['id']}", headers=headers)
    assert deleted.status_code == 200
    assert client.get(f"/api/albums/{album['id']}", headers=headers).status_code == 404


def test_add_remove_images_and_cover(client, auth):
    headers = auth["headers"]
    album = _create_album(client, headers)
    first = upload_image(client, headers, filename="first.png").json()
    second = upload_image(client, headers, filename="second.png").json()

    added = client.post(
        f"/api/albums/{album['id']}/images",
        headers=headers,
        json={"image_ids": [first["id"], second["id"]]},
    )
    assert added.status_code == 200, added.text
    body = added.json()
    assert body["image_count"] == 2
    assert body["cover_url"]
    assert {image["id"] for image in body["images"]} == {first["id"], second["id"]}

    # adding again is idempotent
    again = client.post(
        f"/api/albums/{album['id']}/images",
        headers=headers,
        json={"image_ids": [first["id"]]},
    )
    assert again.json()["image_count"] == 2

    filtered = client.get(f"/api/images?album_id={album['id']}", headers=headers).json()
    assert filtered["total"] == 2

    album_image = body["images"][0]
    removed = client.delete(
        f"/api/albums/{album['id']}/images/{album_image['id']}", headers=headers
    )
    assert removed.status_code == 200
    detail = client.get(f"/api/albums/{album['id']}", headers=headers).json()
    assert detail["image_count"] == 1

    # image remains in the gallery after leaving an album
    assert client.get("/api/images", headers=headers).json()["total"] == 2


def test_album_delete_keeps_images(client, auth):
    headers = auth["headers"]
    album = _create_album(client, headers)
    image = upload_image(client, headers).json()
    client.post(
        f"/api/albums/{album['id']}/images", headers=headers, json={"image_ids": [image["id"]]}
    )
    client.delete(f"/api/albums/{album['id']}", headers=headers)
    assert client.get(f"/api/images/{image['id']}", headers=headers).status_code == 200


def test_album_ownership_isolation(client):
    owner = register_user(client, email="albumowner@example.com")
    stranger = register_user(client, email="albumstranger@example.com")
    owner_headers = auth_headers(owner["access_token"])
    stranger_headers = auth_headers(stranger["access_token"])

    album = _create_album(client, owner_headers, name="Private")
    image = upload_image(client, owner_headers).json()

    assert client.get(f"/api/albums/{album['id']}", headers=stranger_headers).status_code == 404
    assert client.patch(
        f"/api/albums/{album['id']}", headers=stranger_headers, json={"name": "Stolen"}
    ).status_code == 404
    assert client.delete(f"/api/albums/{album['id']}", headers=stranger_headers).status_code == 404
    assert client.post(
        f"/api/albums/{album['id']}/images",
        headers=stranger_headers,
        json={"image_ids": [image["id"]]},
    ).status_code == 404
    assert client.get("/api/albums", headers=stranger_headers).json() == []


def test_cannot_add_another_users_image(client):
    owner = register_user(client, email="imgowner@example.com")
    stranger = register_user(client, email="imgstranger@example.com")
    owner_headers = auth_headers(owner["access_token"])
    stranger_headers = auth_headers(stranger["access_token"])
    image = upload_image(client, owner_headers).json()
    album = _create_album(client, stranger_headers, name="Borrowed")

    response = client.post(
        f"/api/albums/{album['id']}/images",
        headers=stranger_headers,
        json={"image_ids": [image["id"]]},
    )
    assert response.status_code == 404
