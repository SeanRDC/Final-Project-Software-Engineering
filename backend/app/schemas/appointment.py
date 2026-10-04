# Request and response schemas for appointments.

from datetime import date, datetime, time
from typing import Self

from pydantic import BaseModel, Field, model_validator

from app.models.enums import AppointmentStatus
from app.schemas.common import OptionalText, ORMModel
from app.schemas.patient import PatientSummary


class AppointmentCreate(BaseModel):
    patient_id: int
    scheduled_date: date
    start_time: time
    end_time: time
    reason: str = Field(min_length=1, max_length=255)
    notes: OptionalText = None

    @model_validator(mode="after")
    def _end_after_start(self) -> Self:
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class AppointmentUpdate(BaseModel):
    scheduled_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    reason: str | None = Field(default=None, min_length=1, max_length=255)
    notes: OptionalText = None


class AppointmentCancel(BaseModel):
    reason: OptionalText = Field(default=None, max_length=255)


class AppointmentOut(ORMModel):
    id: int
    patient: PatientSummary
    scheduled_date: date
    start_time: time
    end_time: time
    reason: str
    notes: str | None
    status: AppointmentStatus
    decided_by_name: str | None
    decided_at: datetime | None
    cancellation_reason: str | None
    created_at: datetime


class CalendarDay(BaseModel):
    date: date
    appointment_count: int
