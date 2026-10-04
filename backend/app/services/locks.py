# Edit locking that makes a patient or visit record read-only for others while one user edits it.

from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clock import utcnow
from app.core.config import settings
from app.core.exceptions import AppError, ForbiddenError, LockedError
from app.core.permissions import Role
from app.models import Patient, RecordLock, User, Visit
from app.services.common import get_or_404

LOCKABLE = {"patient": Patient, "visit": Visit}


def _check_resource(db: Session, resource_type: str, resource_id: int) -> None:
    model = LOCKABLE.get(resource_type)
    if model is None:
        raise AppError(f"'{resource_type}' records cannot be locked")
    get_or_404(db, model, resource_id, resource_type.capitalize())


def get_active_lock(db: Session, resource_type: str, resource_id: int) -> RecordLock | None:
    lock = db.scalar(
        select(RecordLock).where(
            RecordLock.resource_type == resource_type, RecordLock.resource_id == resource_id
        )
    )
    if lock is None or lock.expires_at <= utcnow():
        return None
    return lock


def ensure_editable(db: Session, resource_type: str, resource_id: int, actor: User) -> None:
    lock = get_active_lock(db, resource_type, resource_id)
    if lock is not None and lock.locked_by_id != actor.id:
        raise LockedError(
            f"This record is being edited by {lock.locked_by_name}. Try again shortly.",
            locked_by=lock.locked_by_name,
            expires_at=lock.expires_at.isoformat(),
        )


def acquire(
    db: Session, resource_type: str, resource_id: int, actor: User, *, commit: bool = True
) -> RecordLock:
    _check_resource(db, resource_type, resource_id)
    ensure_editable(db, resource_type, resource_id, actor)

    now = utcnow()
    expires_at = now + timedelta(minutes=settings.LOCK_TIMEOUT_MINUTES)
    lock = db.scalar(
        select(RecordLock).where(
            RecordLock.resource_type == resource_type, RecordLock.resource_id == resource_id
        )
    )
    if lock is None:
        lock = RecordLock(resource_type=resource_type, resource_id=resource_id)
        db.add(lock)
    if lock.locked_by_id != actor.id:
        lock.locked_by_id = actor.id
        lock.locked_at = now
    lock.expires_at = expires_at
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        ensure_editable(db, resource_type, resource_id, actor)
        raise LockedError("This record was just opened for editing by another user.")
    if commit:
        db.commit()
    db.refresh(lock)
    return lock


def release(
    db: Session, resource_type: str, resource_id: int, actor: User, *, commit: bool = True
) -> None:
    lock = get_active_lock(db, resource_type, resource_id)
    if lock is not None and lock.locked_by_id != actor.id and actor.role != Role.COORDINATOR.value:
        raise ForbiddenError("Only the coordinator can release another user's lock")
    db.execute(
        delete(RecordLock).where(
            RecordLock.resource_type == resource_type, RecordLock.resource_id == resource_id
        )
    )
    if commit:
        db.commit()
