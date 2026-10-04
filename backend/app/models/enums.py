# Enumerations shared by the models and schemas.

from enum import StrEnum

from sqlalchemy import Enum as SAEnum


def enum_type(enum_cls: type[StrEnum]) -> SAEnum:
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=32,
        values_callable=lambda members: [m.value for m in members],
    )


class PatientType(StrEnum):
    STUDENT = "student"
    EMPLOYEE = "employee"


class Sex(StrEnum):
    MALE = "male"
    FEMALE = "female"


class VisitStatus(StrEnum):
    OPEN = "open"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VisitType(StrEnum):
    CONSULTATION = "consultation"
    MEDICINE_REQUEST = "medicine_request"
    TREATMENT = "treatment"
    MEDICAL_CLEARANCE = "medical_clearance"
    EXCUSE_LETTER = "excuse_letter"
    FOLLOW_UP = "follow_up"
    MONITORING = "monitoring"
    OTHER = "other"


class VisitDisposition(StrEnum):
    RETURNED = "returned"
    SENT_HOME = "sent_home"
    REFERRED = "referred"
    ADMITTED = "admitted"


class AppointmentStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class StockMovementType(StrEnum):
    STOCK_IN = "stock_in"
    RELEASE = "release"
    ADJUSTMENT = "adjustment"


class NotificationType(StrEnum):
    LOW_STOCK = "low_stock"
    APPOINTMENT_PENDING = "appointment_pending"
    APPOINTMENT_DECIDED = "appointment_decided"
