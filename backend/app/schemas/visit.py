# Request and response schemas for visits, consultations and medicine releases.

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import VisitDisposition, VisitStatus, VisitType
from app.schemas.common import OptionalText, ORMModel
from app.schemas.patient import PatientAlerts, PatientSummary


class CheckIn(BaseModel):
    patient_id: int
    complaint: str = Field(min_length=1)
    visit_type: VisitType = VisitType.CONSULTATION


class AppointmentCheckIn(BaseModel):
    complaint: OptionalText = None


class VisitRecordUpdate(BaseModel):
    complaint: str | None = Field(default=None, min_length=1)
    visit_type: VisitType | None = None
    temperature_c: float | None = Field(default=None, ge=30, le=45)
    bp_systolic: int | None = Field(default=None, ge=40, le=300)
    bp_diastolic: int | None = Field(default=None, ge=20, le=200)
    pulse_rate: int | None = Field(default=None, ge=20, le=250)
    respiratory_rate: int | None = Field(default=None, ge=5, le=80)
    oxygen_saturation: int | None = Field(default=None, ge=50, le=100)
    weight_kg: float | None = Field(default=None, gt=0, le=400)
    height_cm: float | None = Field(default=None, gt=0, le=260)
    assessment: OptionalText = None
    treatment: OptionalText = None
    remarks: OptionalText = None
    guardian_notified: bool | None = None
    referred: bool | None = None
    referral_details: OptionalText = None
    disposition: VisitDisposition | None = None


class ConsultationUpdate(BaseModel):
    consultation_notes: OptionalText = None
    diagnosis: OptionalText = None
    medication_details: OptionalText = None
    referred: bool | None = None
    referral_details: OptionalText = None
    disposition: VisitDisposition | None = None


class CompleteVisit(BaseModel):
    disposition: VisitDisposition | None = None


class CancelVisit(BaseModel):
    reason: OptionalText = Field(default=None, max_length=255)


class DispenseMedicine(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0, le=1000)
    instructions: OptionalText = Field(default=None, max_length=255)


class VisitMedicineOut(ORMModel):
    id: int
    medicine_id: int
    medicine_name: str
    quantity: int
    instructions: str | None
    dispensed_by_name: str | None
    dispensed_at: datetime


class VisitSummary(ORMModel):
    id: int
    visit_date: date
    status: VisitStatus
    visit_type: VisitType
    complaint: str
    doctor_id: int | None
    doctor_name: str | None
    checked_in_at: datetime
    completed_at: datetime | None
    patient: PatientSummary


class VisitListItem(VisitSummary):
    assessment: str | None
    treatment: str | None
    diagnosis: str | None
    disposition: VisitDisposition | None
    medicines: list[VisitMedicineOut]


class LockInfo(ORMModel):
    resource_type: str
    resource_id: int
    locked_by_id: int
    locked_by_name: str
    locked_at: datetime
    expires_at: datetime


class VisitOut(VisitListItem):
    appointment_id: int | None
    temperature_c: float | None
    bp_systolic: int | None
    bp_diastolic: int | None
    pulse_rate: int | None
    respiratory_rate: int | None
    oxygen_saturation: int | None
    weight_kg: float | None
    height_cm: float | None
    remarks: str | None
    guardian_notified: bool
    referred: bool
    referral_details: str | None
    consultation_notes: str | None
    medication_details: str | None
    cancelled_reason: str | None
    updated_at: datetime
    patient_alerts: PatientAlerts
    lock: LockInfo | None = None
