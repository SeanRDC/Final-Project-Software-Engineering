# Business logic for storing, downloading and deleting files attached to patient records.

import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.models import Attachment, Patient, User, Visit
from app.services import audit
from app.services.common import get_or_404

ALLOWED_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
}
_CHUNK = 1024 * 1024


def file_path(attachment: Attachment) -> Path:
    return settings.upload_dir / attachment.stored_filename


def list_for_patient(db: Session, patient_id: int, visit_id: int | None = None) -> list[Attachment]:
    get_or_404(db, Patient, patient_id, "Patient")
    query = (
        select(Attachment)
        .where(Attachment.patient_id == patient_id)
        .order_by(Attachment.created_at.desc())
    )
    if visit_id is not None:
        query = query.where(Attachment.visit_id == visit_id)
    return list(db.scalars(query).unique())


def save(
    db: Session,
    patient_id: int,
    upload: UploadFile,
    actor: User,
    *,
    visit_id: int | None = None,
    description: str | None = None,
) -> Attachment:
    get_or_404(db, Patient, patient_id, "Patient")
    if visit_id is not None:
        visit = get_or_404(db, Visit, visit_id, "Visit")
        if visit.patient_id != patient_id:
            raise AppError("That visit belongs to a different patient")

    original = Path(upload.filename or "").name
    extension = Path(original).suffix.lower()
    if extension not in ALLOWED_TYPES:
        allowed = ", ".join(sorted(ALLOWED_TYPES))
        raise AppError(f"File type '{extension or 'unknown'}' is not allowed. Allowed: {allowed}")

    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    destination = settings.upload_dir / stored_filename
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    try:
        with destination.open("wb") as out:
            while chunk := upload.file.read(_CHUNK):
                size += len(chunk)
                if size > limit:
                    raise AppError(f"The file is larger than {settings.MAX_UPLOAD_MB} MB")
                out.write(chunk)
        if size == 0:
            raise AppError("The file is empty")

        attachment = Attachment(
            patient_id=patient_id,
            visit_id=visit_id,
            original_filename=original[:255],
            stored_filename=stored_filename,
            content_type=ALLOWED_TYPES[extension],
            size_bytes=size,
            description=(description or "").strip()[:255] or None,
            uploaded_by_id=actor.id,
        )
        db.add(attachment)
        db.flush()
        audit.record(db, actor, "attachment.upload", "attachment", attachment.id,
                     patient_id=patient_id, filename=attachment.original_filename)
        db.commit()
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return attachment


def get_for_download(db: Session, attachment_id: int, actor: User) -> tuple[Attachment, Path]:
    attachment = get_or_404(db, Attachment, attachment_id, "Attachment")
    path = file_path(attachment)
    if not path.is_file():
        raise NotFoundError("The stored file for this attachment is missing")
    audit.record(db, actor, "attachment.download", "attachment", attachment.id,
                 patient_id=attachment.patient_id)
    db.commit()
    return attachment, path


def delete(db: Session, attachment_id: int, actor: User) -> None:
    attachment = get_or_404(db, Attachment, attachment_id, "Attachment")
    path = file_path(attachment)
    audit.record(db, actor, "attachment.delete", "attachment", attachment.id,
                 patient_id=attachment.patient_id, filename=attachment.original_filename)
    db.delete(attachment)
    db.commit()
    path.unlink(missing_ok=True)
