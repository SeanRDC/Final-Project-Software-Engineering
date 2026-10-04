# API routes the coordinator uses to manage clinic accounts.

from fastapi import APIRouter, status

from app.api.deps import Authorized, DbSession
from app.core.permissions import Permission
from app.schemas.user import PasswordReset, UserCreate, UserOut, UserUpdate
from app.services import users

router = APIRouter(prefix="/users", tags=["Users"])

Admin = Authorized(Permission.USERS_MANAGE)


@router.get("", response_model=list[UserOut], summary="List accounts (coordinator)")
def list_users(db: DbSession, _: Admin):
    return users.list_users(db)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: DbSession, actor: Admin):
    return users.create_user(db, data, actor)


@router.patch("/{user_id}", response_model=UserOut, summary="Edit, change role or deactivate")
def update_user(user_id: int, data: UserUpdate, db: DbSession, actor: Admin):
    return users.update_user(db, user_id, data, actor)


@router.post("/{user_id}/reset-password", response_model=UserOut)
def reset_password(user_id: int, data: PasswordReset, db: DbSession, actor: Admin):
    return users.reset_password(db, user_id, data.new_password, actor)
