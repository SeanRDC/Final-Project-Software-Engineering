# ORM models for medicines and their stock movements.

from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import utcnow
from app.db.base import Base, UTCDateTime
from app.models.enums import StockMovementType, enum_type
from app.models.user import User


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (UniqueConstraint("name", "strength", name="uq_medicine_name_strength"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    strength: Mapped[str] = mapped_column(String(50), default="")
    form: Mapped[str | None] = mapped_column(String(50))
    unit: Mapped[str] = mapped_column(String(30), default="pc")
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=20)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    @property
    def display_name(self) -> str:
        return f"{self.name} {self.strength}".strip()

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_on_hand <= self.low_stock_threshold


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), index=True)
    movement_type: Mapped[StockMovementType] = mapped_column(
        enum_type(StockMovementType), index=True
    )
    quantity_change: Mapped[int] = mapped_column(Integer)
    balance_after: Mapped[int] = mapped_column(Integer)
    visit_id: Mapped[int | None] = mapped_column(ForeignKey("visits.id"), index=True)
    reason: Mapped[str | None] = mapped_column(String(255))
    performed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)

    medicine: Mapped[Medicine] = relationship(lazy="joined")
    performed_by: Mapped[User | None] = relationship(lazy="joined")
    visit: Mapped["Visit | None"] = relationship(lazy="joined")

    @property
    def medicine_name(self) -> str:
        return self.medicine.display_name

    @property
    def performed_by_name(self) -> str | None:
        return self.performed_by.full_name if self.performed_by else None

    @property
    def patient_name(self) -> str | None:
        return self.visit.patient.full_name if self.visit else None

    @property
    def patient_id_number(self) -> str | None:
        return self.visit.patient.id_number if self.visit else None
