"""Amazon S3 storage backend.

The bucket is expected to be private with S3 Block Public Access enabled.
Images are served to authenticated users using short-lived presigned GET URLs;
no uploaded object is ever made public.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from ...config import Settings
from .base import StorageBackend, StorageError, StorageHealth, StorageObjectNotFound

logger = logging.getLogger(__name__)


def build_s3_client(settings: Settings):  # type: ignore[no-untyped-def]
    """Create a boto3 S3 client using environment keys or an EC2 IAM role."""
    kwargs: dict[str, Any] = {
        "region_name": settings.aws_region,
        "config": Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
            s3={"addressing_style": "path" if settings.aws_endpoint_url else "virtual"},
        ),
    }
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    # When no explicit keys are provided, boto3 falls back to its credential
    # chain — including the EC2 instance profile. This is the recommended
    # production setup and avoids long-lived keys on the server.
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        if settings.aws_session_token:
            kwargs["aws_session_token"] = settings.aws_session_token
    return boto3.client("s3", **kwargs)


class S3Storage(StorageBackend):
    name = "s3"
    provider = "Amazon S3"

    def __init__(self, settings: Settings, client: Any | None = None) -> None:
        self.settings = settings
        self.bucket = settings.aws_bucket_name
        self.region = settings.aws_region
        self.prefix = settings.s3_key_prefix.strip("/")
        self.client = client or build_s3_client(settings)

    @property
    def configured(self) -> bool:
        return bool(self.bucket)

    def _full_key(self, key: str) -> str:
        if not key or key.startswith("/") or ".." in key.split("/"):
            raise StorageError("Invalid storage key.")
        return f"{self.prefix}/{key}" if self.prefix else key

    # --- storage interface -------------------------------------------------
    def save(self, key: str, data: bytes, content_type: str) -> None:
        if not self.configured:
            raise StorageError("Amazon S3 is not configured: AWS_BUCKET_NAME is missing.")
        extra: dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": self._full_key(key),
            "Body": data,
            "ContentType": content_type,
            "CacheControl": "private, max-age=3600",
            "Metadata": {"application": "aeropix"},
        }
        if self.settings.s3_use_sse:
            extra["ServerSideEncryption"] = "AES256"
        try:
            self.client.put_object(**extra)
        except (ClientError, BotoCoreError, NoCredentialsError) as exc:
            logger.error("S3 put_object failed: %s", exc)
            raise StorageError("Amazon S3 rejected the upload. Check the bucket and IAM permissions.") from exc

    def read(self, key: str) -> bytes:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=self._full_key(key))
            return response["Body"].read()
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"NoSuchKey", "404", "NotFound"}:
                raise StorageObjectNotFound("The S3 object could not be found.") from exc
            raise StorageError("Amazon S3 could not read the object.") from exc
        except (BotoCoreError, NoCredentialsError) as exc:
            raise StorageError("Amazon S3 is unreachable.") from exc

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=self._full_key(key))
        except (ClientError, BotoCoreError, NoCredentialsError) as exc:
            logger.error("S3 delete_object failed: %s", exc)
            raise StorageError("Amazon S3 could not delete the object.") from exc

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=self._full_key(key))
            return True
        except ClientError as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code in {"404", "NoSuchKey", "NotFound"}:
                return False
            return False
        except (BotoCoreError, NoCredentialsError):
            return False

    def url(self, key: str, ttl_seconds: int | None = None) -> str:
        if not self.configured:
            raise StorageError("Amazon S3 is not configured: AWS_BUCKET_NAME is missing.")
        ttl = int(ttl_seconds or self.settings.s3_presign_expire_seconds)
        try:
            return self.client.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": self.bucket, "Key": self._full_key(key)},
                ExpiresIn=ttl,
            )
        except (ClientError, BotoCoreError, NoCredentialsError) as exc:
            logger.error("S3 presign failed: %s", exc)
            raise StorageError("Could not generate a secure URL for this image.") from exc

    # --- diagnostics -------------------------------------------------------
    def health(self) -> StorageHealth:
        started = time.perf_counter()
        if not self.configured:
            return StorageHealth(
                backend=self.name,
                provider=self.provider,
                configured=False,
                reachable=False,
                detail="AWS_BUCKET_NAME is not set.",
                bucket=None,
                region=self.region,
            )
        try:
            self.client.head_bucket(Bucket=self.bucket)
            latency = int((time.perf_counter() - started) * 1000)
            return StorageHealth(
                backend=self.name,
                provider=self.provider,
                configured=True,
                reachable=True,
                detail="Bucket is reachable with the configured credentials.",
                latency_ms=latency,
                bucket=self.bucket,
                region=self.region,
            )
        except NoCredentialsError:
            detail = "No AWS credentials found. Attach an IAM instance profile or configure environment credentials."
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "Unknown")
            detail = f"Bucket check failed ({code}). Verify the bucket name, region and IAM policy."
        except BotoCoreError as exc:
            detail = f"Could not reach Amazon S3: {exc.__class__.__name__}"
        latency = int((time.perf_counter() - started) * 1000)
        return StorageHealth(
            backend=self.name,
            provider=self.provider,
            configured=True,
            reachable=False,
            detail=detail,
            latency_ms=latency,
            bucket=self.bucket,
            region=self.region,
        )

    def describe(self) -> dict:
        return {
            "backend": self.name,
            "provider": self.provider,
            "mode": "Amazon S3 (private bucket, presigned URLs)",
            "bucket": self.bucket or None,
            "region": self.region,
            "encryption": "SSE-S3 (AES256)" if self.settings.s3_use_sse else "Bucket default",
            "presign_ttl_seconds": self.settings.s3_presign_expire_seconds,
            "prefix": self.prefix or None,
            "private": True,
        }
