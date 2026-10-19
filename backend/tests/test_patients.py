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


def test_medical_history_is_recorded_and_can_be_cleared(nurse, patient):
    history = "Hospitalized for dengue in 2023. Appendectomy in 2021."
    saved = nurse.patch(f"/patients/{patient['id']}", json={"medical_history": history})
    assert saved.json()["medical_history"] == history
    assert nurse.get(f"/patients/{patient['id']}").json()["medical_history"] == history

    cleared = nurse.patch(f"/patients/{patient['id']}", json={"medical_history": " "})
    assert cleared.json()["medical_history"] is None


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


def test_education_level_of_a_student_is_kept_or_read_off_the_department(nurse, patient):
    assert patient["education_level"] == "college"
    pupil = _register(nurse, "20260031", "Cruz", "Lia",
                      "Basic Education Department (Junior High School and Senior High School)")
    assert pupil["education_level"] == "basic_education"

    chosen = nurse.post("/patients", json={
        "patient_type": "student", "id_number": "20260032", "last_name": "Lim",
        "first_name": "Ana", "education_level": "basic_education"})
    assert chosen.json()["education_level"] == "basic_education"
    assert "basic_education" in nurse.get("/options").json()["enums"]["education_level"]


def test_an_employee_has_no_education_level(nurse, coordinator, patient):
    staff = nurse.post("/patients", json={
        "patient_type": "employee", "id_number": "EMP-0101", "last_name": "Ramos",
        "first_name": "Jose", "education_level": "college"})
    assert staff.json()["education_level"] is None

    hired = nurse.patch(f"/patients/{patient['id']}", json={"patient_type": "employee"})
    assert hired.json()["education_level"] is None
    entry = coordinator.get("/audit-logs", params={"action": "patient.update"}).json()["items"][-1]
    assert "education_level" in str(entry)


def test_others_patient_needs_a_description(nurse):
    response = nurse.post("/patients", json={
        "patient_type": "other", "id_number": "VIS-001", "last_name": "Lopez", "first_name": "Rita"})
    assert response.status_code == 422


def test_others_patient_without_an_id_number_gets_one(nurse):
    response = nurse.post("/patients", json={
        "patient_type": "other", "last_name": "Lopez", "first_name": "Rita",
        "other_description": "Visitor – parent of a Grade 3 student"})
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["id_number"] == f"OTH-{body['id']:06d}"
    assert body["other_description"] == "Visitor – parent of a Grade 3 student"
    assert body["education_level"] is None
    assert nurse.get("/patients", params={"patient_type": "other"}).json()["total"] == 1


def test_only_others_patients_may_leave_the_id_number_out(nurse):
    response = nurse.post("/patients", json={
        "patient_type": "student", "last_name": "Lopez", "first_name": "Rita"})
    assert response.status_code == 422


def test_generated_others_id_does_not_take_a_typed_one(nurse):
    first = nurse.post("/patients", json={
        "patient_type": "other", "last_name": "Uno", "first_name": "A",
        "other_description": "Guest"}).json()
    nurse.post("/patients", json={
        "patient_type": "other", "id_number": f"OTH-{first['id'] + 1:06d}", "last_name": "Dos",
        "first_name": "B", "other_description": "Guest"})
    third = nurse.post("/patients", json={
        "patient_type": "other", "last_name": "Tres", "first_name": "C",
        "other_description": "Guest"})
    assert third.status_code == 201, third.text
    numbers = [p["id_number"] for p in nurse.get(
        "/patients", params={"patient_type": "other"}).json()["items"]]
    assert len(set(numbers)) == 3


def test_others_description_is_cleared_when_the_type_changes(nurse):
    other = nurse.post("/patients", json={
        "patient_type": "other", "id_number": "VIS-002", "last_name": "Lopez",
        "first_name": "Rita", "other_description": "Contractor"}).json()
    body = nurse.patch(f"/patients/{other['id']}", json={"patient_type": "employee"}).json()
    assert body["other_description"] is None


def test_archive_lists_only_archived_patients_with_who_and_when(coordinator, nurse, patient):
    _register(nurse, "20240556", "Panergo", "Mark", "School of Engineering")
    coordinator.post(f"/patients/{patient['id']}/archive")

    body = nurse.get("/patients", params={"archived_only": True}).json()
    assert body["total"] == 1
    archived = body["items"][0]
    assert archived["id"] == patient["id"]
    assert archived["archived_at"] is not None
    assert archived["archived_by_name"] == "Salazar, CJ"


def test_restore_clears_who_archived_the_patient(coordinator, nurse, patient):
    coordinator.post(f"/patients/{patient['id']}/archive")
    restored = coordinator.post(f"/patients/{patient['id']}/restore").json()
    assert restored["archived_at"] is None
    assert restored["archived_by_name"] is None
    assert nurse.get("/patients", params={"archived_only": True}).json()["total"] == 0
