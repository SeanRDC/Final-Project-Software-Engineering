# Business logic for booking, rescheduling, approving and checking in appointments.

from calendar import monthrange
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.clock import clinic_today, utcnow
from app.core.exceptions import AppError, ConflictError
from app.core.permissions import Permission, Role, has_permission
from app.models import Appointment, Patient, User, Visit
from app.models.enums import AppointmentStatus, NotificationType, VisitType
from app.schemas.appointment import (
    AppointmentCancel,
    AppointmentCreate,
    AppointmentUpdate,
    CalendarDay,
)
from app.schemas.visit import AppointmentCheckIn, CheckIn
from app.services import audit, notifications, visits
from app.services.common import apply_updates, get_or_404, paginate

OPEN_STATUSES = (AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)


def _get(db: Session, appointment_id: int) -> Appointment:
    return get_or_404(db, Appointment, appointment_id, "Appointment")


def _ensure_no_overlap(db: Session, appointment: Appointment) -> None:
    clash = db.scalar(
        select(Appointment.id).where(
            Appointment.patient_id == appointment.patient_id,
            Appointment.scheduled_date == appointment.scheduled_date,
            Appointment.status.in_(OPEN_STATUSES),
            Appointment.start_time < appointment.end_time,
            Appointment.end_time > appointment.start_time,
            Appointment.id != (appointment.id or 0),
        )
    )
    if clash is not None:
        raise ConflictError("This patient already has an appointment at that time")


def _when(appointment: Appointment) -> str:
    return f"{appointment.scheduled_date:%b %d}, {appointment.start_time:%I:%M %p}"


def list_appointments(
    db: Session,
    *,
    start: date | None = None,
    end: date | None = None,
    status: AppointmentStatus | None = None,
    patient_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Appointment], int]:
    query = select(Appointment).order_by(
        Appointment.scheduled_date, Appointment.start_time, Appointment.id
    )
    if start is not None:
        query = query.where(Appointment.scheduled_date >= start)
    if end is not None:
        query = query.where(Appointment.scheduled_date <= end)
    if status is not None:
        query = query.where(Appointment.status == status)
    if patient_id is not None:
        query = query.where(Appointment.patient_id == patient_id)
    return paginate(db, query, page, page_size)


def for_day(db: Session, day: date | None = None) -> list[Appointment]:
    day = day or clinic_today()
    return list(
        db.scalars(
            select(Appointment)
            .where(
                Appointment.scheduled_date == day,
                Appointment.status != AppointmentStatus.CANCELLED,
            )
            .order_by(Appointment.start_time, Appointment.id)
        ).unique()
    )


def calendar(db: Session, year: int, month: int) -> list[CalendarDay]:
    first, last = date(year, month, 1), date(year, month, monthrange(year, month)[1])
    rows = db.execute(
        select(Appointment.scheduled_date, func.count())
        .where(
            Appointment.scheduled_date.between(first, last),
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        .group_by(Appointment.scheduled_date)
        .order_by(Appointment.scheduled_date)
    )
    return [CalendarDay(date=day, appointment_count=count) for day, count in rows]


def create(db: Session, data: AppointmentCreate, actor: User) -> Appointment:
    patient = get_or_404(db, Patient, data.patient_id, "Patient")
    if patient.is_archived:
        raise AppError("This patient record is archived")
    if data.scheduled_date < clinic_today():
        raise AppError("An appointment cannot be booked in the past")
    appointment = Appointment(
        **data.model_dump(), status=AppointmentStatus.PENDING, created_by_id=actor.id
    )
    appointment.reason = data.reason.strip()
    _ensure_no_overlap(db, appointment)
    if has_permission(actor.role, Permission.APPOINTMENTS_DECIDE):
        appointment.status = AppointmentStatus.CONFIRMED
        appointment.decided_by = actor
        appointment.decided_at = utcnow()
    db.add(appointment)
    db.flush()
    if appointment.status == AppointmentStatus.PENDING:
        notifications.notify(
            db,
            NotificationType.APPOINTMENT_PENDING,
            f"Appointment awaiting confirmation: {patient.full_name}",
            f"{_when(appointment)} · {appointment.reason}",
            audience_role=Role.COORDINATOR,
            entity_type="appointment",
            entity_id=appointment.id,
        )
    audit.record(db, actor, "appointment.create", "appointment", appointment.id,
                 patient_id=patient.id)
    db.commit()
    return appointment


def update(db: Session, appointment_id: int, data: AppointmentUpdate, actor: User) -> Appointment:
    appointment = _get(db, appointment_id)
    if appointment.status not in OPEN_STATUSES:
        raise ConflictError(f"A {appointment.status.value} appointment cannot be changed")
    changed = apply_updates(
        appointment,
        data.model_dump(exclude_unset=True),
        required={"scheduled_date", "start_time", "end_time", "reason"},
    )
    if appointment.end_time <= appointment.start_time:
        raise AppError("end_time must be after start_time")

    rescheduled = bool({"scheduled_date", "start_time", "end_time"} & set(changed))
    if rescheduled:
        if appointment.scheduled_date < clinic_today():
            raise AppError("An appointment cannot be moved to a past date")
        _ensure_no_overlap(db, appointment)
        is_decider = has_permission(actor.role, Permission.APPOINTMENTS_DECIDE)
        if appointment.status == AppointmentStatus.CONFIRMED and not is_decider:
            appointment.status = AppointmentStatus.PENDING
            appointment.decided_by = None
            appointment.decided_at = None
            notifications.notify(
                db,
                NotificationType.APPOINTMENT_PENDING,
                f"Rescheduled appointment awaiting confirmation: {appointment.patient.full_name}",
                f"{_when(appointment)} · {appointment.reason}",
                audience_role=Role.COORDINATOR,
                entity_type="appointment",
                entity_id=appointment.id,
            )
    if changed:
        audit.record(db, actor, "appointment.update", "appointment", appointment.id,
                     fields=changed)
    db.commit()
    return appointment


def confirm(db: Session, appointment_id: int, actor: User) -> Appointment:
    appointment = _get(db, appointment_id)
    if appointment.status != AppointmentStatus.PENDING:
        raise ConflictError(f"Only a pending appointment can be confirmed "
                            f"(this one is {appointment.status.value})")
    appointment.status = AppointmentStatus.CONFIRMED
    appointment.decided_by = actor
    appointment.decided_at = utcnow()
    notifications.notify(
        db,
        NotificationType.APPOINTMENT_DECIDED,
        f"Appointment confirmed: {appointment.patient.full_name}",
        _when(appointment),
        audience_role=Role.CLINIC_STAFF,
        entity_type="appointment",
        entity_id=appointment.id,
    )
    audit.record(db, actor, "appointment.confirm", "appointment", appointment.id)
    db.commit()
    return appointment


def cancel(
    db: Session, appointment_id: int, data: AppointmentCancel, actor: User
) -> Appointment:
    appointment = _get(db, appointment_id)
    if appointment.status not in OPEN_STATUSES:
        raise ConflictError(f"A {appointment.status.value} appointment cannot be cancelled")
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancellation_reason = data.reason
    appointment.decided_by = actor
    appointment.decided_at = utcnow()
    notifications.notify(
        db,
        NotificationType.APPOINTMENT_DECIDED,
        f"Appointment cancelled: {appointment.patient.full_name}",
        data.reason or _when(appointment),
        audience_role=Role.CLINIC_STAFF,
        entity_type="appointment",
        entity_id=appointment.id,
    )
    audit.record(db, actor, "appointment.cancel", "appointment", appointment.id,
                 reason=data.reason)
    db.commit()
    return appointment


def mark_no_show(db: Session, appointment_id: int, actor: User) -> Appointment:
    appointment = _get(db, appointment_id)
    if appointment.status != AppointmentStatus.CONFIRMED:
        raise ConflictError("Only a confirmed appointment can be marked as a no-show")
    if appointment.scheduled_date > clinic_today():
        raise AppError("An upcoming appointment cannot be a no-show yet")
    appointment.status = AppointmentStatus.NO_SHOW
    audit.record(db, actor, "appointment.no_show", "appointment", appointment.id)
    db.commit()
    return appointment


def check_in(
    db: Session, appointment_id: int, data: AppointmentCheckIn, actor: User
) -> Visit:
    appointment = _get(db, appointment_id)
    if appointment.status == AppointmentStatus.PENDING:
        raise ConflictError(
            "This appointment is still pending. The coordinator must confirm it first, "
            "or check the patient in as a walk-in."
        )
    if appointment.status != AppointmentStatus.CONFIRMED:
        raise ConflictError(f"A {appointment.status.value} appointment cannot be checked in")
    if appointment.scheduled_date != clinic_today():
        raise AppError("Only today's appointments can be checked in")
    return visits.check_in(
        db,
        CheckIn(
            patient_id=appointment.patient_id,
            complaint=data.complaint or appointment.reason,
            visit_type=VisitType.CONSULTATION,
        ),
        actor,
        appointment=appointment,
    )
