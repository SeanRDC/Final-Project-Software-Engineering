# ORM model for scheduled clinic appointments.

from datetime import date, datetime, time

from sqlalchemy import Date, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import utcnow
from app.db.base import Base, UTCDateTime
from app.models.enums import AppointmentStatus, enum_type
from app.models.patient import Patient
from app.models.user import User


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    scheduled_date: Mapped[date] = mapped_column(Date, index=True)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    reason: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[AppointmentStatus] = mapped_column(
        enum_type(AppointmentStatus), default=AppointmentStatus.PENDING, index=True
    )

    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255))

    patient: Mapped[Patient] = relationship(lazy="joined")
    decided_by: Mapped[User | None] = relationship(foreign_keys=[decided_by_id], lazy="joined")

    @property
    def decided_by_name(self) -> str | None:
        return self.decided_by.full_name if self.decided_by else None
