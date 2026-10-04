# Password hashing and JWT access token creation and validation.

from datetime import timedelta

import bcrypt
import jwt

from app.core.clock import utcnow
from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, role: str) -> tuple[str, int]:
    lifetime = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    now = utcnow()
    payload = {"sub": str(user_id), "role": role, "iat": now, "exp": now + lifetime}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
