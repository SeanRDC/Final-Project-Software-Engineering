# Schemas for notifications, attachments, the audit log, reports and the dashboard.

from datetime import date, datetime
from typing import Any, Self

from pydantic import BaseModel, Field, model_validator

from app.models.enums import NotificationType
from app.schemas.appointment import AppointmentOut, CalendarDay
from app.schemas.common import ORMModel
from app.schemas.inventory import MedicineOut
from app.schemas.visit import VisitSummary


class NotificationOut(ORMModel):
    id: int
    type: NotificationType
    title: str
    body: str | None
    entity_type: str | None
    entity_id: int | None
    created_at: datetime
    is_read: bool = False


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread_count: int


class AttachmentOut(ORMModel):
    id: int
    patient_id: int
    visit_id: int | None
    original_filename: str
    content_type: str
    size_bytes: int
    description: str | None
    uploaded_by_name: str | None
    created_at: datetime


class AuditLogOut(ORMModel):
    id: int
    user_id: int | None
    username: str | None
    action: str
    entity_type: str | None
    entity_id: int | None
    detail: str | None
    created_at: datetime


class CountItem(BaseModel):
    label: str
    count: int


class FrequentVisitor(BaseModel):
    patient_id: int
    id_number: str
    full_name: str
    department: str | None
    visit_count: int


class MedicineRelease(BaseModel):
    medicine_id: int
    medicine_name: str
    unit: str
    quantity_released: int


class ReportSummary(BaseModel):
    period_start: date
    period_end: date
    total_visits: int
    unique_patients: int
    visits_by_patient_type: list[CountItem]
    visits_by_type: list[CountItem]
    visits_by_department: list[CountItem]
    visits_by_month: list[CountItem]
    visits_by_disposition: list[CountItem]
    top_complaints: list[CountItem]
    referrals: int
    guardian_notifications: int
    medicines_released: list[MedicineRelease]
    appointments_by_status: list[CountItem]
    frequent_visitors: list[FrequentVisitor]


class ReportCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def _valid_period(self) -> Self:
        if self.period_end < self.period_start:
            raise ValueError("period_end must not be before period_start")
        return self


class ReportOut(ORMModel):
    id: int
    title: str
    period_start: date
    period_end: date
    generated_by_name: str | None
    created_at: datetime


class ReportDetail(ReportOut):
    summary: ReportSummary


class DashboardStats(BaseModel):
    visits_today: int
    open_visits: int
    completed_today: int
    appointments_today: int
    appointments_remaining: int
    low_stock_items: int
    visits_this_month: int


class Dashboard(BaseModel):
    date: date
    stats: DashboardStats
    todays_visits: list[VisitSummary]
    todays_appointments: list[AppointmentOut]
    calendar: list[CalendarDay]
    low_stock: list[MedicineOut]
    notifications: NotificationList


class Options(BaseModel):
    departments: list[str]
    enums: dict[str, list[str]]
    lock_timeout_minutes: int
    max_upload_mb: int
    allowed_upload_types: list[str]


class Health(BaseModel):
    status: str
    database: bool
    server_time: datetime
    version: str


JsonDict = dict[str, Any]
