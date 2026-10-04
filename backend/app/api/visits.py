# API routes for checking in patients, recording visits and consultations, and releasing medicine.

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import Authorized, DbSession, PageNumber, PageSize
from app.core.events import broadcaster
from app.core.permissions import Permission
from app.models.enums import VisitStatus
from app.schemas.common import Page
from app.schemas.visit import (
    CancelVisit,
    CheckIn,
    CompleteVisit,
    ConsultationUpdate,
    DispenseMedicine,
    VisitListItem,
    VisitOut,
    VisitRecordUpdate,
    VisitSummary,
)
from app.services import visits

router = APIRouter(prefix="/visits", tags=["Visits"])

Reader = Authorized(Permission.VISITS_READ)
Recorder = Authorized(Permission.VISITS_RECORD)
Consultant = Authorized(Permission.VISITS_CONSULT)
RecorderOrConsultant = Authorized(Permission.VISITS_RECORD, Permission.VISITS_CONSULT)


def _visits_changed(visit) -> None:
    broadcaster.publish("visits.updated", visit_id=visit.id, status=visit.status.value)


@router.post("", response_model=VisitOut, status_code=status.HTTP_201_CREATED,
             summary="Check in a walk-in patient (the patient log, FR-08)")
def check_in(data: CheckIn, db: DbSession, actor: Recorder):
    visit = visits.check_in(db, data, actor)
    _visits_changed(visit)
    return visits.to_out(db, visit)


@router.get("", response_model=Page[VisitListItem], summary="List visits by date or status")
def list_visits(
    db: DbSession,
    _: Reader,
    status_: Annotated[VisitStatus | None, Query(alias="status")] = None,
    patient_id: int | None = None,
    start: date | None = None,
    end: date | None = None,
    include_cancelled: bool = False,
    page: PageNumber = 1,
    page_size: PageSize = 20,
):
    items, total = visits.list_visits(
        db, patient_id=patient_id, status=status_, start=start, end=end,
        include_cancelled=include_cancelled, page=page, page_size=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/today", response_model=list[VisitSummary],
            summary="A day's visit log: open visits first, then completed")
def for_day(db: DbSession, _: Reader, day: date | None = None):
    return visits.for_day(db, day)


@router.get("/{visit_id}", response_model=VisitOut,
            summary="Full visit record, including the nurse's assessment (FR-09)")
def get_visit(visit_id: int, db: DbSession, actor: Reader):
    return visits.to_out(db, visits.get(db, visit_id, actor))


@router.patch("/{visit_id}", response_model=VisitOut,
              summary="Record complaint, vital signs, assessment, treatment, remarks (FR-05)")
def update_record(visit_id: int, data: VisitRecordUpdate, db: DbSession, actor: Recorder):
    visit = visits.update_record(db, visit_id, data, actor)
    _visits_changed(visit)
    return visits.to_out(db, visit)


@router.patch("/{visit_id}/consultation", response_model=VisitOut,
              summary="Doctor's consultation notes and medication details")
def update_consultation(
    visit_id: int, data: ConsultationUpdate, db: DbSession, actor: Consultant
):
    visit = visits.update_consultation(db, visit_id, data, actor)
    _visits_changed(visit)
    return visits.to_out(db, visit)


@router.post("/{visit_id}/complete", response_model=VisitOut,
             summary="Finish the visit and commit it to the patient's history")
def complete(
    visit_id: int, db: DbSession, actor: RecorderOrConsultant, data: CompleteVisit | None = None
):
    visit = visits.complete(db, visit_id, data or CompleteVisit(), actor)
    _visits_changed(visit)
    broadcaster.publish("appointments.updated")
    return visits.to_out(db, visit)


@router.post("/{visit_id}/cancel", response_model=VisitOut)
def cancel(visit_id: int, db: DbSession, actor: Recorder, data: CancelVisit | None = None):
    visit = visits.cancel(db, visit_id, data or CancelVisit(), actor)
    _visits_changed(visit)
    broadcaster.publish("appointments.updated")
    return visits.to_out(db, visit)


@router.post("/{visit_id}/medicines", response_model=VisitOut,
             status_code=status.HTTP_201_CREATED,
             summary="Release medicine to the patient and deduct stock (FR-11)")
def dispense(
    visit_id: int,
    data: DispenseMedicine,
    db: DbSession,
    actor: Authorized(Permission.MEDICINES_DISPENSE),
):
    visit = visits.dispense(db, visit_id, data, actor)
    broadcaster.publish("inventory.updated", medicine_id=data.medicine_id)
    broadcaster.publish("notifications.updated")
    return visits.to_out(db, visit)


@router.delete("/{visit_id}/medicines/{visit_medicine_id}", response_model=VisitOut,
               summary="Remove a wrongly recorded release and return the stock (FR-10)")
def undo_dispense(
    visit_id: int,
    visit_medicine_id: int,
    db: DbSession,
    actor: Authorized(Permission.MEDICINES_DISPENSE),
):
    visit = visits.undo_dispense(db, visit_id, visit_medicine_id, actor)
    broadcaster.publish("inventory.updated")
    return visits.to_out(db, visit)
