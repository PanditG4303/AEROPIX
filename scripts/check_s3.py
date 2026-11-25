#!/usr/bin/env python3
"""Verify the real Amazon S3 bucket used by AEROPIX.

Checks performed
----------------
1. Credentials resolve and the bucket exists in the configured region.
2. Block Public Access is fully enabled (all four settings).
3. Default encryption is enabled (SSE-S3 or SSE-KMS).
4. Versioning state is reported (optional, informational).
5. A small object is uploaded with server-side encryption, then read back.
6. A presigned GET URL works.
7. The same object is NOT readable without a signature (private bucket).
8. The test object is deleted again.

Usage
-----
From the repository root, with the backend virtual environment active:

    python scripts/check_s3.py

The script reads the same environment variables as the application. On EC2:

    set -a; source /opt/aeropix/.env; set +a
    /opt/aeropix/.venv/bin/python scripts/check_s3.py

Notes
-----
* The application's least-privilege instance role can perform the upload,
  download, presign and delete checks. Reading bucket *configuration*
  (public access block / encryption) needs additional read-only permissions;
  when those are denied the check is reported as a warning, not a failure.
* No secret keys are printed.
"""
from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.config import settings  # noqa: E402
from app.services.storage.s3 import build_s3_client  # noqa: E402

PASS = 0
FAIL = 0
WARN = 0


def ok(message: str) -> None:
    global PASS
    PASS += 1
    print(f"PASS  {message}")


def bad(message: str) -> None:
    global FAIL
    FAIL += 1
    print(f"FAIL  {message}")


def warn(message: str) -> None:
    global WARN
    WARN += 1
    print(f"WARN  {message}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the AEROPIX S3 bucket.")
    parser.add_argument(
        "--prefix",
        default="_aeropix_checks",
        help="Key prefix for the temporary test object (default: _aeropix_checks)",
    )
    args = parser.parse_args()

    bucket = settings.aws_bucket_name
    region = settings.aws_region
    if not bucket:
        print("AWS_BUCKET_NAME is not configured. Set it in .env or the environment.", file=sys.stderr)
        return 2

    print("AEROPIX S3 verification")
    print(f"Bucket: {bucket}")
    print(f"Region: {region}")
    print(f"SSE requested: {'AES256' if settings.s3_use_sse else 'no'}")
    print()

    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
    except ImportError:
        print("boto3 is not installed. Run: pip install -r backend/requirements.txt", file=sys.stderr)
        return 2

    try:
        client = build_s3_client(settings)
    except (BotoCoreError, NoCredentialsError) as exc:
        print(f"Could not create the S3 client: {exc}", file=sys.stderr)
        return 2

    # --- Identity -----------------------------------------------------------
    try:
        session_kwargs = {"region_name": region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            session_kwargs.update(
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                aws_session_token=settings.aws_session_token,
            )
        sts = boto3.Session(**session_kwargs).client("sts")
        identity = sts.get_caller_identity()
        print(f"Identity: {identity.get('Arn')}")
        print(f"Account:  {identity.get('Account')}")
        print()
    except (BotoCoreError, ClientError) as exc:
        warn(f"Could not call STS get-caller-identity: {exc}")
        print()

    # --- Bucket exists ------------------------------------------------------
    try:
        client.head_bucket(Bucket=bucket)
        ok("Bucket exists and is reachable")
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "Unknown")
        bad(f"Bucket is not reachable ({code})")
        print("\nCannot continue without a reachable bucket.", file=sys.stderr)
        return 1

    # --- Public access block ------------------------------------------------
    try:
        config = client.get_public_access_block(Bucket=bucket)["PublicAccessBlockConfiguration"]
        keys = (
            "BlockPublicAcls",
            "IgnorePublicAcls",
            "BlockPublicPolicy",
            "RestrictPublicBuckets",
        )
        missing = [key for key in keys if not config.get(key)]
        if missing:
            bad(f"Block Public Access is incomplete: {', '.join(missing)} = False")
        else:
            ok("Block Public Access: all four settings enabled")
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"AccessDenied", "AccessDeniedException"}:
            warn("Cannot read Block Public Access (needs s3:GetBucketPublicAccessBlock)")
        elif code == "NoSuchPublicAccessBlockConfiguration":
            bad("No Block Public Access configuration on this bucket")
        else:
            warn(f"Could not read Block Public Access: {code or exc}")

    # --- Encryption ---------------------------------------------------------
    try:
        rules = client.get_bucket_encryption(Bucket=bucket)["ServerSideEncryptionConfiguration"]["Rules"]
        algorithms = [
            rule.get("ApplyServerSideEncryptionByDefault", {}).get("SSEAlgorithm")
            for rule in rules
        ]
        algorithms = [item for item in algorithms if item]
        if algorithms:
            ok(f"Default encryption enabled: {', '.join(algorithms)}")
        else:
            bad("Default encryption rule has no SSEAlgorithm")
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"AccessDenied", "AccessDeniedException"}:
            warn("Cannot read default encryption (needs s3:GetEncryptionConfiguration)")
        elif code == "ServerSideEncryptionConfigurationNotFoundError":
            bad("Bucket has no default encryption configuration")
        else:
            warn(f"Could not read default encryption: {code or exc}")

    # --- Versioning (informational) ----------------------------------------
    try:
        versioning = client.get_bucket_versioning(Bucket=bucket).get("Status", "Disabled")
        print(f"INFO  Versioning: {versioning}")
    except ClientError:
        print("INFO  Versioning: not readable with these permissions")

    # --- Round trip ---------------------------------------------------------
    key = f"{args.prefix.strip('/')}/{uuid.uuid4().hex}.txt"
    body = b"AEROPIX S3 verification object. Safe to delete.\n"
    uploaded = False
    try:
        put_kwargs = {"Bucket": bucket, "Key": key, "Body": body, "ContentType": "text/plain"}
        if settings.s3_use_sse:
            put_kwargs["ServerSideEncryption"] = "AES256"
        client.put_object(**put_kwargs)
        uploaded = True
        ok(f"Uploaded test object: {key}")

        head = client.head_object(Bucket=bucket, Key=key)
        if int(head.get("ContentLength", 0)) == len(body):
            ok("HeadObject returns the expected size")
        else:
            bad("HeadObject returned an unexpected size")

        sse = head.get("ServerSideEncryption")
        if settings.s3_use_sse:
            if sse == "AES256":
                ok("Object stored with SSE-S3 (AES256)")
            else:
                bad(f"Object encryption header was {sse!r}, expected AES256")
        else:
            print(f"INFO  ServerSideEncryption: {sse or 'not set'}")

        presigned = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=120,
        )
        with urlopen(presigned, timeout=20) as response:  # noqa: S310 - trusted S3 URL
            downloaded = response.read()
        if downloaded == body:
            ok("Presigned GET URL returned the uploaded content")
        else:
            bad("Presigned GET URL returned different content")

        if settings.aws_endpoint_url:
            print("INFO  Unsigned-access check skipped for a custom S3 endpoint")
        else:
            unsigned = f"https://{bucket}.s3.{region}.amazonaws.com/{quote(key)}"
            try:
                with urlopen(Request(unsigned, method="GET"), timeout=20) as response:  # noqa: S310
                    response.read()
                bad("Object is readable WITHOUT a signature — the bucket is public!")
            except HTTPError as exc:
                if exc.code == 403:
                    ok("Unsigned GET is rejected with 403 (bucket is private)")
                elif exc.code == 404:
                    warn("Unsigned GET returned 404 — check the regional endpoint manually")
                else:
                    warn(f"Unsigned GET returned HTTP {exc.code} (expected 403)")
            except URLError as exc:
                warn(f"Could not run the unsigned GET check: {exc.reason}")

    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "Unknown")
        message = exc.response.get("Error", {}).get("Message", "")
        bad(f"S3 round trip failed ({code}: {message})")
    except (BotoCoreError, URLError, OSError) as exc:
        bad(f"S3 round trip failed: {exc}")
    finally:
        if uploaded:
            try:
                client.delete_object(Bucket=bucket, Key=key)
                ok("Deleted the temporary test object")
            except (BotoCoreError, ClientError) as exc:
                warn(f"Could not delete the test object {key}: {exc}")
                print(f"      Delete it manually: aws s3 rm s3://{bucket}/{key}")

    print()
    if FAIL:
        print(f"{FAIL} check(s) failed, {PASS} passed, {WARN} warning(s).")
        return 1
    print(f"All {PASS} checks passed ({WARN} warning(s)).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
