# Request and response schemas for patient records.

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import PatientType, Sex
from app.schemas.common import OptionalText, ORMModel


class PatientBase(BaseModel):
    middle_name: OptionalText = Field(default=None, max_length=80)
    birth_date: date | None = None
    sex: Sex | None = None
    department: OptionalText = Field(default=None, max_length=120)
    program_or_position: OptionalText = Field(default=None, max_length=120)
    contact_number: OptionalText = Field(default=None, max_length=30)
    email: OptionalText = Field(default=None, max_length=120)
    address: OptionalText = Field(default=None, max_length=255)
    guardian_name: OptionalText = Field(default=None, max_length=120)
    guardian_relationship: OptionalText = Field(default=None, max_length=50)
    guardian_contact: OptionalText = Field(default=None, max_length=30)
    blood_type: OptionalText = Field(default=None, max_length=5)
    allergies: OptionalText = None
    medical_conditions: OptionalText = None
    medication_restrictions: OptionalText = None
    activity_restrictions: OptionalText = None
    notes: OptionalText = None


class PatientCreate(PatientBase):
    patient_type: PatientType
    id_number: str = Field(min_length=1, max_length=30)
    last_name: str = Field(min_length=1, max_length=80)
    first_name: str = Field(min_length=1, max_length=80)
    consent_on_file: bool = False


class PatientUpdate(PatientBase):
    patient_type: PatientType | None = None
    id_number: str | None = Field(default=None, min_length=1, max_length=30)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    consent_on_file: bool | None = None


class PatientSummary(ORMModel):
    id: int
    patient_type: PatientType
    id_number: str
    last_name: str
    first_name: str
    middle_name: str | None
    full_name: str
    age: int | None
    sex: Sex | None
    department: str | None
    is_archived: bool


class PatientAlerts(ORMModel):
    allergies: str | None
    medical_conditions: str | None
    medication_restrictions: str | None
    activity_restrictions: str | None


class PatientOut(PatientSummary, PatientAlerts):
    birth_date: date | None
    program_or_position: str | None
    contact_number: str | None
    email: str | None
    address: str | None
    guardian_name: str | None
    guardian_relationship: str | None
    guardian_contact: str | None
    blood_type: str | None
    notes: str | None
    consent_on_file: bool
    created_at: datetime
    updated_at: datetime


class PatientDetail(PatientOut):
    visit_count: int
    last_visit_date: date | None
