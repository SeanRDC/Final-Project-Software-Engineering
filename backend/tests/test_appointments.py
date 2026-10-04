# Tests for booking, approving, rescheduling and checking in appointments.

from datetime import timedelta

from app.core.clock import clinic_today


def _book(api, patient_id, day=None, start="09:00", end="09:30", reason="Follow-up: asthma"):
    return api.post("/appointments", json={
        "patient_id": patient_id, "scheduled_date": str(day or clinic_today()),
        "start_time": start, "end_time": end, "reason": reason})


def test_staff_booking_is_pending_and_notifies_the_coordinator(nurse, coordinator, patient):
    booked = _book(nurse, patient["id"])
    assert booked.status_code == 201
    assert booked.json()["status"] == "pending"

    coordinator_alerts = [n["type"] for n in coordinator.get("/notifications").json()["items"]]
    assert "appointment_pending" in coordinator_alerts
    nurse_alerts = [n["type"] for n in nurse.get("/notifications").json()["items"]]
    assert "appointment_pending" not in nurse_alerts


def test_only_coordinator_confirms_and_cancels(nurse, doctor, coordinator, patient):
    appointment = _book(nurse, patient["id"]).json()
    path = f"/appointments/{appointment['id']}"
    assert nurse.post(f"{path}/confirm").status_code == 403
    assert nurse.post(f"{path}/cancel").status_code == 403
    assert doctor.post(f"{path}/confirm").status_code == 403

    confirmed = coordinator.post(f"{path}/confirm").json()
    assert confirmed["status"] == "confirmed"
    assert confirmed["decided_by_name"] == "Salazar, CJ"
    assert coordinator.post(f"{path}/confirm").status_code == 409

    cancelled = coordinator.post(f"{path}/cancel", json={"reason": "Doctor unavailable"}).json()
    assert cancelled["status"] == "cancelled"
    assert cancelled["cancellation_reason"] == "Doctor unavailable"


def test_coordinator_booking_is_confirmed_immediately(coordinator, patient):
    assert _book(coordinator, patient["id"]).json()["status"] == "confirmed"


def test_booking_rules(nurse, patient):
    assert _book(nurse, patient["id"], start="10:00", end="09:00").status_code == 422
    assert _book(nurse, patient["id"],
                 day=clinic_today() - timedelta(days=1)).status_code == 400
    assert _book(nurse, patient["id"]).status_code == 201
    assert _book(nurse, patient["id"], start="09:15", end="09:45").status_code == 409
    assert _book(nurse, patient["id"], start="09:30", end="10:00").status_code == 201


def test_staff_reschedule_needs_confirmation_again(nurse, coordinator, patient):
    appointment = _book(nurse, patient["id"]).json()
    path = f"/appointments/{appointment['id']}"
    coordinator.post(f"{path}/confirm")

    tomorrow = str(clinic_today() + timedelta(days=1))
    moved = nurse.patch(path, json={"scheduled_date": tomorrow}).json()
    assert moved["scheduled_date"] == tomorrow
    assert moved["status"] == "pending"

    coordinator.post(f"{path}/confirm")
    edited = nurse.patch(path, json={"notes": "Bring previous lab results"}).json()
    assert edited["status"] == "confirmed"


def test_check_in_opens_a_visit_for_a_confirmed_appointment(nurse, coordinator, patient):
    appointment = _book(nurse, patient["id"], reason="Medical clearance for PE").json()
    path = f"/appointments/{appointment['id']}"
    assert nurse.post(f"{path}/check-in").status_code == 409

    coordinator.post(f"{path}/confirm")
    visit = nurse.post(f"{path}/check-in")
    assert visit.status_code == 201
    assert visit.json()["complaint"] == "Medical clearance for PE"
    assert visit.json()["appointment_id"] == appointment["id"]

    today = nurse.get("/appointments/today").json()
    assert [a["status"] for a in today] == ["checked_in"]

    nurse.post(f"/visits/{visit.json()['id']}/complete")
    assert nurse.get("/appointments/today").json()[0]["status"] == "completed"


def test_cancelling_the_visit_reopens_the_appointment(nurse, coordinator, patient):
    appointment = _book(coordinator, patient["id"]).json()
    visit = nurse.post(f"/appointments/{appointment['id']}/check-in").json()
    nurse.post(f"/visits/{visit['id']}/cancel")
    assert nurse.get("/appointments/today").json()[0]["status"] == "confirmed"


def test_calendar_and_day_listing(nurse, coordinator, patient):
    today = clinic_today()
    _book(nurse, patient["id"], start="09:00", end="09:30")
    cancelled = _book(nurse, patient["id"], start="14:00", end="14:30").json()
    coordinator.post(f"/appointments/{cancelled['id']}/cancel")

    calendar = nurse.get("/appointments/calendar",
                         params={"year": today.year, "month": today.month}).json()
    assert calendar == [{"date": str(today), "appointment_count": 1}]
    assert len(nurse.get("/appointments/today").json()) == 1
    listing = nurse.get("/appointments", params={"status": "cancelled"}).json()
    assert listing["total"] == 1


def test_no_show(nurse, coordinator, patient):
    appointment = _book(coordinator, patient["id"]).json()
    marked = nurse.post(f"/appointments/{appointment['id']}/no-show")
    assert marked.json()["status"] == "no_show"
