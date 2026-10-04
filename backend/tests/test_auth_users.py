# Tests for login, role permissions and account management.

from tests.conftest import API, PASSWORD, Api


def test_login_returns_token_and_permissions(client):
    response = client.post(f"{API}/auth/login", data={"username": "nurse", "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "clinic_staff"
    assert "visits:record" in body["user"]["permissions"]
    assert "users:manage" not in body["user"]["permissions"]


def test_login_rejects_wrong_password(client):
    response = client.post(f"{API}/auth/login", data={"username": "nurse", "password": "nope"})
    assert response.status_code == 401


def test_endpoints_require_a_token(client):
    assert client.get(f"{API}/patients").status_code == 401
    assert client.get(f"{API}/dashboard").status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get(f"{API}/patients", headers=bad).status_code == 401


def test_nurse_and_student_assistant_have_the_same_access(nurse, assistant):
    assert nurse.user["role"] == assistant.user["role"] == "clinic_staff"
    assert nurse.user["permissions"] == assistant.user["permissions"]
    assert assistant.user["job_title"] == "Student Assistant"


def test_only_coordinator_manages_users(coordinator, nurse, doctor, client):
    new_user = {"username": "nurse2", "full_name": "Lim, Joy", "role": "clinic_staff",
                "job_title": "Nurse", "password": "another-pass-1"}
    assert nurse.post("/users", json=new_user).status_code == 403
    assert doctor.get("/users").status_code == 403

    created = coordinator.post("/users", json=new_user)
    assert created.status_code == 201
    assert created.json()["must_change_password"] is True
    assert coordinator.post("/users", json=new_user).status_code == 409

    login = client.post(f"{API}/auth/login",
                        data={"username": "nurse2", "password": "another-pass-1"})
    assert login.status_code == 200


def test_deactivated_account_cannot_log_in_or_use_its_token(coordinator, nurse, client):
    nurse_id = nurse.user["id"]
    assert coordinator.patch(f"/users/{nurse_id}", json={"is_active": False}).status_code == 200
    assert nurse.get("/patients").status_code == 401
    login = client.post(f"{API}/auth/login", data={"username": "nurse", "password": PASSWORD})
    assert login.status_code == 401


def test_last_coordinator_cannot_be_demoted(coordinator):
    me = coordinator.user["id"]
    assert coordinator.patch(f"/users/{me}", json={"role": "doctor"}).status_code == 400
    assert coordinator.patch(f"/users/{me}", json={"is_active": False}).status_code == 400


def test_change_and_reset_password(coordinator, nurse, client):
    wrong = nurse.post("/auth/change-password",
                       json={"current_password": "wrong", "new_password": "brand-new-pass"})
    assert wrong.status_code == 400
    changed = nurse.post("/auth/change-password",
                         json={"current_password": PASSWORD, "new_password": "brand-new-pass"})
    assert changed.status_code == 200
    assert client.post(f"{API}/auth/login",
                       data={"username": "nurse", "password": PASSWORD}).status_code == 401

    reset = coordinator.post(f"/users/{nurse.user['id']}/reset-password",
                             json={"new_password": "reset-pass-99"})
    assert reset.status_code == 200
    assert Api(client, "coordinator").user["username"] == "coordinator"
    assert client.post(f"{API}/auth/login",
                       data={"username": "nurse", "password": "reset-pass-99"}).status_code == 200


def test_short_password_is_rejected(coordinator):
    response = coordinator.post("/users", json={
        "username": "weak", "full_name": "Weak", "role": "doctor", "password": "short"})
    assert response.status_code == 422


def test_health_is_public(client):
    response = client.get(f"{API}/health")
    assert response.status_code == 200
    assert response.json()["database"] is True
