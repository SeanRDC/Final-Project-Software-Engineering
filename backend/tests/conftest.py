# Shared test fixtures that give every test an empty database, one account per role and an API client.

import os
import tempfile
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="hau-sync-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_TMP / 'test.db').as_posix()}"
os.environ["UPLOAD_DIR"] = str(_TMP / "uploads")
os.environ["BACKUP_DIR"] = str(_TMP / "backups")
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
os.environ["DEBUG"] = "True"
os.environ["MAX_UPLOAD_MB"] = "1"
# The API is tested on its own, whether or not a frontend build is lying around.
os.environ["FRONTEND_DIST"] = str(_TMP / "no-frontend")

import pytest
from fastapi.testclient import TestClient

from app.core.permissions import Role
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import User
from main import app

API = "/api/v1"
PASSWORD = "clinic-pass-123"
ACCOUNTS = {
    "coordinator": ("coordinator", "Salazar, CJ", Role.COORDINATOR, "Clinic Coordinator"),
    "nurse": ("nurse", "Reyes, Ana", Role.CLINIC_STAFF, "Nurse"),
    "assistant": ("assistant", "Cruz, Ben", Role.CLINIC_STAFF, "Student Assistant"),
    "doctor": ("doctor", "Dr. Villareal", Role.DOCTOR, "Attending Physician"),
}


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    password_hash = hash_password(PASSWORD)
    with SessionLocal() as db:
        for username, full_name, role, job_title in ACCOUNTS.values():
            db.add(User(username=username, full_name=full_name, role=role.value,
                        job_title=job_title, password_hash=password_hash))
        db.commit()
    yield


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


class Api:
    def __init__(self, client: TestClient, username: str):
        self.client = client
        response = client.post(f"{API}/auth/login",
                               data={"username": username, "password": PASSWORD})
        assert response.status_code == 200, response.text
        self.user = response.json()["user"]
        self.headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    def request(self, method: str, path: str, **kwargs):
        return self.client.request(method, f"{API}{path}", headers=self.headers, **kwargs)

    def get(self, path: str, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self.request("POST", path, **kwargs)

    def patch(self, path: str, **kwargs):
        return self.request("PATCH", path, **kwargs)

    def put(self, path: str, **kwargs):
        return self.request("PUT", path, **kwargs)

    def delete(self, path: str, **kwargs):
        return self.request("DELETE", path, **kwargs)


@pytest.fixture
def coordinator(client):
    return Api(client, "coordinator")


@pytest.fixture
def nurse(client):
    return Api(client, "nurse")


@pytest.fixture
def assistant(client):
    return Api(client, "assistant")


@pytest.fixture
def doctor(client):
    return Api(client, "doctor")


@pytest.fixture
def patient(nurse):
    response = nurse.post("/patients", json={
        "patient_type": "student",
        "id_number": "20221187",
        "last_name": "Santos",
        "first_name": "Maria",
        "birth_date": "2006-03-14",
        "sex": "female",
        "department": "School of Computing",
        "allergies": "Penicillin",
        "activity_restrictions": "No strenuous physical activity",
    })
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def medicine(nurse):
    response = nurse.post("/inventory/medicines", json={
        "name": "Paracetamol", "strength": "500 mg", "form": "tablet", "unit": "tablet",
        "quantity_on_hand": 30, "low_stock_threshold": 20,
    })
    assert response.status_code == 201, response.text
    return response.json()


def check_in(api: Api, patient_id: int, **overrides) -> dict:
    payload = {"patient_id": patient_id, "complaint": "Headache", **overrides}
    response = api.post("/visits", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
