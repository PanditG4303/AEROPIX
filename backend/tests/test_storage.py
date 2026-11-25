"""Storage layer tests, including mocked Amazon S3 via moto."""
from __future__ import annotations

import io
import time

import boto3
import pytest
from moto import mock_aws
from PIL import Image

from app.config import Settings, settings
from app.services.storage import LocalStorage, S3Storage, StorageObjectNotFound, get_storage
from app.services.storage import get_storage as storage_dependency
from tests.conftest import auth_headers, make_image_bytes, register_user


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (32, 24), (40, 90, 180)).save(buffer, format="PNG")
    return buffer.getvalue()


def _s3_settings(bucket: str = "aeropix-test-bucket", prefix: str = "") -> Settings:
    return Settings(
        environment="test",
        aws_bucket_name=bucket,
        aws_region="us-east-1",
        aws_access_key_id="testing",
        aws_secret_access_key="testing",
        s3_key_prefix=prefix,
        s3_use_sse=True,
    )


@pytest.fixture()
def s3_context(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    with mock_aws():
        client = boto3.client("s3", region_name="us-east-1")
        client.create_bucket(Bucket="aeropix-test-bucket")
        yield client


def test_s3_storage_roundtrip(s3_context):
    client = s3_context
    storage = S3Storage(_s3_settings())
    key = "users/7/images/abc123.png"
    payload = _png_bytes()

    storage.save(key, payload, "image/png")
    assert storage.exists(key)
    assert storage.read(key) == payload

    head = client.head_object(Bucket="aeropix-test-bucket", Key=key)
    assert head["ContentType"] == "image/png"
    assert head["ServerSideEncryption"] == "AES256"
    assert head["CacheControl"].startswith("private")

    url = storage.url(key, 600)
    assert "X-Amz-Signature=" in url
    assert "aeropix-test-bucket" in url
    assert "X-Amz-Expires=600" in url

    storage.delete(key)
    assert not storage.exists(key)
    with pytest.raises(StorageObjectNotFound):
        storage.read(key)


def test_s3_key_prefix_is_applied(s3_context):
    client = s3_context
    storage = S3Storage(_s3_settings(prefix="production/aeropix"))
    storage.save("users/1/images/one.png", _png_bytes(), "image/png")
    keys = [item["Key"] for item in client.list_objects_v2(Bucket="aeropix-test-bucket")["Contents"]]
    assert keys == ["production/aeropix/users/1/images/one.png"]
    assert storage.exists("users/1/images/one.png")
    assert "production/aeropix" in storage.url("users/1/images/one.png", 60)


def test_s3_health_and_description(s3_context):
    storage = S3Storage(_s3_settings())
    health = storage.health()
    assert health.configured is True
    assert health.reachable is True
    assert health.provider == "Amazon S3"
    description = storage.describe()
    assert description["bucket"] == "aeropix-test-bucket"
    assert description["private"] is True
    assert "secret" not in str(description).lower()

    missing = S3Storage(_s3_settings(bucket="bucket-that-does-not-exist"))
    health = missing.health()
    assert health.reachable is False
    assert health.detail


def test_storage_backend_switching(monkeypatch):
    monkeypatch.setattr(settings, "storage_backend", "local")
    local = get_storage()
    assert isinstance(local, LocalStorage)
    assert local.name == "local"

    monkeypatch.setattr(settings, "storage_backend", "s3")
    monkeypatch.setattr(settings, "aws_bucket_name", "aeropix-switch-test")
    remote = get_storage()
    assert isinstance(remote, S3Storage)
    assert remote.name == "s3"
    assert remote.bucket == "aeropix-switch-test"


def test_local_signed_urls_expire_and_reject_tampering(tmp_path):
    storage = LocalStorage(tmp_path, "a" * 40, ttl_seconds=60)
    storage.save("users/1/images/a.png", _png_bytes(), "image/png")
    url = storage.url("users/1/images/a.png", 60)
    from urllib.parse import parse_qs, urlparse

    query = parse_qs(urlparse(url).query)
    key = "users/1/images/a.png"
    assert storage.verify_signed_url(key, query["expires"][0], query["sig"][0])
    assert not storage.verify_signed_url(key, query["expires"][0], "bad-signature")
    assert not storage.verify_signed_url(key, str(int(time.time()) - 10), query["sig"][0])
    with pytest.raises(Exception):
        storage.read("../outside.png")


def test_end_to_end_upload_to_mocked_s3(client, s3_context, monkeypatch):
    """Exercise the API upload path with S3 as the active storage backend."""
    s3_storage = S3Storage(_s3_settings())
    app_dependency = storage_dependency
    from app.main import app

    app.dependency_overrides[app_dependency] = lambda: s3_storage
    try:
        data = register_user(client, email="s3-user@example.com")
        headers = auth_headers(data["access_token"])
        response = client.post(
            "/api/images",
            headers=headers,
            files={"file": ("cloud.png", _png_bytes(), "image/png")},
        )
        assert response.status_code == 201, response.text
        image = response.json()
        assert image["storage_backend"] == "s3"
        assert "X-Amz-Signature=" in image["url"]
        assert "X-Amz-Signature=" in image["thumbnail_url"]

        objects = s3_context.list_objects_v2(Bucket="aeropix-test-bucket")["Contents"]
        assert len(objects) == 2  # original + thumbnail
        keys = {item["Key"] for item in objects}
        assert image["object_key"] in keys
        assert any("/thumbnails/" in key for key in keys)

        deleted = client.delete(f"/api/images/{image['id']}", headers=headers)
        assert deleted.status_code == 200
        listing = s3_context.list_objects_v2(Bucket="aeropix-test-bucket")
        assert listing.get("KeyCount", 0) == 0
    finally:
        app.dependency_overrides.clear()

