# Business logic for medical kits: the kits, their standard contents, and each loan from request to return.

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import clinic_today, utcnow
from app.core.exceptions import AppError, ConflictError
from app.models import Medicine, Medkit, MedkitRequest, MedkitRequestItem, MedkitTemplateItem, User
from app.models.enums import (
    MedkitRequestStatus,
    MedkitStatus,
    NotificationType,
    StockMovementType,
)
from app.schemas.medkit import (
    MedkitClose,
    MedkitCreate,
    MedkitIssue,
    MedkitLoan,
    MedkitOut,
    MedkitRequestCreate,
    MedkitReturn,
    MedkitUpdate,
    TemplateItemIn,
)
from app.services import audit, inventory, notifications
from app.services.common import apply_updates, get_or_404, paginate

Status = MedkitRequestStatus


# The kits

def list_kits(db: Session) -> list[MedkitOut]:
    kits = db.scalars(select(Medkit).order_by(Medkit.kit_number)).all()
    out_on = {
        request.medkit_id: request
        for request in db.scalars(
            select(MedkitRequest).where(MedkitRequest.status == Status.ISSUED)
        )
    }
    return [
        MedkitOut(
            **MedkitOut.model_validate(kit).model_dump(exclude={"current_request"}),
            current_request=MedkitLoan.model_validate(out_on[kit.id]) if kit.id in out_on else None,
        )
        for kit in kits
    ]


def create_kit(db: Session, data: MedkitCreate, actor: User) -> Medkit:
    if db.scalar(select(Medkit.id).where(Medkit.kit_number == data.kit_number)):
        raise ConflictError(f"Kit #{data.kit_number} already exists")
    kit = Medkit(kit_number=data.kit_number, label=data.label)
    db.add(kit)
    db.flush()
    audit.record(db, actor, "medkit.create", "medkit", kit.id, kit_number=kit.kit_number)
    db.commit()
    return kit


def update_kit(db: Session, kit_id: int, data: MedkitUpdate, actor: User) -> Medkit:
    kit = get_or_404(db, Medkit, kit_id, "Medical kit")
    changes = data.model_dump(exclude_unset=True)
    if changes.get("status") is not None and kit.status != MedkitStatus.LOST:
        raise AppError(f"Kit #{kit.kit_number} is not lost, so there is nothing to put back")
    if changes.get("is_active") is False and kit.status == MedkitStatus.OUT:
        raise AppError(f"Kit #{kit.kit_number} is out; take it back before retiring it")
    changed = apply_updates(kit, changes, required={"is_active", "status"})
    if changed:
        audit.record(db, actor, "medkit.update", "medkit", kit.id, fields=changed)
    db.commit()
    return kit


# The standard contents

def get_template(db: Session) -> list[MedkitTemplateItem]:
    return list(db.scalars(select(MedkitTemplateItem).order_by(MedkitTemplateItem.sort_order)))


def set_template(db: Session, items: list[TemplateItemIn], actor: User) -> list[MedkitTemplateItem]:
    ids = [item.medicine_id for item in items]
    if len(set(ids)) != len(ids):
        raise AppError("Each medicine can be listed only once in the kit contents")
    for medicine_id in ids:
        get_or_404(db, Medicine, medicine_id, "Medicine")
    for old in get_template(db):
        db.delete(old)
    db.flush()
    for order, item in enumerate(items):
        db.add(MedkitTemplateItem(
            medicine_id=item.medicine_id, default_quantity=item.default_quantity,
            sort_order=order,
        ))
    audit.record(db, actor, "medkit.template_update", "medkit", None, lines=len(items))
    db.commit()
    return get_template(db)


# The loans

def list_requests(
    db: Session,
    *,
    status: MedkitRequestStatus | None = None,
    overdue_only: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[MedkitRequest], int]:
    query = select(MedkitRequest).order_by(MedkitRequest.created_at.desc(), MedkitRequest.id.desc())
    if overdue_only:
        query = query.where(
            MedkitRequest.status == Status.ISSUED, MedkitRequest.activity_date < clinic_today()
        )
    elif status is not None:
        query = query.where(MedkitRequest.status == status)
    return paginate(db, query, page, page_size)


def get_request(db: Session, request_id: int) -> MedkitRequest:
    return get_or_404(db, MedkitRequest, request_id, "Medical kit request")


def _in_status(request: MedkitRequest, wanted: MedkitRequestStatus, doing: str) -> None:
    if request.status != wanted:
        raise ConflictError(f"This request is {request.status.value}, so it cannot be {doing}")


def create_request(db: Session, data: MedkitRequestCreate, actor: User) -> MedkitRequest:
    request = MedkitRequest(**data.model_dump(), created_by_id=actor.id)
    db.add(request)
    db.flush()
    audit.record(db, actor, "medkit_request.create", "medkit_request", request.id,
                 organization=request.organization, activity=request.activity)
    db.commit()
    return request


def issue(db: Session, request_id: int, data: MedkitIssue, actor: User) -> MedkitRequest:
    """Hands over a kit: every item leaves the stock, or none does."""
    request = get_request(db, request_id)
    _in_status(request, Status.REQUESTED, "issued")
    kit = get_or_404(db, Medkit, data.medkit_id, "Medical kit")
    if not kit.is_active:
        raise AppError(f"Kit #{kit.kit_number} is no longer in use")
    if kit.status != MedkitStatus.AVAILABLE:
        raise ConflictError(f"Kit #{kit.kit_number} is {kit.status.value}; choose another kit")
    ids = [line.medicine_id for line in data.items]
    if len(set(ids)) != len(ids):
        raise AppError("Each medicine can be listed only once; add up the quantity instead")

    request.medkit = kit
    for line in data.items:
        # Stops with the shortage in plain words; nothing is committed, so no stock moves.
        inventory.apply_movement(
            db, line.medicine_id, StockMovementType.RELEASE, -line.quantity, actor,
            reason=f"Medical kit #{kit.kit_number} – {request.activity}",
            medkit_request_id=request.id,
        )
        request.items.append(
            MedkitRequestItem(medicine_id=line.medicine_id, quantity_issued=line.quantity)
        )
    kit.status = MedkitStatus.OUT
    request.status = Status.ISSUED
    request.issued_at = utcnow()
    request.issued_by = actor
    audit.record(db, actor, "medkit_request.issue", "medkit_request", request.id,
                 kit_number=kit.kit_number, items=len(data.items))
    db.commit()
    db.refresh(request)
    return request


def return_kit(db: Session, request_id: int, data: MedkitReturn, actor: User) -> MedkitRequest:
    """Takes a kit back: what came back returns to stock, the rest counts as used."""
    request = get_request(db, request_id)
    _in_status(request, Status.ISSUED, "returned")
    counted = {line.item_id: line.quantity_returned for line in data.items}
    if set(counted) != {item.id for item in request.items}:
        raise AppError("Count every item of the kit, entering 0 for anything used up")
    for item in request.items:
        returned = counted[item.id]
        if returned > item.quantity_issued:
            raise AppError(
                f"Only {item.quantity_issued} {item.unit} of {item.medicine_name} went out "
                f"with the kit, not {returned}"
            )
        item.quantity_returned = returned
        if returned:
            inventory.apply_movement(
                db, item.medicine_id, StockMovementType.STOCK_IN, returned, actor,
                reason=f"Returned with {request.label}", medkit_request_id=request.id,
            )
    _close(request, Status.RETURNED, MedkitStatus.AVAILABLE, data.notes, actor)
    audit.record(db, actor, "medkit_request.return", "medkit_request", request.id,
                 used=sum(item.quantity_used or 0 for item in request.items))
    db.commit()
    db.refresh(request)
    return request


def mark_lost(db: Session, request_id: int, data: MedkitClose, actor: User) -> MedkitRequest:
    """A kit that did not come back: nothing returns to stock, the borrower replaces it."""
    request = get_request(db, request_id)
    _in_status(request, Status.ISSUED, "marked lost")
    _close(request, Status.LOST, MedkitStatus.LOST, data.notes, actor)
    audit.record(db, actor, "medkit_request.lost", "medkit_request", request.id)
    db.commit()
    db.refresh(request)
    return request


def cancel(db: Session, request_id: int, actor: User) -> MedkitRequest:
    request = get_request(db, request_id)
    _in_status(request, Status.REQUESTED, "cancelled")
    request.status = Status.CANCELLED
    request.closed_at = utcnow()
    request.closed_by = actor
    audit.record(db, actor, "medkit_request.cancel", "medkit_request", request.id)
    db.commit()
    return request


def _close(
    request: MedkitRequest,
    status: MedkitRequestStatus,
    kit_status: MedkitStatus,
    notes: str | None,
    actor: User,
) -> None:
    request.status = status
    request.closed_at = utcnow()
    request.closed_by = actor
    if notes:
        request.notes = f"{request.notes}\n{notes}" if request.notes else notes
    if request.medkit is not None:
        request.medkit.status = kit_status


def flag_overdue(db: Session) -> int:
    """Sends one notification per kit still out after its activity. Run when lists are read."""
    late = db.scalars(
        select(MedkitRequest).where(
            MedkitRequest.status == Status.ISSUED,
            MedkitRequest.activity_date < clinic_today(),
            MedkitRequest.overdue_notified_at.is_(None),
        )
    ).all()
    for request in late:
        kit = f"Kit #{request.medkit.kit_number}" if request.medkit else "A medical kit"
        notifications.notify(
            db,
            NotificationType.MEDKIT_OVERDUE,
            f"{kit} is overdue",
            f"{request.organization} – {request.activity} ({request.activity_date:%b %d})",
            entity_type="medkit_request",
            entity_id=request.id,
        )
        request.overdue_notified_at = utcnow()
    if late:
        db.commit()
    return len(late)

