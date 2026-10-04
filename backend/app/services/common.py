# Helpers shared by the services for lookups, pagination, partial updates and search patterns.

from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError


def get_or_404(db: Session, model: type, object_id: int, label: str | None = None) -> Any:
    obj = db.get(model, object_id)
    if obj is None:
        raise NotFoundError(f"{label or model.__name__} {object_id} was not found")
    return obj


def paginate(db: Session, query: Select, page: int, page_size: int) -> tuple[list, int]:
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    rows = db.scalars(query.limit(page_size).offset((page - 1) * page_size)).unique().all()
    return list(rows), total


def apply_updates(obj: Any, changes: dict[str, Any], required: set[str] = frozenset()) -> list[str]:
    changed = []
    for field, value in changes.items():
        if value is None and field in required:
            continue
        if getattr(obj, field) != value:
            setattr(obj, field, value)
            changed.append(field)
    return changed


def like_pattern(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
