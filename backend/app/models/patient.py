# ORM model for the patient record with demographics and medical background.

from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.clock import clinic_today, utcnow
from app.db.base import Base, UTCDateTime
from app.models.enums import PatientType, Sex, enum_type


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_type: Mapped[PatientType] = mapped_column(enum_type(PatientType), index=True)
    id_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    last_name: Mapped[str] = mapped_column(String(80), index=True)
    first_name: Mapped[str] = mapped_column(String(80))
    middle_name: Mapped[str | None] = mapped_column(String(80))
    birth_date: Mapped[date | None] = mapped_column(Date)
    sex: Mapped[Sex | None] = mapped_column(enum_type(Sex))
    department: Mapped[str | None] = mapped_column(String(120), index=True)
    program_or_position: Mapped[str | None] = mapped_column(String(120))
    contact_number: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(String(255))

    guardian_name: Mapped[str | None] = mapped_column(String(120))
    guardian_relationship: Mapped[str | None] = mapped_column(String(50))
    guardian_contact: Mapped[str | None] = mapped_column(String(30))

    blood_type: Mapped[str | None] = mapped_column(String(5))
    allergies: Mapped[str | None] = mapped_column(Text)
    medical_conditions: Mapped[str | None] = mapped_column(Text)
    medication_restrictions: Mapped[str | None] = mapped_column(Text)
    activity_restrictions: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    consent_on_file: Mapped[bool] = mapped_column(Boolean, default=False)

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    @property
    def full_name(self) -> str:
        return f"{self.last_name}, {self.first_name}"

    @property
    def age(self) -> int | None:
        if self.birth_date is None:
            return None
        today = clinic_today()
        had_birthday = (today.month, today.day) >= (self.birth_date.month, self.birth_date.day)
        return today.year - self.birth_date.year - (0 if had_birthday else 1)
