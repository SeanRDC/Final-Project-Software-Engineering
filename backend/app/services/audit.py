# Records and lists the audit trail of access to and changes of clinic records.

import json
from datetime import date, datetime, time
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.services.common import paginate


def record(
    db: Session,
    actor: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    **detail: Any,
) -> None:
    db.add(
        AuditLog(
            user_id=actor.id if actor else None,
            username=actor.username if actor else detail.pop("username", None),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=json.dumps(detail, default=str) if detail else None,
        )
    )


def list_logs(
    db: Session,
    *,
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[AuditLog], int]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        query = query.where(AuditLog.entity_id == entity_id)
    if start:
        query = query.where(AuditLog.created_at >= start)
    if end:
        query = query.where(AuditLog.created_at <= end)
    return paginate(db, query, page, page_size)


def serializable(values: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value.isoformat() if isinstance(value, (date, datetime, time)) else value
        for key, value in values.items()
    }
