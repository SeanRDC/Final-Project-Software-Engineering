# Computes clinic statistics and manages saved term reports and their CSV export.

import csv
import io
from collections import Counter
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Appointment, Medicine, Patient, Report, User, Visit, VisitMedicine
from app.models.enums import PatientType, VisitStatus
from app.schemas.support import (
    CountItem,
    FrequentVisitor,
    MedicineRelease,
    ReportCreate,
    ReportDetail,
    ReportOut,
    ReportSummary,
    TypeByPatientType,
)
from app.services import audit
from app.services.common import get_or_404

TOP_N = 10


def _label(value) -> str:
    if value is None or value == "":
        return "Unspecified"
    return str(getattr(value, "value", value))


def _items(counter: Counter, limit: int | None = None) -> list[CountItem]:
    return [CountItem(label=label, count=count) for label, count in counter.most_common(limit)]


def summarize(db: Session, start: date, end: date) -> ReportSummary:
    in_period = (
        Visit.visit_date.between(start, end),
        Visit.status != VisitStatus.CANCELLED,
    )
    rows = db.execute(
        select(
            Visit.visit_date,
            Visit.visit_type,
            Visit.disposition,
            Visit.complaint,
            Visit.referred,
            Visit.guardian_notified,
            Patient.id,
            Patient.patient_type,
            Patient.department,
            Patient.id_number,
            Patient.last_name,
            Patient.first_name,
        )
        .join(Patient, Patient.id == Visit.patient_id)
        .where(*in_period)
    ).all()

    by_patient_type, by_type, by_department = Counter(), Counter(), Counter()
    by_month, by_disposition, complaints, per_patient = (
        Counter(), Counter(), Counter(), Counter()
    )
    type_by_patient_type: dict[str, Counter] = {}
    patients: dict[int, tuple] = {}
    referrals = guardian_notifications = 0
    for row in rows:
        by_patient_type[_label(row.patient_type)] += 1
        by_type[_label(row.visit_type)] += 1
        type_by_patient_type.setdefault(_label(row.visit_type), Counter())[
            _label(row.patient_type)
        ] += 1
        by_department[_label(row.department)] += 1
        by_month[row.visit_date.strftime("%Y-%m")] += 1
        if row.disposition is not None:
            by_disposition[_label(row.disposition)] += 1
        complaints[" ".join(row.complaint.lower().split())] += 1
        referrals += bool(row.referred)
        guardian_notifications += bool(row.guardian_notified)
        per_patient[row.id] += 1
        patients[row.id] = (row.id_number, f"{row.last_name}, {row.first_name}", row.department)

    releases = db.execute(
        select(Medicine.id, Medicine.name, Medicine.strength, Medicine.unit,
               func.sum(VisitMedicine.quantity))
        .join(VisitMedicine, VisitMedicine.medicine_id == Medicine.id)
        .join(Visit, Visit.id == VisitMedicine.visit_id)
        .where(*in_period)
        .group_by(Medicine.id, Medicine.name, Medicine.strength, Medicine.unit)
        .order_by(func.sum(VisitMedicine.quantity).desc())
    ).all()

    appointment_rows = db.execute(
        select(Appointment.status, func.count())
        .where(Appointment.scheduled_date.between(start, end))
        .group_by(Appointment.status)
    ).all()

    return ReportSummary(
        period_start=start,
        period_end=end,
        total_visits=len(rows),
        unique_patients=len(per_patient),
        visits_by_patient_type=_items(by_patient_type),
        visits_by_type=_items(by_type),
        visits_by_type_and_patient_type=[
            TypeByPatientType(
                label=label,
                students=type_by_patient_type[label][PatientType.STUDENT.value],
                employees=type_by_patient_type[label][PatientType.EMPLOYEE.value],
            )
            for label, _ in by_type.most_common()
        ],
        visits_by_department=_items(by_department),
        visits_by_month=[CountItem(label=m, count=by_month[m]) for m in sorted(by_month)],
        visits_by_disposition=_items(by_disposition),
        top_complaints=_items(complaints, TOP_N),
        referrals=referrals,
        guardian_notifications=guardian_notifications,
        medicines_released=[
            MedicineRelease(
                medicine_id=mid,
                medicine_name=f"{name} {strength}".strip(),
                unit=unit,
                quantity_released=int(total or 0),
            )
            for mid, name, strength, unit, total in releases
        ],
        appointments_by_status=[
            CountItem(label=_label(status), count=count) for status, count in appointment_rows
        ],
        frequent_visitors=[
            FrequentVisitor(
                patient_id=pid,
                id_number=patients[pid][0],
                full_name=patients[pid][1],
                department=patients[pid][2],
                visit_count=count,
            )
            for pid, count in per_patient.most_common(TOP_N)
            if count > 1
        ],
    )


def _detail(report: Report) -> ReportDetail:
    return ReportDetail(
        **ReportOut.model_validate(report).model_dump(),
        summary=ReportSummary.model_validate_json(report.summary_json),
    )


def generate(db: Session, data: ReportCreate, actor: User) -> ReportDetail:
    summary = summarize(db, data.period_start, data.period_end)
    report = Report(
        title=data.title.strip(),
        period_start=data.period_start,
        period_end=data.period_end,
        summary_json=summary.model_dump_json(),
        generated_by_id=actor.id,
    )
    db.add(report)
    db.flush()
    audit.record(db, actor, "report.generate", "report", report.id, title=report.title)
    db.commit()
    return _detail(report)


def list_reports(db: Session) -> list[Report]:
    return list(db.scalars(select(Report).order_by(Report.created_at.desc())).unique())


def get(db: Session, report_id: int) -> ReportDetail:
    return _detail(get_or_404(db, Report, report_id, "Report"))


def delete(db: Session, report_id: int, actor: User) -> None:
    report = get_or_404(db, Report, report_id, "Report")
    audit.record(db, actor, "report.delete", "report", report.id, title=report.title)
    db.delete(report)
    db.commit()


def to_csv(summary: ReportSummary, title: str = "Clinic summary report") -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([title])
    writer.writerow(["Period", f"{summary.period_start} to {summary.period_end}"])
    writer.writerow([])
    writer.writerow(["Total visits", summary.total_visits])
    writer.writerow(["Unique patients", summary.unique_patients])
    writer.writerow(["Referrals", summary.referrals])
    writer.writerow(["Guardian notifications", summary.guardian_notifications])

    sections = [
        ("Visits by patient type", summary.visits_by_patient_type),
        ("Visits by type of request", summary.visits_by_type),
        ("Visits by department", summary.visits_by_department),
        ("Visits by month", summary.visits_by_month),
        ("Visits by outcome", summary.visits_by_disposition),
        ("Top complaints", summary.top_complaints),
        ("Appointments by status", summary.appointments_by_status),
    ]
    for heading, items in sections:
        writer.writerow([])
        writer.writerow([heading, "Count"])
        writer.writerows([item.label, item.count] for item in items)

    if summary.visits_by_type_and_patient_type:
        writer.writerow([])
        writer.writerow(["Requests by students and employees", "Students", "Employees"])
        writer.writerows(
            [item.label, item.students, item.employees]
            for item in summary.visits_by_type_and_patient_type
        )

    writer.writerow([])
    writer.writerow(["Medicines released", "Quantity", "Unit"])
    writer.writerows(
        [m.medicine_name, m.quantity_released, m.unit] for m in summary.medicines_released
    )
    writer.writerow([])
    writer.writerow(["Frequent visitors", "ID number", "Department", "Visits"])
    writer.writerows(
        [v.full_name, v.id_number, v.department or "", v.visit_count]
        for v in summary.frequent_visitors
    )
    return buffer.getvalue()
