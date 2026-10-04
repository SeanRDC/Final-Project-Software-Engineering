# Business logic for accounts, authentication and passwords.

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.clock import utcnow
from app.core.exceptions import AppError, ConflictError
from app.core.permissions import Role
from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.user import UserCreate, UserUpdate
from app.services import audit
from app.services.common import apply_updates, get_or_404


def get_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = get_by_username(db, username)
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        audit.record(db, None, "auth.login_failed", "user", user.id if user else None,
                     username=username.strip()[:50])
        db.commit()
        return None
    user.last_login_at = utcnow()
    audit.record(db, user, "auth.login", "user", user.id)
    db.commit()
    return user


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.full_name)))


def create_user(db: Session, data: UserCreate, actor: User | None) -> User:
    if get_by_username(db, data.username):
        raise ConflictError(f"Username '{data.username}' is already taken")
    user = User(
        username=data.username.strip(),
        full_name=data.full_name.strip(),
        role=data.role.value,
        job_title=data.job_title,
        password_hash=hash_password(data.password),
        must_change_password=actor is not None,
    )
    db.add(user)
    db.flush()
    audit.record(db, actor, "user.create", "user", user.id, username=user.username, role=user.role)
    db.commit()
    return user


def _active_coordinator_count(db: Session) -> int:
    return db.scalar(
        select(func.count())
        .select_from(User)
        .where(User.role == Role.COORDINATOR.value, User.is_active.is_(True))
    ) or 0


def update_user(db: Session, user_id: int, data: UserUpdate, actor: User) -> User:
    user = get_or_404(db, User, user_id, "User")
    changes = data.model_dump(exclude_unset=True)
    if "role" in changes and changes["role"] is not None:
        changes["role"] = changes["role"].value

    loses_coordinator = user.role == Role.COORDINATOR.value and user.is_active and (
        changes.get("is_active") is False
        or changes.get("role") not in (None, Role.COORDINATOR.value)
    )
    if loses_coordinator and _active_coordinator_count(db) <= 1:
        raise AppError("The last active coordinator account cannot be demoted or deactivated")

    changed = apply_updates(user, changes, required={"full_name", "role", "is_active"})
    if changed:
        audit.record(db, actor, "user.update", "user", user.id, fields=changed)
    db.commit()
    return user


def reset_password(db: Session, user_id: int, new_password: str, actor: User) -> User:
    user = get_or_404(db, User, user_id, "User")
    user.password_hash = hash_password(new_password)
    user.must_change_password = user.id != actor.id
    audit.record(db, actor, "user.reset_password", "user", user.id)
    db.commit()
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise AppError("The current password is incorrect")
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    audit.record(db, user, "user.change_password", "user", user.id)
    db.commit()
