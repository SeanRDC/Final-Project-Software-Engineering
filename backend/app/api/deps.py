# Shared route dependencies for the database session, current user, permission checks and paging.

from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import Permission, has_permission
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")

DbSession = Annotated[Session, Depends(get_db)]


def user_from_token(db: Session, token: str) -> User | None:
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    user = db.get(User, user_id)
    return user if user is not None and user.is_active else None


def get_current_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    user = user_from_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require(*permissions: Permission):
    def checker(user: CurrentUser) -> User:
        if not any(has_permission(user.role, p) for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is not allowed to do this.",
            )
        return user

    return Depends(checker)


def Authorized(*permissions: Permission):
    return Annotated[User, require(*permissions)]


PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=200)]
