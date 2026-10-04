# API routes for booking, rescheduling, approving and checking in appointments.

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import Authorized, DbSession, PageNumber, PageSize
from app.core.clock import clinic_today
from app.core.events import broadcaster
from app.core.permissions import Permission
from app.models.enums import AppointmentStatus
from app.schemas.appointment import (
    AppointmentCancel,
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
    CalendarDay,
)
from app.schemas.common import Page
from app.schemas.visit import AppointmentCheckIn, VisitOut
from app.services import appointments, visits

router = APIRouter(prefix="/appointments", tags=["Appointments"])

Reader = Authorized(Permission.APPOINTMENTS_READ)
Writer = Authorized(Permission.APPOINTMENTS_WRITE)
Decider = Authorized(Permission.APPOINTMENTS_DECIDE)


def _changed(appointment_id: int) -> None:
    broadcaster.publish("appointments.updated", appointment_id=appointment_id)
    broadcaster.publish("notifications.updated")


@router.get("", response_model=Page[AppointmentOut], summary="List appointments (FR-07)")
def list_appointments(
    db: DbSession,
    _: Reader,
    start: date | None = None,
    end: date | None = None,
    status_: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
    patient_id: int | None = None,
    page: PageNumber = 1,
    page_size: PageSize = 50,
):
    items, total = appointments.list_appointments(
        db, start=start, end=end, status=status_, patient_id=patient_id,
        page=page, page_size=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/today", response_model=list[AppointmentOut], summary="Event(s) for a day")
def for_day(db: DbSession, _: Reader, day: date | None = None):
    return appointments.for_day(db, day)


@router.get("/calendar", response_model=list[CalendarDay],
            summary="Days of a month that have appointments")
def calendar(
    db: DbSession,
    _: Reader,
    year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
):
    today = clinic_today()
    return appointments.calendar(db, year or today.year, month or today.month)


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED,
             summary="Book an appointment (starts as pending)")
def create(data: AppointmentCreate, db: DbSession, actor: Writer):
    appointment = appointments.create(db, data, actor)
    _changed(appointment.id)
    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentOut,
              summary="Reschedule or edit an appointment")
def update(appointment_id: int, data: AppointmentUpdate, db: DbSession, actor: Writer):
    appointment = appointments.update(db, appointment_id, data, actor)
    _changed(appointment.id)
    return appointment


@router.post("/{appointment_id}/confirm", response_model=AppointmentOut,
             summary="Approve a pending appointment (coordinator)")
def confirm(appointment_id: int, db: DbSession, actor: Decider):
    appointment = appointments.confirm(db, appointment_id, actor)
    _changed(appointment.id)
    return appointment


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut,
             summary="Cancel an appointment (coordinator)")
def cancel(
    appointment_id: int, db: DbSession, actor: Decider, data: AppointmentCancel | None = None
):
    appointment = appointments.cancel(db, appointment_id, data or AppointmentCancel(), actor)
    _changed(appointment.id)
    return appointment


@router.post("/{appointment_id}/no-show", response_model=AppointmentOut)
def no_show(appointment_id: int, db: DbSession, actor: Writer):
    appointment = appointments.mark_no_show(db, appointment_id, actor)
    _changed(appointment.id)
    return appointment


@router.post("/{appointment_id}/check-in", response_model=VisitOut,
             status_code=status.HTTP_201_CREATED,
             summary="The patient arrived: open a visit for the appointment")
def check_in(
    appointment_id: int,
    db: DbSession,
    actor: Authorized(Permission.VISITS_RECORD),
    data: AppointmentCheckIn | None = None,
):
    visit = appointments.check_in(db, appointment_id, data or AppointmentCheckIn(), actor)
    broadcaster.publish("visits.updated", visit_id=visit.id, status=visit.status.value)
    _changed(appointment_id)
    return visits.to_out(db, visit)
