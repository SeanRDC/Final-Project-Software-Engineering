# Command-line tool that fills an empty development database with made-up demo data.

import random
import sys
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select

from app.core.clock import clinic_today, utcnow
from app.core.departments import HAU_DEPARTMENTS
from app.core.permissions import Role
from app.db.session import SessionLocal
from app.models import Patient, User, Visit
from app.models.enums import PatientType, Sex, VisitDisposition, VisitType
from app.schemas.appointment import AppointmentCreate
from app.schemas.inventory import MedicineCreate
from app.schemas.patient import PatientCreate
from app.schemas.user import UserCreate
from app.schemas.visit import (
    AppointmentCheckIn,
    CheckIn,
    CompleteVisit,
    ConsultationUpdate,
    DispenseMedicine,
    VisitRecordUpdate,
)
from app.services import appointments, inventory, patients, users, visits

DEMO_PASSWORD = "hau-sync-demo"

USERS = [
    ("coordinator", "Salazar, CJ", Role.COORDINATOR, "Clinic Coordinator"),
    ("nurse", "Reyes, Ana", Role.CLINIC_STAFF, "Nurse"),
    ("assistant", "Cruz, Ben", Role.CLINIC_STAFF, "Student Assistant"),
    ("doctor", "Dr. Villareal", Role.DOCTOR, "Attending Physician"),
]

BASIC_ED = HAU_DEPARTMENTS[-1]

PATIENTS = [
    ("20241014", "Santos", "Maria", "student", "female", 20, "School of Computing",
     None, "Asthma", "No strenuous physical activity"),
    ("20251011", "Reyes", "Paolo", "student", "male", 19, "School of Business and Accountancy",
     None, None, None),
    ("EMP-0109", "Garcia", "Liza", "employee", "female", 42, "Registrar", "Ibuprofen", None, None),
    ("20231010", "Mendoza", "Carlo", "student", "male", 21,
     "School of Engineering and Architecture", None, None, None),
    ("20261015", "Bautista", "Ana", "student", "female", 18, BASIC_ED,
     "Penicillin", "G6PD deficiency", None),
    ("20241008", "Lim", "Joseph", "student", "male", 20,
     "School of Nursing and Allied Medical Sciences", None, None, None),
    ("20221187", "Villanueva", "Rosa", "student", "female", 22, "School of Education",
     None, "Asthma", None),
    ("20240556", "Panergo", "Mark", "student", "male", 20, "School of Computing",
     None, None, None),
    ("EMP-0042", "Miranda", "Gil", "employee", "male", 45, "Finance Office",
     None, "Hypertension", None),
]

MEDICINES = [
    ("Paracetamol", "500 mg", "tablet", 240, 50),
    ("Mefenamic Acid", "500 mg", "capsule", 26, 20),
    ("Cetirizine", "10 mg", "tablet", 90, 20),
    ("Loperamide", "2 mg", "capsule", 40, 15),
    ("Oral Rehydration Salts", "", "sachet", 12, 15),
    ("Salbutamol Nebule", "2.5 mg", "nebule", 30, 10),
]

# Past visits, so the reports and their charts have a trend to show. Each entry is
# (months before the current one, number of visits); the quiet month is a term break.
HISTORY = [(8, 14), (7, 22), (6, 31), (5, 18), (4, 9), (3, 0), (2, 6), (1, 27)]
# Weighted the way the clinic described its days: headaches, dizziness and colds first.
PAST_COMPLAINTS = (
    ["Headache"] * 6 + ["Dizziness"] * 4 + ["Colds"] * 4 + ["Fever"] * 3
    + ["Stomach ache"] * 2 + ["Wound", "Sprain", "Toothache"]
)
PAST_TYPES = (
    [VisitType.CONSULTATION] * 5 + [VisitType.MEDICINE_REQUEST] * 3
    + [VisitType.TREATMENT] * 2 + [VisitType.EXCUSE_LETTER, VisitType.MEDICAL_CLEARANCE]
)
PAST_OUTCOMES = (
    [VisitDisposition.RETURNED] * 7 + [VisitDisposition.SENT_HOME] * 2
    + [VisitDisposition.REFERRED]
)


def seed_history(db, people: dict, nurse: User, today: date) -> None:
    """Completed visits in the months before this one, entered the way a late entry is."""
    rng = random.Random(2026)
    patients_ = list(people.values())
    for months_ago, count in HISTORY:
        first_of_month = date(today.year, today.month, 1)
        for _ in range(months_ago):
            first_of_month = (first_of_month - timedelta(days=1)).replace(day=1)
        for _ in range(count):
            day = first_of_month + timedelta(days=rng.randrange(28))
            outcome = rng.choice(PAST_OUTCOMES)
            visit = visits.check_in(db, CheckIn(
                patient_id=rng.choice(patients_).id, complaint=rng.choice(PAST_COMPLAINTS),
                visit_type=rng.choice(PAST_TYPES), visit_date=day), nurse)
            visits.update_record(db, visit.id, VisitRecordUpdate(
                referred=outcome is VisitDisposition.REFERRED,
                guardian_notified=outcome is VisitDisposition.SENT_HOME), nurse)
            visits.complete(db, visit.id, CompleteVisit(disposition=outcome), nurse)
            # Mid-morning in the clinic on that day, not the moment the seed ran.
            arrived = datetime(day.year, day.month, day.day, 2, rng.randrange(60),
                               tzinfo=timezone.utc)
            visit.checked_in_at = arrived
            visit.completed_at = arrived + timedelta(minutes=rng.randrange(10, 40))
            db.commit()


def main() -> int:
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(User)) or db.scalar(
            select(func.count()).select_from(Patient)
        ):
            print("The database already has data. The demo seed only runs on an empty one.",
                  file=sys.stderr)
            return 1

        accounts = {}
        for username, full_name, role, job_title in USERS:
            accounts[username] = users.create_user(
                db, UserCreate(username=username, full_name=full_name, role=role,
                               job_title=job_title, password=DEMO_PASSWORD), actor=None)
        nurse, doctor, coordinator = accounts["nurse"], accounts["doctor"], accounts["coordinator"]

        today = clinic_today()
        people = {}
        for (number, last, first, kind, sex, age, department,
             allergies, conditions, activity) in PATIENTS:
            people[last] = patients.create(db, PatientCreate(
                patient_type=PatientType(kind), id_number=number, last_name=last,
                first_name=first, sex=Sex(sex), birth_date=date(today.year - age, 1, 15),
                department=department, allergies=allergies, medical_conditions=conditions,
                activity_restrictions=activity, consent_on_file=True), nurse)

        stock = {}
        for name, strength, form, quantity, threshold in MEDICINES:
            stock[name] = inventory.create(db, MedicineCreate(
                name=name, strength=strength, form=form, unit=form,
                quantity_on_hand=quantity, low_stock_threshold=threshold), coordinator)

        def arrive(last, complaint, minutes_ago, **options):
            visit = visits.check_in(
                db, CheckIn(patient_id=people[last].id, complaint=complaint, **options), nurse)
            visit.checked_in_at = utcnow() - timedelta(minutes=minutes_ago)
            db.commit()
            return visit

        wound = arrive("Lim", "Minor wound", 70, visit_type=VisitType.TREATMENT)
        visits.update_record(db, wound.id, VisitRecordUpdate(
            temperature_c=36.7, assessment="Superficial abrasion, left knee",
            treatment="Wound cleaned and dressed"), nurse)
        visits.update_consultation(db, wound.id, ConsultationUpdate(
            consultation_notes="No sign of infection", diagnosis="Abrasion"), doctor)
        visits.complete(db, wound.id, CompleteVisit(), doctor)

        dizzy = arrive("Garcia", "Dizziness", 44)
        visits.update_record(db, dizzy.id, VisitRecordUpdate(
            bp_systolic=100, bp_diastolic=60, pulse_rate=88), nurse)

        ankle = arrive("Mendoza", "Sprained ankle", 35)
        visits.update_consultation(db, ankle.id, ConsultationUpdate(
            consultation_notes="Mild swelling, able to bear weight"), doctor)

        fever = arrive("Reyes", "Fever and headache", 27)
        visits.update_record(db, fever.id, VisitRecordUpdate(
            temperature_c=38.3, assessment="Febrile, alert"), nurse)
        visits.dispense(db, fever.id, DispenseMedicine(
            medicine_id=stock["Paracetamol"].id, quantity=2,
            instructions="1 tablet every 4 hours"), nurse)

        arrive("Santos", "Difficulty breathing", 6)

        cramps = arrive("Bautista", "Dysmenorrhea", 2, visit_type=VisitType.MEDICINE_REQUEST)
        visits.dispense(db, cramps.id, DispenseMedicine(
            medicine_id=stock["Mefenamic Acid"].id, quantity=8), nurse)

        asthma = appointments.create(db, AppointmentCreate(
            patient_id=people["Villanueva"].id, scheduled_date=today, start_time=time(9, 0),
            end_time=time(9, 30), reason="Follow-up: asthma"), coordinator)
        follow_up = appointments.check_in(db, asthma.id, AppointmentCheckIn(), nurse)
        visits.complete(db, follow_up.id, CompleteVisit(), nurse)

        appointments.create(db, AppointmentCreate(
            patient_id=people["Panergo"].id, scheduled_date=today, start_time=time(10, 30),
            end_time=time(11, 0), reason="Medical clearance for PE"), coordinator)
        appointments.create(db, AppointmentCreate(
            patient_id=people["Miranda"].id, scheduled_date=today, start_time=time(14, 0),
            end_time=time(14, 30), reason="BP monitoring"), nurse)
        appointments.create(db, AppointmentCreate(
            patient_id=people["Garcia"].id, scheduled_date=today + timedelta(days=1),
            start_time=time(9, 0), end_time=time(9, 30), reason="Follow-up check"), nurse)

        seed_history(db, people, nurse, today)

        visit_count = db.scalar(select(func.count()).select_from(Visit))

    print(f"Seeded {len(USERS)} accounts, {len(PATIENTS)} patients, {len(MEDICINES)} medicines "
          f"and {visit_count} visits.")
    print(f"Log in as coordinator, nurse, assistant or doctor with password: {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
