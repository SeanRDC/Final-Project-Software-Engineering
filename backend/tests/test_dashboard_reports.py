# Tests for clinic statistics, saved reports and the dashboard.

from app.core.clock import clinic_today
from tests.conftest import check_in


def _employee(nurse):
    return nurse.post("/patients", json={
        "patient_type": "employee", "id_number": "EMP-0042", "last_name": "Garcia",
        "first_name": "Liza", "department": "Registrar"}).json()


def _seed_activity(nurse, doctor, coordinator, patient, medicine):
    first = check_in(nurse, patient["id"], complaint="Headache", visit_type="medicine_request")
    nurse.post(f"/visits/{first['id']}/medicines",
               json={"medicine_id": medicine["id"], "quantity": 2})
    nurse.post(f"/visits/{first['id']}/complete", json={"disposition": "returned"})

    second = check_in(nurse, patient["id"], complaint="headache ")
    nurse.patch(f"/visits/{second['id']}", json={
        "referred": True, "referral_details": "Sent to hospital ER", "guardian_notified": True})
    nurse.post(f"/visits/{second['id']}/complete", json={"disposition": "referred"})

    employee = _employee(nurse)
    check_in(nurse, employee["id"], complaint="Dizziness")

    mistake = check_in(nurse, patient["id"], complaint="Wrong entry")
    nurse.post(f"/visits/{mistake['id']}/cancel")
    return employee


def test_report_summary_statistics(nurse, doctor, coordinator, patient, medicine):
    _seed_activity(nurse, doctor, coordinator, patient, medicine)
    today = str(clinic_today())
    summary = nurse.get("/reports/summary", params={"start": today, "end": today}).json()

    def counts(key):
        return {item["label"]: item["count"] for item in summary[key]}

    assert summary["total_visits"] == 3
    assert summary["unique_patients"] == 2
    assert counts("visits_by_patient_type") == {"student": 2, "employee": 1}
    assert counts("visits_by_type") == {"consultation": 2, "medicine_request": 1}
    assert summary["visits_by_type_and_patient_type"] == [
        {"label": "consultation", "students": 1, "employees": 1},
        {"label": "medicine_request", "students": 1, "employees": 0}]
    assert counts("visits_by_department") == {"School of Computing": 2, "Registrar": 1}
    assert counts("top_complaints") == {"headache": 2, "dizziness": 1}
    assert counts("visits_by_disposition") == {"returned": 1, "referred": 1}
    assert summary["referrals"] == 1
    assert summary["guardian_notifications"] == 1
    assert summary["medicines_released"] == [{
        "medicine_id": medicine["id"], "medicine_name": "Paracetamol 500 mg",
        "unit": "tablet", "quantity_released": 2}]
    assert [(v["full_name"], v["visit_count"]) for v in summary["frequent_visitors"]] == [
        ("Santos, Maria", 2)]


def test_summary_rejects_reversed_period(nurse):
    response = nurse.get("/reports/summary", params={"start": "2026-10-10", "end": "2026-10-01"})
    assert response.status_code == 400


def test_saved_report_keeps_its_figures(nurse, doctor, coordinator, patient, medicine):
    _seed_activity(nurse, doctor, coordinator, patient, medicine)
    today = str(clinic_today())
    payload = {"title": "1st Semester, AY 2026-2027", "period_start": today, "period_end": today}

    assert nurse.post("/reports", json=payload).status_code == 403
    saved = coordinator.post("/reports", json=payload)
    assert saved.status_code == 201
    report_id = saved.json()["id"]

    extra = check_in(nurse, patient["id"], complaint="Cough")
    nurse.post(f"/visits/{extra['id']}/complete")
    assert nurse.get(f"/reports/{report_id}").json()["summary"]["total_visits"] == 3
    assert nurse.get("/reports/summary",
                     params={"start": today, "end": today}).json()["total_visits"] == 4

    listing = nurse.get("/reports").json()
    assert [(r["title"], r["generated_by_name"]) for r in listing] == [
        ("1st Semester, AY 2026-2027", "Salazar, CJ")]

    csv_file = nurse.get(f"/reports/{report_id}/csv")
    assert csv_file.status_code == 200
    assert csv_file.headers["content-type"].startswith("text/csv")
    assert "1st Semester, AY 2026-2027" in csv_file.text
    assert "Paracetamol 500 mg,2,tablet" in csv_file.text

    assert nurse.delete(f"/reports/{report_id}").status_code == 403
    assert coordinator.delete(f"/reports/{report_id}").status_code == 204
    assert nurse.get(f"/reports/{report_id}").status_code == 404


def test_dashboard_matches_clinic_activity(nurse, doctor, coordinator, patient, medicine):
    employee = _seed_activity(nurse, doctor, coordinator, patient, medicine)
    today = clinic_today()
    coordinator.post("/appointments", json={
        "patient_id": employee["id"], "scheduled_date": str(today),
        "start_time": "14:00", "end_time": "14:30", "reason": "BP monitoring"})

    dashboard = nurse.get("/dashboard").json()
    assert dashboard["date"] == str(today)
    assert dashboard["stats"] == {
        "visits_today": 3, "open_visits": 1, "completed_today": 2,
        "appointments_today": 1, "appointments_remaining": 1,
        "low_stock_items": 0, "visits_this_month": 3,
    }
    assert [(v["patient"]["last_name"], v["status"], v["complaint"])
            for v in dashboard["todays_visits"]] == [
        ("Garcia", "open", "Dizziness"),
        ("Santos", "completed", "headache"),
        ("Santos", "completed", "Headache"),
    ]
    assert [a["reason"] for a in dashboard["todays_appointments"]] == ["BP monitoring"]
    assert dashboard["calendar"] == [{"date": str(today), "appointment_count": 1}]

    open_visit = dashboard["todays_visits"][0]
    doctor.post(f"/visits/{open_visit['id']}/complete")
    stats = doctor.get("/dashboard").json()["stats"]
    assert (stats["open_visits"], stats["completed_today"]) == (0, 3)


def test_empty_dashboard(doctor):
    dashboard = doctor.get("/dashboard").json()
    assert dashboard["stats"]["visits_today"] == 0
    assert dashboard["stats"]["open_visits"] == 0
    assert dashboard["todays_visits"] == []
    assert dashboard["low_stock"] == []
