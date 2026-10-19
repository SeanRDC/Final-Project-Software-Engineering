# Request and response schemas for medical kits, their standard contents and each loan.

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.models.enums import MedkitRequestStatus, MedkitStatus
from app.schemas.common import OptionalText, ORMModel

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class MedkitCreate(BaseModel):
    kit_number: int = Field(ge=1, le=9999)
    label: OptionalText = Field(default=None, max_length=80)


class MedkitUpdate(BaseModel):
    label: OptionalText = Field(default=None, max_length=80)
    is_active: bool | None = None
    # Only a lost kit that has been replaced is put back by hand.
    status: Literal[MedkitStatus.AVAILABLE] | None = None


class MedkitBrief(ORMModel):
    id: int
    kit_number: int
    label: str | None


class MedkitLoan(ORMModel):
    """The request a kit is currently out on."""

    id: int
    organization: str
    activity: str
    activity_date: date
    person_responsible: str
    issued_at: datetime | None
    is_overdue: bool


class MedkitOut(MedkitBrief):
    status: MedkitStatus
    is_active: bool
    current_request: MedkitLoan | None = None


class TemplateItemIn(BaseModel):
    medicine_id: int
    default_quantity: int = Field(ge=1, le=10000)


class TemplateItemOut(ORMModel):
    medicine_id: int
    medicine_name: str
    unit: str
    default_quantity: int
    quantity_on_hand: int


class MedkitRequestCreate(BaseModel):
    organization: Annotated[Text, Field(max_length=150)]
    activity: Annotated[Text, Field(max_length=150)]
    activity_date: date
    venue: OptionalText = Field(default=None, max_length=150)
    person_responsible: Annotated[Text, Field(max_length=120)]
    contact_number: OptionalText = Field(default=None, max_length=30)
    requested_by: Annotated[Text, Field(max_length=120)]
    request_date: date
    notes: OptionalText = None


class IssueLine(BaseModel):
    medicine_id: int
    quantity: int = Field(ge=1, le=10000)


class MedkitIssue(BaseModel):
    medkit_id: int
    items: list[IssueLine] = Field(min_length=1)


class ReturnLine(BaseModel):
    item_id: int
    quantity_returned: int = Field(ge=0)


class MedkitReturn(BaseModel):
    items: list[ReturnLine]
    notes: OptionalText = None


class MedkitClose(BaseModel):
    notes: OptionalText = None


class MedkitRequestItemOut(ORMModel):
    id: int
    medicine_id: int
    medicine_name: str
    unit: str
    quantity_issued: int
    quantity_returned: int | None
    quantity_used: int | None


class MedkitRequestSummary(ORMModel):
    id: int
    organization: str
    activity: str
    activity_date: date
    venue: str | None
    person_responsible: str
    status: MedkitRequestStatus
    is_overdue: bool
    medkit: MedkitBrief | None
    created_at: datetime
    issued_at: datetime | None


class MedkitRequestOut(MedkitRequestSummary):
    contact_number: str | None
    requested_by: str
    request_date: date
    notes: str | None
    issued_by_name: str | None
    closed_at: datetime | None
    closed_by_name: str | None
    items: list[MedkitRequestItemOut]
