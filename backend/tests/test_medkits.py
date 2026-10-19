# Tests for medical kits: requests, issuing from stock, returns, losses and overdue kits.

from datetime import timedelta

import pytest

from app.core.clock import clinic_today


def _medicine(api, name, quantity, unit="tablet"):
    response = api.post("/inventory/medicines", json={
        "name": name, "strength": "", "form": unit, "unit": unit,
        "quantity_on_hand": quantity, "low_stock_threshold": 5})
    assert response.status_code == 201, response.text
    return response.json()


def _stock(api, medicine):
    return api.get(f"/inventory/medicines/{medicine['id']}").json()["quantity_on_hand"]


@pytest.fixture
def stock(nurse):
    return {
        "loperamide": _medicine(nurse, "Loperamide", 40),
        "mefenamic": _medicine(nurse, "Mefenamic Acid 500 mg", 30),
        "gauze": _medicine(nurse, "Gauze", 10, unit="pack"),
    }


@pytest.fixture
def kit(coordinator):
    response = coordinator.post("/medkits", json={"kit_number": 3, "label": "Red bag"})
    assert response.status_code == 201, response.text
    return response.json()


def _request(api, days_from_today=1, **overrides):
    payload = {
        "organization": "Junior Philippine Computer Society",
        "activity": "Intramurals 2026",
        "activity_date": str(clinic_today() + timedelta(days=days_from_today)),
        "venue": "University gym",
        "person_responsible": "Dela Cruz, Juan",
        "contact_number": "0917 555 0100",
        "requested_by": "Lim, Joseph",
        "request_date": str(clinic_today()),
        **overrides,
    }
    response = api.post("/medkit-requests", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _issue(api, request, kit, items):
    return api.post(f"/medkit-requests/{request['id']}/issue", json={
        "medkit_id": kit["id"],
        "items": [{"medicine_id": m["id"], "quantity": q} for m, q in items]})


def test_a_request_takes_no_stock(nurse, stock, kit):
    request = _request(nurse)
    assert request["status"] == "requested"
    assert request["medkit"] is None
    assert _stock(nurse, stock["loperamide"]) == 40


def test_issuing_a_kit_takes_its_contents_out_of_stock(nurse, stock, kit):
    request = _request(nurse)
    response = _issue(nurse, request, kit, [(stock["loperamide"], 10), (stock["gauze"], 2)])
    assert response.status_code == 200, response.text
    issued = response.json()
    assert issued["status"] == "issued"
    assert issued["medkit"]["kit_number"] == 3
    assert issued["issued_by_name"] == "Reyes, Ana"
    assert [(i["medicine_name"], i["quantity_issued"]) for i in issued["items"]] == [
        ("Loperamide", 10), ("Gauze", 2)]

    assert _stock(nurse, stock["loperamide"]) == 30
    assert _stock(nurse, stock["gauze"]) == 8
    kits = nurse.get("/medkits").json()
    assert kits[0]["status"] == "out"
    assert kits[0]["current_request"]["organization"] == "Junior Philippine Computer Society"

    log = nurse.get("/inventory/movements", params={"movement_type": "release"}).json()["items"]
    assert {entry["medkit_label"] for entry in log} == {"Medical kit #3 – Intramurals 2026"}


def test_a_short_item_stops_the_whole_issue(nurse, stock, kit):
    request = _request(nurse)
    response = _issue(nurse, request, kit, [(stock["loperamide"], 10), (stock["gauze"], 11)])
    assert response.status_code == 400
    assert "Gauze" in response.json()["detail"]
    assert _stock(nurse, stock["loperamide"]) == 40
    assert _stock(nurse, stock["gauze"]) == 10
    assert nurse.get(f"/medkit-requests/{request['id']}").json()["status"] == "requested"
    assert nurse.get("/medkits").json()[0]["status"] == "available"


def test_a_kit_that_is_out_cannot_be_issued_again(nurse, stock, kit):
    _issue(nurse, _request(nurse), kit, [(stock["loperamide"], 1)])
    second = _request(nurse, activity="Foundation day")
    response = _issue(nurse, second, kit, [(stock["loperamide"], 1)])
    assert response.status_code == 409
    assert "Kit #3" in response.json()["detail"]


def test_an_issue_needs_at_least_one_item_and_no_repeats(nurse, stock, kit):
    request = _request(nurse)
    assert _issue(nurse, request, kit, []).status_code == 422
    repeated = _issue(nurse, request, kit, [(stock["gauze"], 1), (stock["gauze"], 1)])
    assert repeated.status_code == 400


def test_returning_puts_back_what_came_back(nurse, stock, kit):
    request = _request(nurse)
    issued = _issue(nurse, request, kit, [(stock["loperamide"], 10), (stock["gauze"], 2)]).json()
    lines = {item["medicine_name"]: item["id"] for item in issued["items"]}
    response = nurse.post(f"/medkit-requests/{request['id']}/return", json={"items": [
        {"item_id": lines["Loperamide"], "quantity_returned": 6},
        {"item_id": lines["Gauze"], "quantity_returned": 2}]})
    assert response.status_code == 200, response.text
    returned = response.json()
    assert returned["status"] == "returned"
    assert [(i["quantity_returned"], i["quantity_used"]) for i in returned["items"]] == [
        (6, 4), (2, 0)]

    assert _stock(nurse, stock["loperamide"]) == 36
    assert _stock(nurse, stock["gauze"]) == 10
    assert nurse.get("/medkits").json()[0]["status"] == "available"


def test_a_return_cannot_bring_back_more_than_was_issued(nurse, stock, kit):
    request = _request(nurse)
    issued = _issue(nurse, request, kit, [(stock["gauze"], 2)]).json()
    response = nurse.post(f"/medkit-requests/{request['id']}/return", json={"items": [
        {"item_id": issued["items"][0]["id"], "quantity_returned": 3}]})
    assert response.status_code == 400
    assert _stock(nurse, stock["gauze"]) == 8


def test_a_return_must_count_every_item(nurse, stock, kit):
    request = _request(nurse)
    _issue(nurse, request, kit, [(stock["gauze"], 2), (stock["loperamide"], 1)])
    response = nurse.post(f"/medkit-requests/{request['id']}/return", json={"items": []})
    assert response.status_code == 400


def test_a_lost_kit_returns_nothing_to_stock(nurse, stock, kit):
    request = _request(nurse)
    _issue(nurse, request, kit, [(stock["gauze"], 2)])
    response = nurse.post(f"/medkit-requests/{request['id']}/lost",
                          json={"notes": "Left at the venue"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "lost"
    assert _stock(nurse, stock["gauze"]) == 8
    assert nurse.get("/medkits").json()[0]["status"] == "lost"


def test_the_coordinator_puts_a_replaced_kit_back_in_service(nurse, coordinator, stock, kit):
    request = _request(nurse)
    _issue(nurse, request, kit, [(stock["gauze"], 1)])
    nurse.post(f"/medkit-requests/{request['id']}/lost", json={})
    assert nurse.patch(f"/medkits/{kit['id']}", json={"status": "available"}).status_code == 403
    response = coordinator.patch(f"/medkits/{kit['id']}", json={"status": "available"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "available"


def test_only_a_request_not_yet_issued_can_be_cancelled(nurse, stock, kit):
    waiting = _request(nurse)
    assert nurse.post(f"/medkit-requests/{waiting['id']}/cancel").json()["status"] == "cancelled"

    out = _request(nurse, activity="Foundation day")
    _issue(nurse, out, kit, [(stock["gauze"], 1)])
    assert nurse.post(f"/medkit-requests/{out['id']}/cancel").status_code == 409


def test_an_overdue_kit_is_flagged_and_notified_once(nurse, stock, kit):
    request = _request(nurse, days_from_today=-2)
    _issue(nurse, request, kit, [(stock["gauze"], 1)])

    listed = nurse.get("/medkit-requests").json()["items"]
    assert listed[0]["is_overdue"] is True
    nurse.get("/medkit-requests")
    overdue = [n for n in nurse.get("/notifications").json()["items"]
               if n["type"] == "medkit_overdue"]
    assert len(overdue) == 1
    assert "Kit #3" in overdue[0]["title"]


def test_requests_filter_by_status(nurse, stock, kit):
    _request(nurse)
    issued = _request(nurse, activity="Foundation day")
    _issue(nurse, issued, kit, [(stock["gauze"], 1)])
    body = nurse.get("/medkit-requests", params={"status": "issued"}).json()
    assert [r["activity"] for r in body["items"]] == ["Foundation day"]
    assert nurse.get("/medkit-requests").json()["total"] == 2


def test_the_standard_contents_are_set_by_the_coordinator(nurse, coordinator, stock):
    contents = [{"medicine_id": stock["loperamide"]["id"], "default_quantity": 10},
                {"medicine_id": stock["mefenamic"]["id"], "default_quantity": 20}]
    assert nurse.put("/medkits/template", json=contents).status_code == 403
    response = coordinator.put("/medkits/template", json=contents)
    assert response.status_code == 200, response.text
    assert [(i["medicine_name"], i["default_quantity"]) for i in nurse.get(
        "/medkits/template").json()] == [("Loperamide", 10), ("Mefenamic Acid 500 mg", 20)]


def test_kit_numbers_are_unique(coordinator, kit):
    assert coordinator.post("/medkits", json={"kit_number": 3}).status_code == 409


def test_the_doctor_reads_kits_but_does_not_issue_them(doctor, nurse, stock, kit):
    request = _request(nurse)
    assert doctor.get("/medkit-requests").status_code == 200
    assert doctor.get(f"/medkit-requests/{request['id']}").status_code == 200
    assert _issue(doctor, request, kit, [(stock["gauze"], 1)]).status_code == 403
    assert doctor.post("/medkit-requests", json={}).status_code == 403


def test_every_step_is_audited(nurse, coordinator, stock, kit):
    request = _request(nurse)
    issued = _issue(nurse, request, kit, [(stock["gauze"], 1)]).json()
    nurse.post(f"/medkit-requests/{request['id']}/return", json={"items": [
        {"item_id": issued["items"][0]["id"], "quantity_returned": 1}]})
    actions = [e["action"] for e in coordinator.get(
        "/audit-logs", params={"entity_type": "medkit_request"}).json()["items"]]
    assert actions == ["medkit_request.return", "medkit_request.issue", "medkit_request.create"]


def test_opening_the_dashboard_flags_overdue_kits(nurse, stock, kit):
    request = _request(nurse, days_from_today=-1)
    _issue(nurse, request, kit, [(stock["gauze"], 1)])
    nurse.get("/dashboard")
    types = [n["type"] for n in nurse.get("/notifications").json()["items"]]
    assert "medkit_overdue" in types
