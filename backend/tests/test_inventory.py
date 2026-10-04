# Tests for the medicine inventory, releases and low-stock alerts.

from tests.conftest import check_in


def test_create_medicine_logs_opening_stock(nurse, medicine):
    assert medicine["display_name"] == "Paracetamol 500 mg"
    assert medicine["quantity_on_hand"] == 30
    assert medicine["is_low_stock"] is False
    movements = nurse.get("/inventory/movements").json()["items"]
    assert [(m["movement_type"], m["quantity_change"], m["balance_after"])
            for m in movements] == [("stock_in", 30, 30)]


def test_duplicate_medicine_is_rejected(nurse, medicine):
    response = nurse.post("/inventory/medicines",
                          json={"name": "paracetamol", "strength": "500 mg"})
    assert response.status_code == 409


def test_release_deducts_stock_and_appears_in_release_log(nurse, patient, medicine):
    visit = check_in(nurse, patient["id"])
    released = nurse.post(f"/visits/{visit['id']}/medicines", json={
        "medicine_id": medicine["id"], "quantity": 2, "instructions": "After meals"})
    assert released.status_code == 201
    given = released.json()["medicines"]
    assert [(m["medicine_name"], m["quantity"]) for m in given] == [("Paracetamol 500 mg", 2)]
    assert given[0]["dispensed_by_name"] == "Reyes, Ana"

    assert nurse.get(f"/inventory/medicines/{medicine['id']}").json()["quantity_on_hand"] == 28

    log = nurse.get("/inventory/movements", params={"movement_type": "release"}).json()
    assert log["total"] == 1
    entry = log["items"][0]
    assert entry["quantity_change"] == -2
    assert entry["balance_after"] == 28
    assert entry["patient_name"] == "Santos, Maria"
    assert entry["patient_id_number"] == "20221187"


def test_cannot_release_more_than_is_in_stock(nurse, patient, medicine):
    visit = check_in(nurse, patient["id"])
    response = nurse.post(f"/visits/{visit['id']}/medicines",
                          json={"medicine_id": medicine["id"], "quantity": 31})
    assert response.status_code == 400
    assert "Not enough stock" in response.json()["detail"]
    assert nurse.get(f"/inventory/medicines/{medicine['id']}").json()["quantity_on_hand"] == 30


def test_low_stock_alert_fires_once_when_threshold_is_crossed(nurse, coordinator, patient,
                                                             medicine):
    visit = check_in(nurse, patient["id"])
    nurse.post(f"/visits/{visit['id']}/medicines",
               json={"medicine_id": medicine["id"], "quantity": 9})
    assert nurse.get("/inventory/low-stock").json() == []

    nurse.post(f"/visits/{visit['id']}/medicines",
               json={"medicine_id": medicine["id"], "quantity": 3})
    nurse.post(f"/visits/{visit['id']}/medicines",
               json={"medicine_id": medicine["id"], "quantity": 1})

    low = nurse.get("/inventory/low-stock").json()
    assert [(m["display_name"], m["quantity_on_hand"]) for m in low] == [("Paracetamol 500 mg", 17)]

    for account in (nurse, coordinator):
        alerts = [n for n in account.get("/notifications").json()["items"]
                  if n["type"] == "low_stock"]
        assert len(alerts) == 1
        assert alerts[0]["title"] == "Low stock: Paracetamol 500 mg"
        assert alerts[0]["body"] == "18 left (threshold 20)"


def test_undo_release_returns_stock(nurse, patient, medicine):
    visit = check_in(nurse, patient["id"])
    released = nurse.post(f"/visits/{visit['id']}/medicines",
                          json={"medicine_id": medicine["id"], "quantity": 5}).json()
    entry_id = released["medicines"][0]["id"]
    undone = nurse.delete(f"/visits/{visit['id']}/medicines/{entry_id}")
    assert undone.status_code == 200
    assert undone.json()["medicines"] == []
    assert nurse.get(f"/inventory/medicines/{medicine['id']}").json()["quantity_on_hand"] == 30


def test_stock_in_and_adjustment(nurse, coordinator, medicine):
    stocked = coordinator.post(f"/inventory/medicines/{medicine['id']}/stock-in",
                               json={"quantity": 100, "reason": "Delivery"})
    assert stocked.json()["quantity_on_hand"] == 130

    adjusted = nurse.post(f"/inventory/medicines/{medicine['id']}/adjust",
                          json={"new_quantity": 120, "reason": "10 expired"})
    assert adjusted.json()["quantity_on_hand"] == 120

    types = [m["movement_type"] for m in nurse.get(
        "/inventory/movements", params={"medicine_id": medicine["id"]}).json()["items"]]
    assert types == ["adjustment", "stock_in", "stock_in"]


def test_doctor_can_view_but_not_change_inventory(doctor, medicine):
    assert doctor.get("/inventory/medicines").status_code == 200
    assert doctor.post(f"/inventory/medicines/{medicine['id']}/stock-in",
                       json={"quantity": 5}).status_code == 403
    assert doctor.patch(f"/inventory/medicines/{medicine['id']}",
                        json={"low_stock_threshold": 5}).status_code == 403


def test_cancel_is_blocked_after_medicine_was_given(nurse, patient, medicine):
    visit = check_in(nurse, patient["id"])
    nurse.post(f"/visits/{visit['id']}/medicines",
               json={"medicine_id": medicine["id"], "quantity": 1})
    assert nurse.post(f"/visits/{visit['id']}/cancel").status_code == 409
