# Tests for edit locking, attachments, the audit log, notifications, options and live events.

from datetime import timedelta

from app.core.clock import utcnow
from app.models import RecordLock
from tests.conftest import API, check_in


def test_locked_patient_record_is_read_only_for_others(nurse, doctor, patient):
    path = f"/locks/patient/{patient['id']}"
    assert nurse.get(path).json() is None

    lock = doctor.put(path)
    assert lock.status_code == 200
    assert lock.json()["locked_by_name"] == "Dr. Villareal"

    blocked = nurse.patch(f"/patients/{patient['id']}", json={"notes": "x"})
    assert blocked.status_code == 423
    assert blocked.json()["locked_by"] == "Dr. Villareal"
    assert nurse.put(path).status_code == 423
    assert nurse.get(f"/patients/{patient['id']}").status_code == 200
    assert doctor.patch(f"/patients/{patient['id']}",
                        json={"medical_conditions": "Asthma"}).status_code == 200

    assert nurse.delete(path).status_code == 403
    assert doctor.delete(path).status_code == 204
    assert nurse.patch(f"/patients/{patient['id']}", json={"notes": "x"}).status_code == 200


def test_doctor_lock_on_visit_blocks_the_front_desk_only_for_that_visit(nurse, doctor, patient):
    visit = check_in(nurse, patient["id"])
    other = nurse.post("/patients", json={
        "patient_type": "student", "id_number": "20230011", "last_name": "Reyes",
        "first_name": "Paolo"}).json()
    other_visit = check_in(nurse, other["id"])

    assert doctor.put(f"/locks/visit/{visit['id']}").status_code == 200
    assert nurse.get(f"/visits/{visit['id']}").json()["lock"]["locked_by_name"] == "Dr. Villareal"
    assert nurse.patch(f"/visits/{visit['id']}", json={"remarks": "x"}).status_code == 423
    assert nurse.post(f"/visits/{visit['id']}/complete").status_code == 423
    assert nurse.patch(f"/visits/{other_visit['id']}", json={"remarks": "ok"}).status_code == 200

    done = doctor.post(f"/visits/{visit['id']}/complete").json()
    assert done["lock"] is None
    assert nurse.patch(f"/visits/{visit['id']}", json={"remarks": "x"}).status_code == 200


def test_lock_expires_and_coordinator_can_release(nurse, doctor, coordinator, patient, db):
    path = f"/locks/patient/{patient['id']}"
    doctor.put(path)
    assert coordinator.delete(path).status_code == 204

    doctor.put(path)
    lock = db.query(RecordLock).one()
    lock.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()
    assert nurse.get(path).json() is None
    assert nurse.put(path).json()["locked_by_name"] == "Reyes, Ana"


def test_lock_rejects_unknown_resources(nurse):
    assert nurse.put("/locks/medicine/1").status_code == 400
    assert nurse.put("/locks/patient/999").status_code == 404


def test_upload_list_download_and_delete_attachment(nurse, coordinator, patient):
    content = b"%PDF-1.4 lab result"
    uploaded = nurse.post(
        f"/patients/{patient['id']}/attachments",
        files={"file": ("cbc-result.pdf", content, "application/pdf")},
        data={"description": "CBC result"},
    )
    assert uploaded.status_code == 201, uploaded.text
    attachment = uploaded.json()
    assert attachment["original_filename"] == "cbc-result.pdf"
    assert attachment["size_bytes"] == len(content)
    assert attachment["description"] == "CBC result"

    listing = nurse.get(f"/patients/{patient['id']}/attachments").json()
    assert [a["id"] for a in listing] == [attachment["id"]]

    download = nurse.get(f"/attachments/{attachment['id']}/download")
    assert download.status_code == 200
    assert download.content == content
    assert download.headers["content-type"] == "application/pdf"

    assert nurse.delete(f"/attachments/{attachment['id']}").status_code == 403
    assert coordinator.delete(f"/attachments/{attachment['id']}").status_code == 204
    assert nurse.get(f"/attachments/{attachment['id']}/download").status_code == 404


def test_attachment_rules(nurse, patient):
    path = f"/patients/{patient['id']}/attachments"
    exe = nurse.post(path, files={"file": ("tool.exe", b"MZ", "application/octet-stream")})
    assert exe.status_code == 400
    empty = nurse.post(path, files={"file": ("empty.pdf", b"", "application/pdf")})
    assert empty.status_code == 400
    too_big = nurse.post(path, files={"file": ("big.pdf", b"0" * (1024 * 1024 + 1),
                                               "application/pdf")})
    assert too_big.status_code == 400
    traversal = nurse.post(path, files={"file": ("../../evil.txt", b"hi", "text/plain")})
    assert traversal.status_code == 201
    assert traversal.json()["original_filename"] == "evil.txt"


def test_attachment_must_match_the_visits_patient(nurse, patient):
    other = nurse.post("/patients", json={
        "patient_type": "student", "id_number": "20230011", "last_name": "Reyes",
        "first_name": "Paolo"}).json()
    visit = check_in(nurse, other["id"])
    response = nurse.post(
        f"/patients/{patient['id']}/attachments",
        files={"file": ("scan.png", b"png", "image/png")},
        data={"visit_id": str(visit["id"])},
    )
    assert response.status_code == 400


def test_audit_log_records_access_and_is_coordinator_only(nurse, coordinator, patient):
    nurse.get(f"/patients/{patient['id']}")
    nurse.patch(f"/patients/{patient['id']}", json={"notes": "Updated"})

    assert nurse.get("/audit-logs").status_code == 403
    logs = coordinator.get("/audit-logs", params={"entity_type": "patient",
                                                  "entity_id": patient["id"]}).json()
    actions = [entry["action"] for entry in logs["items"]]
    assert actions == ["patient.update", "patient.view", "patient.create"]
    assert {entry["username"] for entry in logs["items"]} == {"nurse"}

    logins = coordinator.get("/audit-logs", params={"action": "auth.login"}).json()
    assert logins["total"] >= 2


def test_failed_login_is_audited(client, coordinator):
    client.post(f"{API}/auth/login", data={"username": "nurse", "password": "wrong"})
    failed = coordinator.get("/audit-logs", params={"action": "auth.login_failed"}).json()
    assert failed["total"] == 1
    assert failed["items"][0]["username"] == "nurse"


def test_notifications_read_state_is_per_user(nurse, doctor, patient, medicine):
    visit = check_in(nurse, patient["id"])
    nurse.post(f"/visits/{visit['id']}/medicines",
               json={"medicine_id": medicine["id"], "quantity": 10})
    assert nurse.get("/notifications").json()["unread_count"] == 1
    assert doctor.get("/notifications").json()["unread_count"] == 1

    notification_id = nurse.get("/notifications").json()["items"][0]["id"]
    nurse.post(f"/notifications/{notification_id}/read")
    after = nurse.get("/notifications").json()
    assert after["unread_count"] == 0
    assert after["items"][0]["is_read"] is True
    assert nurse.get("/notifications", params={"unread_only": True}).json()["items"] == []
    assert doctor.get("/notifications").json()["unread_count"] == 1

    doctor.post("/notifications/read-all")
    assert doctor.get("/notifications").json()["unread_count"] == 0


def test_options_lists_departments_and_enums(nurse, patient):
    options = nurse.get("/options").json()
    assert options["departments"] == ["School of Computing"]
    assert options["enums"]["visit_status"] == ["open", "completed", "cancelled"]
    assert options["enums"]["role"] == ["coordinator", "doctor", "clinic_staff"]


def test_websocket_requires_a_token_and_pushes_visit_events(client, nurse, patient):
    token = nurse.headers["Authorization"].split()[1]
    with client.websocket_connect(f"{API}/ws?token={token}") as websocket:
        websocket.send_text("ping")
        assert websocket.receive_json()["event"] == "pong"
        visit = check_in(nurse, patient["id"])
        message = websocket.receive_json()
        assert message["event"] == "visits.updated"
        assert message["data"] == {"visit_id": visit["id"], "status": "open"}


def test_websocket_rejects_missing_token(client):
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"{API}/ws"):
            pass
