# Imports every ORM model so all tables are registered on the metadata.

from app.models.appointment import Appointment
from app.models.inventory import Medicine, StockMovement
from app.models.medkit import Medkit, MedkitRequest, MedkitRequestItem, MedkitTemplateItem
from app.models.patient import Patient
from app.models.support import (
    Attachment,
    AuditLog,
    Notification,
    NotificationRead,
    RecordLock,
    Report,
)
from app.models.user import User
from app.models.visit import Visit, VisitMedicine, VisitVitalReading

__all__ = [
    "Appointment",
    "Attachment",
    "AuditLog",
    "Medicine",
    "Medkit",
    "MedkitRequest",
    "MedkitRequestItem",
    "MedkitTemplateItem",
    "Notification",
    "NotificationRead",
    "Patient",
    "RecordLock",
    "Report",
    "StockMovement",
    "User",
    "Visit",
    "VisitMedicine",
    "VisitVitalReading",
]
