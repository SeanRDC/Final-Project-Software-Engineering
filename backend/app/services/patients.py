# Business logic for patient records, search, medical history and archiving.

from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.departments import BASIC_EDUCATION_PREFIX, HAU_DEPARTMENTS
from app.core.exceptions import AppError, ConflictError
from app.models import Patient, User, Visit
from app.models.enums import EducationLevel, PatientType, VisitStatus
from app.schemas.patient import PatientCreate, PatientDetail, PatientOut, PatientUpdate
from app.services import audit, locks
from app.services.common import apply_updates, get_or_404, like_pattern, paginate

REQUIRED_FIELDS = {"patient_type", "id_number", "last_name", "first_name", "consent_on_file"}


def _ensure_unique_id_number(db: Session, id_number: str, exclude_id: int | None = None) -> None:
    query = select(Patient.id).where(func.lower(Patient.id_number) == id_number.lower())
    if exclude_id is not None:
        query = query.where(Patient.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError(f"A patient with ID number '{id_number}' already exists")


def _assign_others_id_number(db: Session, patient: Patient) -> None:
    """An Others patient registered without a number gets OTH-000123 from its record id."""
    base = f"OTH-{patient.id:06d}"
    candidate, attempt = base, 1
    while db.scalar(select(Patient.id).where(func.lower(Patient.id_number) == candidate.lower())):
        attempt += 1
        candidate = f"{base}-{attempt}"
    patient.id_number = candidate


def _settle_type_fields(patient: Patient) -> None:
    """Only Others patients carry a description, and they must have one."""
    if patient.patient_type != PatientType.OTHER:
        patient.other_description = None
    elif not patient.other_description:
        raise AppError("Describe who an Others patient is, e.g. a visitor or contractor")


def _settle_education_level(patient: Patient) -> None:
    """Only students have a level. One left blank is read off the department."""
    if patient.patient_type != PatientType.STUDENT:
        patient.education_level = None
    elif patient.education_level is None:
        in_basic_education = (patient.department or "").lower().startswith(BASIC_EDUCATION_PREFIX)
        patient.education_level = (
            EducationLevel.BASIC_EDUCATION if in_basic_education else EducationLevel.COLLEGE
        )


def search(
    db: Session,
    *,
    q: str | None = None,
    department: str | None = None,
    patient_type: PatientType | None = None,
    include_archived: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Patient], int]:
    query = select(Patient).order_by(Patient.last_name, Patient.first_name, Patient.id)
    if not include_archived:
        query = query.where(Patient.is_archived.is_(False))
    if patient_type:
        query = query.where(Patient.patient_type == patient_type)
    if department:
        query = query.where(Patient.department.ilike(like_pattern(department.strip()), escape="\\"))
    for term in (q or "").replace(",", " ").split():
        pattern = like_pattern(term)
        query = query.where(
            or_(
                Patient.id_number.ilike(pattern, escape="\\"),
                Patient.last_name.ilike(pattern, escape="\\"),
                Patient.first_name.ilike(pattern, escape="\\"),
                Patient.department.ilike(pattern, escape="\\"),
            )
        )
    return paginate(db, query, page, page_size)


def list_departments(db: Session) -> list[str]:
    in_use = db.scalars(
        select(Patient.department)
        .where(Patient.department.is_not(None))
        .distinct()
        .order_by(Patient.department)
    )
    # The university's schools first, then whatever else is on record (offices of employees).
    official = {name.lower() for name in HAU_DEPARTMENTS}
    return [*HAU_DEPARTMENTS, *(name for name in in_use if name.lower() not in official)]


def create(db: Session, data: PatientCreate, actor: User) -> Patient:
    id_number = data.id_number.strip() if data.id_number else None
    if id_number:
        _ensure_unique_id_number(db, id_number)
    values = data.model_dump()
    values.update(
        # A placeholder until the record has an id to number it from.
        id_number=id_number or f"pending-{uuid4().hex[:20]}",
        last_name=data.last_name.strip(),
        first_name=data.first_name.strip(),
        created_by_id=actor.id,
    )
    patient = Patient(**values)
    _settle_type_fields(patient)
    _settle_education_level(patient)
    db.add(patient)
    db.flush()
    if not id_number:
        _assign_others_id_number(db, patient)
    audit.record(db, actor, "patient.create", "patient", patient.id, id_number=patient.id_number)
    db.commit()
    return patient


def get_detail(db: Session, patient_id: int, actor: User) -> PatientDetail:
    patient = get_or_404(db, Patient, patient_id, "Patient")
    visit_count, last_visit_date = db.execute(
        select(func.count(Visit.id), func.max(Visit.visit_date)).where(
            Visit.patient_id == patient_id, Visit.status != VisitStatus.CANCELLED
        )
    ).one()
    audit.record(db, actor, "patient.view", "patient", patient.id)
    db.commit()
    return PatientDetail(
        **PatientOut.model_validate(patient).model_dump(),
        visit_count=visit_count,
        last_visit_date=last_visit_date,
    )


def update(db: Session, patient_id: int, data: PatientUpdate, actor: User) -> Patient:
    patient = get_or_404(db, Patient, patient_id, "Patient")
    locks.ensure_editable(db, "patient", patient_id, actor)
    changes = data.model_dump(exclude_unset=True)
    for name in ("id_number", "last_name", "first_name"):
        if changes.get(name):
            changes[name] = changes[name].strip()
    if changes.get("id_number"):
        _ensure_unique_id_number(db, changes["id_number"], exclude_id=patient_id)
    level_before, description_before = patient.education_level, patient.other_description
    changed = apply_updates(patient, changes, required=REQUIRED_FIELDS)
    _settle_type_fields(patient)
    _settle_education_level(patient)
    if patient.education_level != level_before and "education_level" not in changed:
        changed.append("education_level")
    if patient.other_description != description_before and "other_description" not in changed:
        changed.append("other_description")
    if changed:
        audit.record(db, actor, "patient.update", "patient", patient.id, fields=changed)
    db.commit()
    return patient


def set_archived(db: Session, patient_id: int, archived: bool, actor: User) -> Patient:
    patient = get_or_404(db, Patient, patient_id, "Patient")
    if patient.is_archived != archived:
        patient.is_archived = archived
        action = "patient.archive" if archived else "patient.restore"
        audit.record(db, actor, action, "patient", patient.id)
    db.commit()
    return patient
