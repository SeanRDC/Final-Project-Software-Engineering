# Creates notifications and tracks which ones each user has read.

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.clock import utcnow
from app.core.permissions import Role
from app.models import Notification, NotificationRead, User
from app.models.enums import NotificationType
from app.schemas.support import NotificationList, NotificationOut


def notify(
    db: Session,
    type_: NotificationType,
    title: str,
    body: str | None = None,
    *,
    audience_role: Role | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> None:
    db.add(
        Notification(
            type=type_,
            title=title[:200],
            body=body[:255] if body else None,
            audience_role=audience_role.value if audience_role else None,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )


def _visible_to(user: User):
    return or_(Notification.audience_role.is_(None), Notification.audience_role == user.role)


def _read_ids(db: Session, user: User, notification_ids: list[int]) -> set[int]:
    if not notification_ids:
        return set()
    return set(
        db.scalars(
            select(NotificationRead.notification_id).where(
                NotificationRead.user_id == user.id,
                NotificationRead.notification_id.in_(notification_ids),
            )
        )
    )


def unread_count(db: Session, user: User) -> int:
    read = select(NotificationRead.notification_id).where(NotificationRead.user_id == user.id)
    return db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(_visible_to(user), Notification.id.not_in(read))
    ) or 0


def list_for_user(
    db: Session, user: User, *, limit: int = 20, unread_only: bool = False
) -> NotificationList:
    query = (
        select(Notification)
        .where(_visible_to(user))
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
    )
    if unread_only:
        read = select(NotificationRead.notification_id).where(NotificationRead.user_id == user.id)
        query = query.where(Notification.id.not_in(read))
    rows = list(db.scalars(query))
    read_ids = _read_ids(db, user, [n.id for n in rows])
    items = [
        NotificationOut.model_validate(n).model_copy(update={"is_read": n.id in read_ids})
        for n in rows
    ]
    return NotificationList(items=items, unread_count=unread_count(db, user))


def mark_read(db: Session, user: User, notification_id: int | None = None) -> int:
    read = select(NotificationRead.notification_id).where(NotificationRead.user_id == user.id)
    query = select(Notification.id).where(_visible_to(user), Notification.id.not_in(read))
    if notification_id is not None:
        query = query.where(Notification.id == notification_id)
    ids = list(db.scalars(query))
    now = utcnow()
    db.add_all(NotificationRead(notification_id=i, user_id=user.id, read_at=now) for i in ids)
    db.commit()
    return len(ids)
