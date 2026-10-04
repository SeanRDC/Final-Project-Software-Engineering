# Request and response schemas for accounts and login.

from datetime import datetime

from pydantic import BaseModel, Field

from app.core.permissions import Role
from app.schemas.common import OptionalText, ORMModel

Username = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9._-]+$")
Password = Field(min_length=8, max_length=72)


class UserOut(ORMModel):
    id: int
    username: str
    full_name: str
    role: Role
    job_title: str | None
    is_active: bool
    must_change_password: bool
    created_at: datetime
    last_login_at: datetime | None


class CurrentUser(UserOut):
    permissions: list[str]


class UserCreate(BaseModel):
    username: str = Username
    full_name: str = Field(min_length=1, max_length=120)
    role: Role
    job_title: OptionalText = Field(default=None, max_length=80)
    password: str = Password


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    role: Role | None = None
    job_title: OptionalText = Field(default=None, max_length=80)
    is_active: bool | None = None


class PasswordReset(BaseModel):
    new_password: str = Password


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Password


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: CurrentUser
