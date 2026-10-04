# Builds the single payload that feeds the Clinic Main Menu dashboard.

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.clock import clinic_today
from app.models import User, Visit
from app.models.enums import AppointmentStatus, VisitStatus
from app.schemas.appointment import AppointmentOut
from app.schemas.inventory import MedicineOut
from app.schemas.support import Dashboard, DashboardStats
from app.schemas.visit import VisitSummary
from app.services import appointments, inventory, notifications, visits


def build(db: Session, user: User) -> Dashboard:
    today = clinic_today()
    todays_visits = visits.for_day(db, today)
    todays_appointments = appointments.for_day(db, today)
    low_stock = inventory.low_stock(db)
    visits_this_month = db.scalar(
        select(func.count())
        .select_from(Visit)
        .where(
            Visit.visit_date >= today.replace(day=1),
            Visit.visit_date <= today,
            Visit.status != VisitStatus.CANCELLED,
        )
    ) or 0
    upcoming = (AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)
    return Dashboard(
        date=today,
        stats=DashboardStats(
            visits_today=len(todays_visits),
            open_visits=sum(v.status == VisitStatus.OPEN for v in todays_visits),
            completed_today=sum(v.status == VisitStatus.COMPLETED for v in todays_visits),
            appointments_today=len(todays_appointments),
            appointments_remaining=sum(a.status in upcoming for a in todays_appointments),
            low_stock_items=len(low_stock),
            visits_this_month=visits_this_month,
        ),
        todays_visits=[VisitSummary.model_validate(v) for v in todays_visits],
        todays_appointments=[AppointmentOut.model_validate(a) for a in todays_appointments],
        calendar=appointments.calendar(db, today.year, today.month),
        low_stock=[MedicineOut.model_validate(m) for m in low_stock],
        notifications=notifications.list_for_user(db, user, limit=10),
    )
