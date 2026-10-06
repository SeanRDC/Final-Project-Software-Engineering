# ORM models for a clinic visit, the medicines given during it and its monitoring readings.

from datetime import date, datetime

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import utcnow
from app.db.base import Base, UTCDateTime
from app.models.enums import VisitDisposition, VisitStatus, VisitType, enum_type
from app.models.patient import Patient
from app.models.user import User


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"))

    visit_date: Mapped[date] = mapped_column(Date, index=True)

    status: Mapped[VisitStatus] = mapped_column(
        enum_type(VisitStatus), default=VisitStatus.OPEN, index=True
    )
    visit_type: Mapped[VisitType] = mapped_column(
        enum_type(VisitType), default=VisitType.CONSULTATION
    )
    complaint: Mapped[str] = mapped_column(Text)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    temperature_c: Mapped[float | None] = mapped_column(Float)
    bp_systolic: Mapped[int | None] = mapped_column(Integer)
    bp_diastolic: Mapped[int | None] = mapped_column(Integer)
    pulse_rate: Mapped[int | None] = mapped_column(Integer)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer)
    oxygen_saturation: Mapped[int | None] = mapped_column(Integer)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    height_cm: Mapped[float | None] = mapped_column(Float)

    assessment: Mapped[str | None] = mapped_column(Text)
    treatment: Mapped[str | None] = mapped_column(Text)
    remarks: Mapped[str | None] = mapped_column(Text)
    guardian_notified: Mapped[bool] = mapped_column(Boolean, default=False)
    referred: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_details: Mapped[str | None] = mapped_column(Text)
    disposition: Mapped[VisitDisposition | None] = mapped_column(enum_type(VisitDisposition))

    consultation_notes: Mapped[str | None] = mapped_column(Text)
    diagnosis: Mapped[str | None] = mapped_column(Text)
    medication_details: Mapped[str | None] = mapped_column(Text)

    checked_in_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    cancelled_reason: Mapped[str | None] = mapped_column(String(255))

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    patient: Mapped[Patient] = relationship(lazy="joined")
    doctor: Mapped[User | None] = relationship(foreign_keys=[doctor_id], lazy="joined")
    medicines: Mapped[list["VisitMedicine"]] = relationship(
        back_populates="visit", order_by="VisitMedicine.id", lazy="selectin"
    )

    vital_readings: Mapped[list["VisitVitalReading"]] = relationship(
        back_populates="visit", order_by="VisitVitalReading.id", lazy="selectin"
    )

    @property
    def doctor_name(self) -> str | None:
        return self.doctor.full_name if self.doctor else None

    @property
    def patient_alerts(self) -> Patient:
        return self.patient


class VisitMedicine(Base):
    __tablename__ = "visit_medicines"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("visits.id"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    instructions: Mapped[str | None] = mapped_column(String(255))
    dispensed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    dispensed_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    visit: Mapped[Visit] = relationship(back_populates="medicines")
    medicine: Mapped["Medicine"] = relationship(lazy="joined")
    dispensed_by: Mapped[User | None] = relationship(lazy="joined")

    @property
    def medicine_name(self) -> str:
        return self.medicine.display_name

    @property
    def dispensed_by_name(self) -> str | None:
        return self.dispensed_by.full_name if self.dispensed_by else None


class VisitVitalReading(Base):
    """Vital signs taken again while a patient is kept for monitoring."""

    __tablename__ = "visit_vital_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_id: Mapped[int] = mapped_column(ForeignKey("visits.id"), index=True)
    taken_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    temperature_c: Mapped[float | None] = mapped_column(Float)
    bp_systolic: Mapped[int | None] = mapped_column(Integer)
    bp_diastolic: Mapped[int | None] = mapped_column(Integer)
    pulse_rate: Mapped[int | None] = mapped_column(Integer)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer)
    oxygen_saturation: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(String(255))
    recorded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    visit: Mapped[Visit] = relationship(back_populates="vital_readings")
    recorded_by: Mapped[User | None] = relationship(lazy="joined")

    @property
    def recorded_by_name(self) -> str | None:
        return self.recorded_by.full_name if self.recorded_by else None
