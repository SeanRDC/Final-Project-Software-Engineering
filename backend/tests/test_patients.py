# Tests for patient records, search, corrections and archiving.


def _register(api, id_number, last_name, first_name, department, patient_type="student"):
    response = api.post("/patients", json={
        "patient_type": patient_type, "id_number": id_number, "last_name": last_name,
        "first_name": first_name, "department": department})
    assert response.status_code == 201, response.text
    return response.json()


def test_register_and_view_patient(nurse, patient):
    detail = nurse.get(f"/patients/{patient['id']}").json()
    assert detail["full_name"] == "Santos, Maria"
    assert detail["allergies"] == "Penicillin"
    assert detail["activity_restrictions"] == "No strenuous physical activity"
    assert detail["age"] is not None
    assert detail["visit_count"] == 0


def test_duplicate_id_number_is_rejected(nurse, patient):
    response = nurse.post("/patients", json={
        "patient_type": "student", "id_number": "20221187",
        "last_name": "Other", "first_name": "Person"})
    assert response.status_code == 409


def test_search_by_number_last_name_and_department(nurse, patient):
    _register(nurse, "20240556", "Panergo", "Mark", "School of Engineering")
    _register(nurse, "EMP-0042", "Miranda", "Gil", "School of Computing", "employee")

    def found(**params):
        body = nurse.get("/patients", params=params).json()
        return sorted(p["id_number"] for p in body["items"]), body["total"]

    assert found(q="20221187") == (["20221187"], 1)
    assert found(q="2024") == (["20240556"], 1)
    assert found(q="pan") == (["20240556"], 1)
    assert found(q="Santos, Maria") == (["20221187"], 1)
    assert found(department="computing") == (["20221187", "EMP-0042"], 2)
    assert found(patient_type="employee") == (["EMP-0042"], 1)
    assert found(q="100%") == ([], 0)
    assert found()[1] == 3


def test_search_is_paginated(nurse):
    for number in range(5):
        _register(nurse, f"2025000{number}", f"Student{number}", "Test", "SOC")
    body = nurse.get("/patients", params={"page": 2, "page_size": 2}).json()
    assert body["total"] == 5
    assert [p["last_name"] for p in body["items"]] == ["Student2", "Student3"]


def test_update_corrects_and_clears_fields(nurse, patient):
    response = nurse.patch(f"/patients/{patient['id']}", json={
        "last_name": "Santos-Reyes", "allergies": None, "medical_conditions": "Asthma"})
    assert response.status_code == 200
    body = response.json()
    assert body["last_name"] == "Santos-Reyes"
    assert body["allergies"] is None
    assert body["medical_conditions"] == "Asthma"
    assert body["department"] == "School of Computing"


def test_doctor_can_update_medical_history_but_not_archive(doctor, patient):
    assert doctor.patch(f"/patients/{patient['id']}",
                        json={"medical_conditions": "G6PD deficiency"}).status_code == 200
    assert doctor.post(f"/patients/{patient['id']}/archive").status_code == 403


def test_archive_hides_patient_from_search(coordinator, nurse, patient):
    assert nurse.post(f"/patients/{patient['id']}/archive").status_code == 403
    assert coordinator.post(f"/patients/{patient['id']}/archive").status_code == 200
    assert nurse.get("/patients").json()["total"] == 0
    assert nurse.get("/patients", params={"include_archived": True}).json()["total"] == 1
    blocked = nurse.post("/visits", json={"patient_id": patient["id"], "complaint": "Cough"})
    assert blocked.status_code == 400
    assert coordinator.post(f"/patients/{patient['id']}/restore").status_code == 200
    assert nurse.get("/patients").json()["total"] == 1


def test_missing_patient_is_404(nurse):
    assert nurse.get("/patients/999").status_code == 404
