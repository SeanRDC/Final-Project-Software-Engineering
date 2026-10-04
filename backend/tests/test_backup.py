# Tests that the backup tool restores the database and uploaded files.

from scripts import backup


def test_backup_and_restore_round_trip(nurse, patient):
    upload = nurse.post(
        f"/patients/{patient['id']}/attachments",
        files={"file": ("lab.pdf", b"%PDF lab", "application/pdf")},
    ).json()
    archive = backup.create()
    assert archive in backup.list_backups()

    nurse.patch(f"/patients/{patient['id']}", json={"last_name": "Changed"})
    nurse.post("/patients", json={"patient_type": "student", "id_number": "20999999",
                                  "last_name": "Later", "first_name": "Added"})

    from app.db.session import engine
    engine.dispose()
    backup.restore(archive)

    assert nurse.get("/patients").json()["total"] == 1
    assert nurse.get(f"/patients/{patient['id']}").json()["last_name"] == "Santos"
    download = nurse.get(f"/attachments/{upload['id']}/download")
    assert download.content == b"%PDF lab"


def test_keep_prunes_old_backups(patient, monkeypatch):
    names = iter(["20260101-000001", "20260101-000002", "20260101-000003"])

    class FakeNow:
        def __format__(self, _spec):
            return next(names)

    class FakeDatetime:
        @staticmethod
        def now():
            return FakeNow()

    monkeypatch.setattr(backup, "datetime", FakeDatetime)
    for existing in backup.list_backups():
        existing.unlink()
    backup.create()
    backup.create()
    newest = backup.create(keep=2)
    remaining = backup.list_backups()
    assert len(remaining) == 2
    assert remaining[0] == newest
