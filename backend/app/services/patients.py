# Business logic for patient records, search, medical history and archiving.

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.models import Patient, User, Visit
from app.models.enums import PatientType, VisitStatus
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
    return list(
        db.scalars(
            select(Patient.department)
            .where(Patient.department.is_not(None))
            .distinct()
            .order_by(Patient.department)
        )
    )


def create(db: Session, data: PatientCreate, actor: User) -> Patient:
    id_number = data.id_number.strip()
    _ensure_unique_id_number(db, id_number)
    values = data.model_dump()
    values.update(
        id_number=id_number,
        last_name=data.last_name.strip(),
        first_name=data.first_name.strip(),
        created_by_id=actor.id,
    )
    patient = Patient(**values)
    db.add(patient)
    db.flush()
    audit.record(db, actor, "patient.create", "patient", patient.id, id_number=id_number)
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
    changed = apply_updates(patient, changes, required=REQUIRED_FIELDS)
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
