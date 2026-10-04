# Business logic for checking in patients, recording visits and consultations, and releasing medicine.

from datetime import date

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.core.clock import clinic_today, utcnow
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.core.permissions import Role
from app.models import Appointment, Medicine, Patient, User, Visit, VisitMedicine
from app.models.enums import AppointmentStatus, StockMovementType, VisitStatus
from app.schemas.visit import (
    CancelVisit,
    CheckIn,
    CompleteVisit,
    ConsultationUpdate,
    DispenseMedicine,
    LockInfo,
    VisitOut,
    VisitRecordUpdate,
)
from app.services import audit, inventory, locks
from app.services.common import apply_updates, get_or_404, paginate

RECORD_REQUIRED = {"complaint", "visit_type", "guardian_notified", "referred"}
_OPEN_FIRST = case((Visit.status == VisitStatus.OPEN, 0), else_=1)


def _get(db: Session, visit_id: int) -> Visit:
    return get_or_404(db, Visit, visit_id, "Visit")


def _require_open(visit: Visit, action: str) -> None:
    if visit.status != VisitStatus.OPEN:
        raise ConflictError(f"Cannot {action} a visit that is already {visit.status.value}")


def to_out(db: Session, visit: Visit) -> VisitOut:
    lock = locks.get_active_lock(db, "visit", visit.id)
    out = VisitOut.model_validate(visit)
    if lock is not None:
        out.lock = LockInfo.model_validate(lock)
    return out


def check_in(
    db: Session, data: CheckIn, actor: User, appointment: Appointment | None = None
) -> Visit:
    patient = get_or_404(db, Patient, data.patient_id, "Patient")
    if patient.is_archived:
        raise AppError("This patient record is archived. Restore it before checking in.")
    today = clinic_today()

    open_visit_id = db.scalar(
        select(Visit.id).where(
            Visit.patient_id == patient.id,
            Visit.visit_date == today,
            Visit.status == VisitStatus.OPEN,
        )
    )
    if open_visit_id is not None:
        raise ConflictError(
            f"{patient.full_name} already has an open visit today", visit_id=open_visit_id
        )

    visit = Visit(
        patient_id=patient.id,
        appointment_id=appointment.id if appointment else None,
        visit_date=today,
        status=VisitStatus.OPEN,
        visit_type=data.visit_type,
        complaint=data.complaint.strip(),
        created_by_id=actor.id,
        updated_by_id=actor.id,
    )
    db.add(visit)
    db.flush()
    if appointment is not None:
        appointment.status = AppointmentStatus.CHECKED_IN
    audit.record(db, actor, "visit.check_in", "visit", visit.id, patient_id=patient.id)
    db.commit()
    return visit


def get(db: Session, visit_id: int, actor: User) -> Visit:
    visit = _get(db, visit_id)
    audit.record(db, actor, "visit.view", "visit", visit.id, patient_id=visit.patient_id)
    db.commit()
    return visit


def for_day(db: Session, day: date | None = None) -> list[Visit]:
    day = day or clinic_today()
    return list(
        db.scalars(
            select(Visit)
            .where(Visit.visit_date == day, Visit.status != VisitStatus.CANCELLED)
            .order_by(_OPEN_FIRST, Visit.completed_at.desc(), Visit.checked_in_at, Visit.id)
        ).unique()
    )


def list_visits(
    db: Session,
    *,
    patient_id: int | None = None,
    status: VisitStatus | None = None,
    start: date | None = None,
    end: date | None = None,
    include_cancelled: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Visit], int]:
    query = select(Visit).order_by(
        Visit.visit_date.desc(), Visit.checked_in_at.desc(), Visit.id.desc()
    )
    if patient_id is not None:
        query = query.where(Visit.patient_id == patient_id)
    if status is not None:
        query = query.where(Visit.status == status)
    elif not include_cancelled:
        query = query.where(Visit.status != VisitStatus.CANCELLED)
    if start is not None:
        query = query.where(Visit.visit_date >= start)
    if end is not None:
        query = query.where(Visit.visit_date <= end)
    return paginate(db, query, page, page_size)


def update_record(db: Session, visit_id: int, data: VisitRecordUpdate, actor: User) -> Visit:
    visit = _get(db, visit_id)
    if visit.status == VisitStatus.CANCELLED:
        raise ConflictError("A cancelled visit cannot be edited")
    locks.ensure_editable(db, "visit", visit_id, actor)
    changed = apply_updates(visit, data.model_dump(exclude_unset=True), required=RECORD_REQUIRED)
    if changed:
        visit.updated_by_id = actor.id
        audit.record(db, actor, "visit.update", "visit", visit.id, fields=changed)
    db.commit()
    return visit


def update_consultation(
    db: Session, visit_id: int, data: ConsultationUpdate, actor: User
) -> Visit:
    visit = _get(db, visit_id)
    if visit.status == VisitStatus.CANCELLED:
        raise ConflictError("A cancelled visit cannot be edited")
    locks.ensure_editable(db, "visit", visit_id, actor)
    changed = apply_updates(visit, data.model_dump(exclude_unset=True), required={"referred"})
    if changed:
        if actor.role == Role.DOCTOR.value:
            visit.doctor = actor
        visit.updated_by_id = actor.id
        audit.record(db, actor, "visit.consultation_update", "visit", visit.id, fields=changed)
    db.commit()
    return visit


def complete(db: Session, visit_id: int, data: CompleteVisit, actor: User) -> Visit:
    visit = _get(db, visit_id)
    _require_open(visit, "complete")
    locks.ensure_editable(db, "visit", visit_id, actor)
    if data.disposition is not None:
        visit.disposition = data.disposition
    visit.status = VisitStatus.COMPLETED
    visit.completed_at = utcnow()
    visit.updated_by_id = actor.id
    locks.release(db, "visit", visit_id, actor, commit=False)

    if visit.appointment_id is not None:
        appointment = db.get(Appointment, visit.appointment_id)
        if appointment is not None:
            appointment.status = AppointmentStatus.COMPLETED
    audit.record(db, actor, "visit.complete", "visit", visit.id)
    db.commit()
    return visit


def cancel(db: Session, visit_id: int, data: CancelVisit, actor: User) -> Visit:
    visit = _get(db, visit_id)
    _require_open(visit, "cancel")
    locks.ensure_editable(db, "visit", visit_id, actor)
    if visit.medicines:
        raise ConflictError(
            "Medicines were already given during this visit. Complete it instead of cancelling."
        )
    visit.status = VisitStatus.CANCELLED
    visit.cancelled_reason = data.reason
    visit.updated_by_id = actor.id
    locks.release(db, "visit", visit_id, actor, commit=False)
    if visit.appointment_id is not None:
        appointment = db.get(Appointment, visit.appointment_id)
        if appointment is not None and appointment.status == AppointmentStatus.CHECKED_IN:
            appointment.status = AppointmentStatus.CONFIRMED
    audit.record(db, actor, "visit.cancel", "visit", visit.id, reason=data.reason)
    db.commit()
    return visit


def dispense(db: Session, visit_id: int, data: DispenseMedicine, actor: User) -> Visit:
    visit = _get(db, visit_id)
    if visit.status == VisitStatus.CANCELLED:
        raise ConflictError("Medicine cannot be released for a cancelled visit")
    medicine = get_or_404(db, Medicine, data.medicine_id, "Medicine")
    if not medicine.is_active:
        raise AppError(f"{medicine.display_name} is no longer in use")
    inventory.apply_movement(
        db,
        medicine.id,
        StockMovementType.RELEASE,
        -data.quantity,
        actor,
        visit_id=visit.id,
        reason=f"Released to {visit.patient.full_name}",
    )
    visit.medicines.append(
        VisitMedicine(
            medicine_id=medicine.id,
            quantity=data.quantity,
            instructions=data.instructions,
            dispensed_by_id=actor.id,
        )
    )
    audit.record(db, actor, "visit.dispense", "visit", visit.id, medicine=medicine.display_name,
                 quantity=data.quantity)
    db.commit()
    return visit


def undo_dispense(db: Session, visit_id: int, visit_medicine_id: int, actor: User) -> Visit:
    visit = _get(db, visit_id)
    item = db.get(VisitMedicine, visit_medicine_id)
    if item is None or item.visit_id != visit.id:
        raise NotFoundError("That medicine entry does not belong to this visit")
    inventory.apply_movement(
        db,
        item.medicine_id,
        StockMovementType.ADJUSTMENT,
        item.quantity,
        actor,
        visit_id=visit.id,
        reason=f"Correction: release to {visit.patient.full_name} removed",
    )
    audit.record(db, actor, "visit.undo_dispense", "visit", visit.id,
                 medicine=item.medicine_name, quantity=item.quantity)
    visit.medicines.remove(item)
    db.delete(item)
    db.commit()
    return visit
