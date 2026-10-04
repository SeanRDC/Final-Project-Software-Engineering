# ORM models for notifications, edit locks, attachments, the audit log and saved reports.

from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.clock import utcnow
from app.db.base import Base, UTCDateTime
from app.models.enums import NotificationType, enum_type
from app.models.user import User


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[NotificationType] = mapped_column(enum_type(NotificationType), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(String(255))
    audience_role: Mapped[str | None] = mapped_column(String(32), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)


class NotificationRead(Base):
    __tablename__ = "notification_reads"
    __table_args__ = (UniqueConstraint("notification_id", "user_id", name="uq_notification_read"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    notification_id: Mapped[int] = mapped_column(ForeignKey("notifications.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    read_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class RecordLock(Base):
    __tablename__ = "record_locks"
    __table_args__ = (UniqueConstraint("resource_type", "resource_id", name="uq_record_lock"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    resource_type: Mapped[str] = mapped_column(String(20))
    resource_id: Mapped[int] = mapped_column(Integer)
    locked_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    locked_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)

    locked_by: Mapped[User] = relationship(lazy="joined")

    @property
    def locked_by_name(self) -> str:
        return self.locked_by.full_name


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    visit_id: Mapped[int | None] = mapped_column(ForeignKey("visits.id"), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_filename: Mapped[str] = mapped_column(String(80), unique=True)
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(String(255))
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    uploaded_by: Mapped[User | None] = relationship(lazy="joined")

    @property
    def uploaded_by_name(self) -> str | None:
        return self.uploaded_by.full_name if self.uploaded_by else None


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    username: Mapped[str | None] = mapped_column(String(50))
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40), index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer)
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    summary_json: Mapped[str] = mapped_column(Text)
    generated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    generated_by: Mapped[User | None] = relationship(lazy="joined")

    @property
    def generated_by_name(self) -> str | None:
        return self.generated_by.full_name if self.generated_by else None
