# ORM models for the medical kits lent to university activities, their standard contents and each loan.

from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import clinic_today, utcnow
from app.db.base import Base, UTCDateTime
from app.models.enums import MedkitRequestStatus, MedkitStatus, enum_type
from app.models.inventory import Medicine
from app.models.user import User


class Medkit(Base):
    """A physical kit, numbered as on the dispensary form (FM-SSA-MDS-8033)."""

    __tablename__ = "medkits"

    id: Mapped[int] = mapped_column(primary_key=True)
    kit_number: Mapped[int] = mapped_column(Integer, unique=True)
    label: Mapped[str | None] = mapped_column(String(80))
    # Set by the loans themselves; only a replaced lost kit is put back by hand.
    status: Mapped[MedkitStatus] = mapped_column(
        enum_type(MedkitStatus), default=MedkitStatus.AVAILABLE
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class MedkitTemplateItem(Base):
    """One line of what a kit normally carries, with how many."""

    __tablename__ = "medkit_template_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), unique=True)
    default_quantity: Mapped[int] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    medicine: Mapped[Medicine] = relationship(lazy="joined")

    @property
    def medicine_name(self) -> str:
        return self.medicine.display_name

    @property
    def unit(self) -> str:
        return self.medicine.unit

    @property
    def quantity_on_hand(self) -> int:
        return self.medicine.quantity_on_hand


class MedkitRequest(Base):
    """One borrowing of a kit: the request form (FM-SSA-MDS-8032), then its issue and return."""

    __tablename__ = "medkit_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization: Mapped[str] = mapped_column(String(150))
    activity: Mapped[str] = mapped_column(String(150))
    activity_date: Mapped[date] = mapped_column(Date, index=True)
    venue: Mapped[str | None] = mapped_column(String(150))
    person_responsible: Mapped[str] = mapped_column(String(120))
    contact_number: Mapped[str | None] = mapped_column(String(30))
    requested_by: Mapped[str] = mapped_column(String(120))
    request_date: Mapped[date] = mapped_column(Date)
    status: Mapped[MedkitRequestStatus] = mapped_column(
        enum_type(MedkitRequestStatus), default=MedkitRequestStatus.REQUESTED, index=True
    )
    medkit_id: Mapped[int | None] = mapped_column(ForeignKey("medkits.id"), index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)
    issued_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    issued_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    closed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    closed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    overdue_notified_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    medkit: Mapped[Medkit | None] = relationship(lazy="joined")
    issued_by: Mapped[User | None] = relationship(foreign_keys=[issued_by_id], lazy="joined")
    closed_by: Mapped[User | None] = relationship(foreign_keys=[closed_by_id], lazy="joined")
    items: Mapped[list["MedkitRequestItem"]] = relationship(
        lazy="selectin", order_by="MedkitRequestItem.id", cascade="all, delete-orphan"
    )

    @property
    def label(self) -> str:
        kit = f"Medical kit #{self.medkit.kit_number}" if self.medkit else "Medical kit"
        return f"{kit} – {self.activity}"

    @property
    def is_overdue(self) -> bool:
        """Still out after the day of the activity; the form asks for it back right after."""
        return self.status == MedkitRequestStatus.ISSUED and self.activity_date < clinic_today()

    @property
    def issued_by_name(self) -> str | None:
        return self.issued_by.full_name if self.issued_by else None

    @property
    def closed_by_name(self) -> str | None:
        return self.closed_by.full_name if self.closed_by else None


class MedkitRequestItem(Base):
    """A medicine or supply put in the kit, and how much of it came back."""

    __tablename__ = "medkit_request_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("medkit_requests.id"), index=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"))
    quantity_issued: Mapped[int] = mapped_column(Integer)
    quantity_returned: Mapped[int | None] = mapped_column(Integer)

    medicine: Mapped[Medicine] = relationship(lazy="joined")

    @property
    def medicine_name(self) -> str:
        return self.medicine.display_name

    @property
    def unit(self) -> str:
        return self.medicine.unit

    @property
    def quantity_used(self) -> int | None:
        if self.quantity_returned is None:
            return None
        return self.quantity_issued - self.quantity_returned
