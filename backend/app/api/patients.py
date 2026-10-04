# API routes for patient records, search, visit history and attachments.

from datetime import date
from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile, status

from app.api.deps import Authorized, DbSession, PageNumber, PageSize
from app.core.permissions import Permission
from app.models.enums import PatientType
from app.schemas.common import Page
from app.schemas.patient import (
    PatientCreate,
    PatientDetail,
    PatientOut,
    PatientSummary,
    PatientUpdate,
)
from app.schemas.support import AttachmentOut
from app.schemas.visit import VisitListItem
from app.services import attachments, patients, visits
from app.services.common import get_or_404
from app.models import Patient

router = APIRouter(prefix="/patients", tags=["Patients"])

Reader = Authorized(Permission.PATIENTS_READ)
Writer = Authorized(Permission.PATIENTS_WRITE)


@router.get(
    "",
    response_model=Page[PatientSummary],
    summary="Search patients by student/employee number, name or department (FR-03)",
)
def search_patients(
    db: DbSession,
    _: Reader,
    q: str | None = None,
    department: str | None = None,
    patient_type: PatientType | None = None,
    include_archived: bool = False,
    page: PageNumber = 1,
    page_size: PageSize = 20,
):
    items, total = patients.search(
        db, q=q, department=department, patient_type=patient_type,
        include_archived=include_archived, page=page, page_size=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED,
             summary="Register a new patient (FR-02)")
def create_patient(data: PatientCreate, db: DbSession, actor: Writer):
    return patients.create(db, data, actor)


@router.get("/{patient_id}", response_model=PatientDetail,
            summary="Patient record with medical history and alerts (FR-04)")
def get_patient(patient_id: int, db: DbSession, actor: Reader):
    return patients.get_detail(db, patient_id, actor)


@router.patch("/{patient_id}", response_model=PatientOut,
              summary="Update or correct a patient record (FR-10)")
def update_patient(patient_id: int, data: PatientUpdate, db: DbSession, actor: Writer):
    return patients.update(db, patient_id, data, actor)


@router.post("/{patient_id}/archive", response_model=PatientOut,
             summary="Hide a record from search (coordinator)")
def archive_patient(
    patient_id: int, db: DbSession, actor: Authorized(Permission.PATIENTS_ARCHIVE)
):
    return patients.set_archived(db, patient_id, True, actor)


@router.post("/{patient_id}/restore", response_model=PatientOut)
def restore_patient(
    patient_id: int, db: DbSession, actor: Authorized(Permission.PATIENTS_ARCHIVE)
):
    return patients.set_archived(db, patient_id, False, actor)


@router.get("/{patient_id}/visits", response_model=Page[VisitListItem],
            summary="Chronological visit history, newest first (FR-06)")
def patient_visits(
    patient_id: int,
    db: DbSession,
    _: Authorized(Permission.VISITS_READ),
    start: date | None = None,
    end: date | None = None,
    page: PageNumber = 1,
    page_size: PageSize = 20,
):
    get_or_404(db, Patient, patient_id, "Patient")
    items, total = visits.list_visits(
        db, patient_id=patient_id, start=start, end=end, page=page, page_size=page_size
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{patient_id}/attachments", response_model=list[AttachmentOut])
def list_attachments(
    patient_id: int,
    db: DbSession,
    _: Authorized(Permission.ATTACHMENTS_READ),
    visit_id: int | None = None,
):
    return attachments.list_for_patient(db, patient_id, visit_id)


@router.post("/{patient_id}/attachments", response_model=AttachmentOut,
             status_code=status.HTTP_201_CREATED,
             summary="Upload a lab result or scanned form")
def upload_attachment(
    patient_id: int,
    db: DbSession,
    actor: Authorized(Permission.ATTACHMENTS_WRITE),
    file: Annotated[UploadFile, File()],
    visit_id: Annotated[int | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
):
    return attachments.save(
        db, patient_id, file, actor, visit_id=visit_id, description=description
    )
