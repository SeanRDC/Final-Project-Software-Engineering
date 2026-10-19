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
from app.schemas.medkit import (
    IssueLine,
    MedkitCreate,
    MedkitIssue,
    MedkitRequestCreate,
    MedkitReturn,
    ReturnLine,
    TemplateItemIn,
)
from app.schemas.patient import PatientCreate
from app.schemas.user import UserCreate
from app.schemas.visit import (
    AppointmentCheckIn,
    CheckIn,
    CompleteVisit,
    ConsultationUpdate,
    DispenseMedicine,
    ReleaseFromAdmission,
    VisitRecordUpdate,
)
from app.services import appointments, inventory, medkits, patients, users, visits

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


# The medicines boxed on the dispensary form (FM-SSA-MDS-8033) that are not in MEDICINES yet.
KIT_MEDICINES = [
    ("Meclizine Hydrochloride", "25 mg", "tablet", 60, 15),
    ("Phenylpropanolamine HCl + Chlorphenamine Maleate + Paracetamol", "", "tablet", 80, 20),
    ("Hyoscine N-Butylbromide", "10 mg", "tablet", 50, 15),
    ("Aluminum OH + Magnesium OH + Simethicone", "", "tablet", 60, 15),
    ("Loratadine", "10 mg", "tablet", 70, 15),
]

# The standard contents in the form's order, with how many of each go in a kit.
KIT_CONTENTS = [
    ("Meclizine Hydrochloride", 10),
    ("Phenylpropanolamine HCl + Chlorphenamine Maleate + Paracetamol", 10),
    ("Hyoscine N-Butylbromide", 10),
    ("Aluminum OH + Magnesium OH + Simethicone", 10),
    ("Loperamide", 10),
    ("Loratadine", 10),
    ("Mefenamic Acid", 10),
    ("Paracetamol", 20),
]


def seed_medkits(db, stock: dict, nurse: User, coordinator: User, today: date) -> None:
    """Three kits, the standard contents, and one loan in each state."""
    for name, strength, form, quantity, threshold in KIT_MEDICINES:
        stock[name] = inventory.create(db, MedicineCreate(
            name=name, strength=strength, form=form, unit=form,
            quantity_on_hand=quantity, low_stock_threshold=threshold), coordinator)
    medkits.set_template(db, [
        TemplateItemIn(medicine_id=stock[name].id, default_quantity=quantity)
        for name, quantity in KIT_CONTENTS], coordinator)
    kits = [medkits.create_kit(db, MedkitCreate(kit_number=number, label=label), coordinator)
            for number, label in [(1, "Red bag"), (2, "Blue bag"), (3, "Grey box")]]

    def request(activity, organization, days_ahead, person):
        return medkits.create_request(db, MedkitRequestCreate(
            organization=organization, activity=activity,
            activity_date=today + timedelta(days=days_ahead), venue="University gym",
            person_responsible=person, contact_number="0917 555 0111",
            requested_by=person, request_date=today + timedelta(days=min(days_ahead, 0) - 2)),
            nurse)

    def contents(*names):
        return [IssueLine(medicine_id=stock[name].id, quantity=quantity)
                for name, quantity in KIT_CONTENTS if name in names]

    done = request("Freshmen orientation", "Office of Student Affairs", -7, "Tan, Carla")
    done = medkits.issue(db, done.id, MedkitIssue(
        medkit_id=kits[0].id, items=contents("Paracetamol", "Mefenamic Acid", "Loperamide")), nurse)
    medkits.return_kit(db, done.id, MedkitReturn(items=[
        ReturnLine(item_id=item.id, quantity_returned=item.quantity_issued - 3)
        for item in done.items]), nurse)

    out = request("Intramurals 2026", "Junior Philippine Computer Society", 1, "Ramos, Paul")
    medkits.issue(db, out.id, MedkitIssue(
        medkit_id=kits[1].id, items=contents(*(name for name, _ in KIT_CONTENTS))), nurse)

    request("Foundation day fun run", "HAU Athletics Office", 6, "Navarro, Liza")


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
        # A visitor: the clinic numbers Others patients itself when they have no ID.
        people["Domingo"] = patients.create(db, PatientCreate(
            patient_type=PatientType.OTHER, last_name="Domingo", first_name="Teresa",
            other_description="Visitor – parent of a Grade 3 student", sex=Sex.FEMALE,
            birth_date=date(today.year - 38, 1, 15), consent_on_file=True), nurse)

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

        # Admitted to rest, then back to work an hour later.
        rested = arrive("Miranda", "Elevated blood pressure", 100)
        visits.complete(db, rested.id, CompleteVisit(disposition=VisitDisposition.ADMITTED), nurse)
        rested.completed_at = utcnow() - timedelta(minutes=90)
        db.commit()
        visits.release_from_admission(
            db, rested.id, ReleaseFromAdmission(disposition=VisitDisposition.RETURNED), nurse)
        rested.released_at = utcnow() - timedelta(minutes=25)
        db.commit()

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
        # A record taken out of use, so the Archive page has something to show.
        archived = patients.create(db, PatientCreate(
            patient_type=PatientType.STUDENT, id_number="20190233", last_name="Aquino",
            first_name="Leo", sex=Sex.MALE, birth_date=date(today.year - 25, 1, 15),
            department="School of Business and Accountancy", consent_on_file=True), nurse)
        patients.set_archived(db, archived.id, True, coordinator)
        people["Aquino"] = archived
        seed_medkits(db, stock, nurse, coordinator, today)

        visit_count = db.scalar(select(func.count()).select_from(Visit))

    print(f"Seeded {len(USERS)} accounts, {len(people)} patients, {len(MEDICINES) + len(KIT_MEDICINES)} medicines "
          f"and {visit_count} visits.")
    print(f"Log in as coordinator, nurse, assistant or doctor with password: {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
