# Tests for the patient log, visit records and the doctor's consultation notes.

from tests.conftest import check_in


def _second_patient(nurse):
    response = nurse.post("/patients", json={
        "patient_type": "student", "id_number": "20230011", "last_name": "Reyes",
        "first_name": "Paolo", "department": "School of Business"})
    return response.json()


def test_check_in_opens_a_visit_with_the_patients_alerts(nurse, patient):
    visit = check_in(nurse, patient["id"], complaint="Difficulty breathing")
    assert visit["status"] == "open"
    assert visit["complaint"] == "Difficulty breathing"
    assert visit["patient"]["full_name"] == "Santos, Maria"
    assert visit["patient_alerts"]["allergies"] == "Penicillin"
    assert visit["completed_at"] is None


def test_patient_cannot_have_two_open_visits(nurse, patient):
    first = check_in(nurse, patient["id"])
    again = nurse.post("/visits", json={"patient_id": patient["id"], "complaint": "Fever"})
    assert again.status_code == 409
    assert again.json()["visit_id"] == first["id"]


def test_todays_log_lists_open_visits_in_arrival_order_then_completed(nurse, patient):
    first = check_in(nurse, patient["id"])
    second = check_in(nurse, _second_patient(nurse)["id"])
    assert [v["id"] for v in nurse.get("/visits/today").json()] == [first["id"], second["id"]]

    nurse.post(f"/visits/{first['id']}/complete")
    log = nurse.get("/visits/today").json()
    assert [(v["id"], v["status"]) for v in log] == [
        (second["id"], "open"), (first["id"], "completed")]

    open_only = nurse.get("/visits", params={"status": "open"}).json()
    assert [v["id"] for v in open_only["items"]] == [second["id"]]


def test_nurse_record_is_visible_to_the_doctor_without_manual_transfer(nurse, doctor, patient):
    visit = check_in(nurse, patient["id"], complaint="Fever and headache")
    recorded = nurse.patch(f"/visits/{visit['id']}", json={
        "temperature_c": 38.4, "bp_systolic": 110, "bp_diastolic": 70, "pulse_rate": 96,
        "assessment": "Febrile, alert and oriented", "treatment": "Rest provided",
        "remarks": "Parent informed", "guardian_notified": True})
    assert recorded.status_code == 200
    assert recorded.json()["doctor_name"] is None

    seen = doctor.get(f"/visits/{visit['id']}").json()
    assert seen["temperature_c"] == 38.4
    assert seen["assessment"] == "Febrile, alert and oriented"
    assert seen["guardian_notified"] is True
    assert seen["patient_alerts"]["activity_restrictions"] == "No strenuous physical activity"

    notes = doctor.patch(f"/visits/{visit['id']}/consultation", json={
        "consultation_notes": "Viral illness likely", "diagnosis": "Acute viral fever",
        "medication_details": "Paracetamol 500 mg every 4 hours"})
    assert notes.status_code == 200
    assert notes.json()["status"] == "open"
    assert notes.json()["doctor_name"] == "Dr. Villareal"

    done = doctor.post(f"/visits/{visit['id']}/complete", json={"disposition": "sent_home"})
    body = done.json()
    assert body["status"] == "completed"
    assert body["disposition"] == "sent_home"
    assert body["diagnosis"] == "Acute viral fever"
    assert body["completed_at"] is not None


def test_nurse_can_complete_a_visit_without_a_doctor(nurse, patient):
    visit = check_in(nurse, patient["id"])
    done = nurse.post(f"/visits/{visit['id']}/complete", json={"disposition": "returned"})
    assert done.status_code == 200
    assert done.json()["status"] == "completed"
    assert done.json()["doctor_name"] is None


def test_closed_visits_cannot_be_completed_or_cancelled_again(nurse, patient):
    visit = check_in(nurse, patient["id"])
    nurse.post(f"/visits/{visit['id']}/complete")
    assert nurse.post(f"/visits/{visit['id']}/complete").status_code == 409
    assert nurse.post(f"/visits/{visit['id']}/cancel").status_code == 409


def test_role_limits_on_visit_actions(nurse, doctor, patient):
    visit = check_in(nurse, patient["id"])
    assert doctor.post("/visits", json={"patient_id": patient["id"],
                                        "complaint": "x"}).status_code == 403
    assert doctor.patch(f"/visits/{visit['id']}", json={"assessment": "x"}).status_code == 403
    assert doctor.post(f"/visits/{visit['id']}/cancel").status_code == 403
    assert nurse.patch(f"/visits/{visit['id']}/consultation",
                       json={"diagnosis": "x"}).status_code == 403


def test_completed_visit_can_still_be_corrected(nurse, doctor, patient):
    visit = check_in(nurse, patient["id"], complaint="Hedache")
    nurse.post(f"/visits/{visit['id']}/complete")
    fixed = nurse.patch(f"/visits/{visit['id']}", json={"complaint": "Headache"})
    assert fixed.status_code == 200
    assert fixed.json()["complaint"] == "Headache"
    late_note = doctor.patch(f"/visits/{visit['id']}/consultation",
                             json={"diagnosis": "Tension headache"})
    assert late_note.status_code == 200
    assert late_note.json()["status"] == "completed"


def test_cancelled_visit_leaves_the_log_and_history(nurse, doctor, patient):
    visit = check_in(nurse, patient["id"])
    cancelled = nurse.post(f"/visits/{visit['id']}/cancel", json={"reason": "Logged by mistake"})
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["cancelled_reason"] == "Logged by mistake"
    assert nurse.get("/visits/today").json() == []
    assert nurse.get(f"/patients/{patient['id']}/visits").json()["total"] == 0
    assert nurse.patch(f"/visits/{visit['id']}", json={"remarks": "x"}).status_code == 409
    assert doctor.patch(f"/visits/{visit['id']}/consultation",
                        json={"diagnosis": "x"}).status_code == 409
    assert check_in(nurse, patient["id"])["status"] == "open"


def test_visit_history_is_chronological_and_counts_visits(nurse, patient):
    first = check_in(nurse, patient["id"], complaint="Headache")
    nurse.post(f"/visits/{first['id']}/complete")
    second = check_in(nurse, patient["id"], complaint="Dizziness")
    nurse.post(f"/visits/{second['id']}/complete")

    history = nurse.get(f"/patients/{patient['id']}/visits").json()
    assert history["total"] == 2
    assert [v["complaint"] for v in history["items"]] == ["Dizziness", "Headache"]
    assert nurse.get(f"/patients/{patient['id']}").json()["visit_count"] == 2


def test_vital_signs_are_validated(nurse, patient):
    visit = check_in(nurse, patient["id"])
    assert nurse.patch(f"/visits/{visit['id']}", json={"temperature_c": 98.6}).status_code == 422
    assert nurse.patch(f"/visits/{visit['id']}",
                       json={"oxygen_saturation": 140}).status_code == 422
