# Time helpers that keep timestamps in UTC and work out the clinic's local day.

from datetime import date, datetime, time, timezone

from app.core.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def clinic_today() -> date:
    return datetime.now(settings.tz).date()


def to_clinic_time(value: datetime) -> datetime:
    return value.astimezone(settings.tz)


def day_start(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=settings.tz).astimezone(timezone.utc)


def day_end(day: date) -> datetime:
    return datetime.combine(day, time.max, tzinfo=settings.tz).astimezone(timezone.utc)
