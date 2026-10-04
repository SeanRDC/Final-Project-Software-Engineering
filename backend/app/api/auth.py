# API routes for logging in, reading the current account and changing its password.

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DbSession
from app.core.permissions import permissions_for
from app.core.security import create_access_token
from app.models import User
from app.schemas.common import Message
from app.schemas.user import CurrentUser as CurrentUserOut
from app.schemas.user import PasswordChange, Token, UserOut
from app.services import users

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _me(user: User) -> CurrentUserOut:
    return CurrentUserOut(
        **UserOut.model_validate(user).model_dump(), permissions=permissions_for(user.role)
    )


@router.post("/login", response_model=Token, summary="Log in with a username and password")
def login(db: DbSession, form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = users.authenticate(db, form.username, form.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token, expires_in = create_access_token(user.id, user.role)
    return Token(access_token=token, expires_in=expires_in, user=_me(user))


@router.get("/me", response_model=CurrentUserOut, summary="The logged-in account and its permissions")
def me(user: CurrentUser):
    return _me(user)


@router.post("/change-password", response_model=Message)
def change_password(data: PasswordChange, db: DbSession, user: CurrentUser):
    users.change_password(db, user, data.current_password, data.new_password)
    return Message(message="Password changed.")
