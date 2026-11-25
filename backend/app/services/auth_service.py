"""Password hashing, JWT issuing/validation and user authentication."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import User

password_hasher = PasswordHash.recommended()
JWT_ALGORITHM = "HS256"


class AuthError(Exception):
    pass


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:  # malformed hash must never authenticate
        return False


def create_access_token(user_id: int) -> tuple[str, int]:
    expires_in = settings.access_token_expire_minutes * 60
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "typ": "access",
        "iss": "aeropix",
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)
    return token, expires_in


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
            issuer="aeropix",
        )
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired authentication token.") from exc
    if payload.get("typ") != "access":
        raise AuthError("Invalid authentication token type.")
    try:
        return int(payload["sub"])
    except (TypeError, ValueError) as exc:
        raise AuthError("Invalid authentication token subject.") from exc


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        # Perform a dummy hash to reduce timing-based user enumeration.
        verify_password(password, password_hasher.hash("timing-equaliser"))
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
