# Request and response schemas for medicines and stock movements.

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import StockMovementType
from app.schemas.common import OptionalText, ORMModel


class MedicineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    strength: str = Field(default="", max_length=50)
    form: OptionalText = Field(default=None, max_length=50)
    unit: str = Field(default="pc", min_length=1, max_length=30)
    quantity_on_hand: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=20, ge=0)
    expiry_date: date | None = None


class MedicineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    strength: str | None = Field(default=None, max_length=50)
    form: OptionalText = Field(default=None, max_length=50)
    unit: str | None = Field(default=None, min_length=1, max_length=30)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    expiry_date: date | None = None
    is_active: bool | None = None


class MedicineOut(ORMModel):
    id: int
    name: str
    strength: str
    display_name: str
    form: str | None
    unit: str
    quantity_on_hand: int
    low_stock_threshold: int
    is_low_stock: bool
    expiry_date: date | None
    is_active: bool
    updated_at: datetime


class StockIn(BaseModel):
    quantity: int = Field(gt=0)
    reason: OptionalText = Field(default=None, max_length=255)


class StockAdjustment(BaseModel):
    new_quantity: int = Field(ge=0)
    reason: str = Field(min_length=1, max_length=255)


class StockMovementOut(ORMModel):
    id: int
    medicine_id: int
    medicine_name: str
    movement_type: StockMovementType
    quantity_change: int
    balance_after: int
    visit_id: int | None
    patient_name: str | None
    patient_id_number: str | None
    reason: str | None
    performed_by_name: str | None
    created_at: datetime
