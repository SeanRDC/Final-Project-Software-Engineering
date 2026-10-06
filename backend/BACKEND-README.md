<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Status](https://img.shields.io/badge/Status-Work_in_Progress-FF8C00?style=for-the-badge)](#)

<br />
<div align="center">
  <h3 align="center">Backend API | HAU-Sync</h3>
  <p align="center">
    The REST and WebSocket backend of HAU-Sync, the Patient Record Management and Appointment System for the Holy Angel University Clinic.
    <br />
    <br />
    <strong>Tags:</strong> <code>python</code>, <code>fastapi</code>, <code>postgresql</code>, <code>sqlalchemy</code>, <code>api</code>, <code>backend</code>, <code>jwt-auth</code>
  </p>
</div>

> **🚧 WORK IN PROGRESS:** This backend is part of an ongoing CS-302 academic project. Routes, models and schemas may still change as requirements are refined with the University Clinic.

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-backend">About The Backend</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#roles-and-access">Roles and Access</a></li>
    <li><a href="#how-a-visit-works">How a Visit Works</a></li>
    <li><a href="#api-overview">API Overview</a></li>
    <li><a href="#requirements-coverage">Requirements Coverage</a></li>
    <li><a href="#api-architecture">API Architecture</a></li>
    <li><a href="#directory-structure">Directory Structure</a></li>
    <li><a href="#operations">Operations</a></li>
    <li><a href="#design-decisions">Design Decisions</a></li>
  </ol>
</details>

## About The Backend

The backend runs on one machine inside the clinic (the "HAU-Sync Server Host" in the site context diagram). The front desk and doctor's office clients reach it over the clinic's local network. It stores patient records, visit and consultation logs, appointments and the medicine inventory, and it pushes live updates to every connected station.

### Tech Stack

* **Language:** Python 3.10+ (developed on 3.14)
* **Framework:** FastAPI, served by Uvicorn
* **Database:** PostgreSQL for the clinic deployment; SQLite as a zero-install fallback for development
* **ORM and migrations:** SQLAlchemy 2 and Alembic
* **Validation:** Pydantic 2
* **Authentication:** JWT bearer tokens, bcrypt password hashes, role-based access control
* **Live updates:** WebSocket
* **Tests:** pytest (67 tests)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Python 3.10 or higher and `pip`
- PostgreSQL, only for the clinic deployment. Development works without it.

### Setup

Run these from the `backend` directory. The examples use Windows PowerShell.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env         # macOS/Linux: cp .env.example .env
```

Open `.env` and set `SECRET_KEY` to a long random value:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

By default `DATABASE_URL` points at a SQLite file in `backend/data/`. To use PostgreSQL, create a database and set:

```
DATABASE_URL="postgresql://user:password@localhost:5432/hau_clinic"
```

### Create the database and the first account

```powershell
alembic upgrade head
python -m scripts.create_admin --username coordinator --name "Last name, First name"
```

`create_admin` asks for the password and creates the Clinic Coordinator account. The coordinator then creates every other account through the API.

For a demo or for frontend development, fill an empty database with made-up data instead:

```powershell
python -m scripts.seed_demo
```

This creates the accounts `coordinator`, `nurse`, `assistant` and `doctor`, all with the password `hau-sync-demo`. Never run it against the clinic's real database.

### Run the server

```powershell
uvicorn main:app --reload                      # development, this machine only
uvicorn main:app --host 0.0.0.0 --port 8000    # clinic LAN, reachable by the stations
```

Interactive API documentation is at `http://localhost:8000/docs`. Click **Authorize** and log in to try the endpoints.

When serving the LAN, set `DEBUG=False` and list the frontend's addresses in `CORS_ORIGINS`. The server refuses to start with `DEBUG=False` and the placeholder `SECRET_KEY`.

### Run the tests

```powershell
pytest
```

The tests use their own temporary SQLite database and never touch `backend/data`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roles and Access

Nurses and student assistants work at the same station, so they share one role with full front-desk and clinical access. An account's `job_title` ("Nurse", "Student Assistant") is only a display label.

| Action | `coordinator` | `clinic_staff` (nurse / student assistant) | `doctor` |
| --- | :---: | :---: | :---: |
| Search, view and edit patient records | ✅ | ✅ | ✅ |
| Archive or restore a patient record | ✅ | | |
| Check in patients, record vitals and assessment, cancel a visit | ✅ | ✅ | |
| Write consultation notes, diagnosis and medication details | ✅ | | ✅ |
| Complete a visit | ✅ | ✅ | ✅ |
| Release medicine to a patient | ✅ | ✅ | |
| Add stock, adjust stock, edit medicines | ✅ | ✅ | view only |
| Book, reschedule and check in appointments | ✅ | ✅ | view only |
| Confirm or cancel an appointment | ✅ | | |
| View statistics and saved reports | ✅ | ✅ | ✅ |
| Generate and delete saved reports | ✅ | | |
| Upload and view attachments | ✅ | ✅ | ✅ |
| Delete attachments, manage accounts, read the audit log | ✅ | | |

The permission map lives in `app/core/permissions.py`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## How a Visit Works

A visit is a single record that is `open`, `completed` or `cancelled`.

1. **Check in.** The front desk logs the patient and the complaint, either as a walk-in or from a confirmed appointment. This replaces the paper logbook and opens the visit.
2. **Record.** The nurse or student assistant adds vital signs, assessment, treatment, remarks, guardian notification, referral and any medicine released.
3. **Consult, if needed.** The doctor opens the same visit, sees everything the nurse recorded without anything being handed over, and adds consultation notes, diagnosis and medication details. The doctor who writes the notes is recorded on the visit.
4. **Complete.** The nurse or the doctor completes the visit and it becomes part of the patient's permanent history. Most visits skip step 3.

`GET /visits/today` returns the day's log: open visits in order of arrival, then completed ones. A completed visit can still be corrected. A visit is never deleted, only cancelled, and it cannot be cancelled once medicine was released for it. A patient can have only one open visit at a time.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## API Overview

All routes are under `/api/v1`. Every route except `POST /auth/login` and `GET /health` needs an `Authorization: Bearer <token>` header. The full reference with request and response schemas is at `/docs`.

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| Users | `GET /users`, `POST /users`, `PATCH /users/{id}`, `POST /users/{id}/reset-password` |
| Patients | `GET /patients` (search), `POST /patients`, `GET /patients/{id}`, `PATCH /patients/{id}`, `POST /patients/{id}/archive`, `POST /patients/{id}/restore`, `GET /patients/{id}/visits` |
| Visits | `POST /visits` (check in), `GET /visits`, `GET /visits/today`, `GET /visits/{id}`, `PATCH /visits/{id}`, `PATCH /visits/{id}/consultation`, `POST /visits/{id}/complete`, `POST /visits/{id}/cancel`, `POST /visits/{id}/vitals`, `DELETE /visits/{id}/vitals/{reading_id}` |
| Medicine release | `POST /visits/{id}/medicines`, `DELETE /visits/{id}/medicines/{entry_id}` |
| Appointments | `GET /appointments`, `GET /appointments/today`, `GET /appointments/calendar`, `POST /appointments`, `PATCH /appointments/{id}`, `POST /appointments/{id}/confirm`, `/cancel`, `/no-show`, `/check-in` |
| Inventory | `GET /inventory/medicines`, `POST /inventory/medicines`, `PATCH /inventory/medicines/{id}`, `POST /inventory/medicines/{id}/stock-in`, `/adjust`, `GET /inventory/low-stock`, `GET /inventory/movements` (release log with `movement_type=release`) |
| Reports | `GET /reports/summary`, `GET /reports/summary.csv`, `GET /reports`, `POST /reports`, `GET /reports/{id}`, `GET /reports/{id}/csv`, `DELETE /reports/{id}` |
| Dashboard | `GET /dashboard` |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |
| Attachments | `GET /patients/{id}/attachments`, `POST /patients/{id}/attachments`, `GET /attachments/{id}/download`, `DELETE /attachments/{id}` |
| Record locks | `GET`, `PUT`, `DELETE /locks/{patient\|visit}/{id}` |
| Audit log | `GET /audit-logs` |
| System | `GET /health`, `GET /options`, `WS /ws?token=<token>` |

### Dashboard

`GET /dashboard` returns everything the Clinic Main Menu shows in one request: the counters (visits today, open visits, completed today, appointments today and remaining, low-stock items, visits this month), today's visit log, today's appointments, the calendar dots for the month, low-stock medicines and the latest notifications with the unread count.

### Live updates

Each station opens `ws://<server>:8000/api/v1/ws?token=<access token>` once. The server sends a small message whenever something changes, and the client reloads the affected part of the screen:

```json
{"event": "visits.updated", "data": {"visit_id": 12, "status": "open"}, "at": "2026-10-04T05:51:57+00:00"}
```

Events: `visits.updated`, `appointments.updated`, `inventory.updated`, `notifications.updated`, `lock.updated`. Sending the text `ping` returns a `pong`, which the client can time for the "Clinic server connected · 3 ms" indicator.

### Record edit locking

Before opening an edit form for a patient or a visit, the client calls `PUT /locks/{type}/{id}` and repeats the call every minute or two while the form stays open. While the lock is held, other users can still read the record, but their attempts to change it return **423 Locked** with the name of the person editing. The lock is released with `DELETE`, when the visit is completed, or on its own after `LOCK_TIMEOUT_MINUTES` without a refresh. Only the one record is affected; every other record stays usable.

### Errors

Errors are JSON with a `detail` message written for the person at the station.

| Status | Meaning |
| --- | --- |
| 400 | The request breaks a rule, e.g. not enough stock |
| 401 | Not logged in, or the session expired |
| 403 | The account's role may not do this |
| 404 | The record does not exist |
| 409 | Conflicts with the current state, e.g. the patient already has an open visit |
| 422 | A field failed validation |
| 423 | The record is being edited by someone else |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Requirements Coverage

| ID | Requirement | Where |
| --- | --- | --- |
| FR-01 | User authentication and role management | `/auth`, `/users`, `core/permissions.py` |
| FR-02 | Patient record management | `/patients` |
| FR-03 | Patient search and identification | `GET /patients?q=&department=&patient_type=` |
| FR-04 | Medical history management | `GET /patients/{id}`; `patient_alerts` on every visit |
| FR-05 | Visit and consultation recording | `PATCH /visits/{id}`, `POST /visits/{id}/medicines` |
| FR-06 | Patient visit history | `GET /patients/{id}/visits` |
| FR-07 | Appointment management | `/appointments` |
| FR-08 | Walk-in management | `POST /visits`, `GET /visits/today` |
| FR-09 | Nurse-to-doctor record transfer | `GET /visits/{id}`, `PATCH /visits/{id}/consultation` |
| FR-10 | Record editing and correction | `PATCH` on patients and visits, undo medicine release |
| FR-11 | Medicine inventory management | `/inventory`, automatic deduction on release |
| FR-12 | Low-stock notification | `GET /inventory/low-stock`, `low_stock` notifications |
| FR-13 | Report generation | `POST /reports`, CSV export |
| FR-14 | Clinic statistics | `GET /reports/summary` |
| FR-15 | Dashboard | `GET /dashboard` |

| ID | Quality attribute | How it is addressed |
| --- | --- | --- |
| NFR-01 to 03 | Security, privacy, confidentiality | Every route requires a token; permissions per role; bcrypt hashes; views and changes of patient data go to the audit log |
| NFR-04, 08 | Data integrity, reliability | Foreign keys, unique constraints, one transaction per action, row lock on stock changes, edit locks |
| NFR-07 | Performance | One-request dashboard, indexed search columns, WebSocket push instead of polling |
| NFR-09, 14 | Availability, local clinic access | Runs on the clinic LAN with no dependency on the internet or the campus portal |
| NFR-10, 11 | Maintainability, scalability | Layered code, Alembic migrations, paginated lists, PostgreSQL |
| NFR-12 | Data recoverability | `python -m scripts.backup` |
| NFR-15 | Compatibility | Plain JSON over HTTP for any modern browser client |

NFR-05, 06 and 13 (usability, interface clarity, consistency) belong to the frontend. The API supports them with readable error messages and consistent response shapes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## API Architecture

1. **Routers (`app/api/`)** define endpoints, check permissions and publish live events.
2. **Schemas (`app/schemas/`)** validate requests and shape responses.
3. **Services (`app/services/`)** hold the business rules. Each function is one unit of work: it validates, changes data, writes the audit entry and commits.
4. **Models (`app/models/`)** map to the database tables.

### Database tables

| Table | Purpose |
| --- | --- |
| `users` | Clinic accounts and roles |
| `patients` | Demographics, guardian, allergies, conditions, restrictions |
| `visits` | One row per clinic visit: log entry, vital signs, nurse record, doctor's consultation |
| `visit_medicines` | Medicines given during a visit |
| `visit_vital_readings` | Vital signs taken again while a patient is monitored |
| `appointments` | Scheduled appointments and the coordinator's decision |
| `medicines` | Inventory items with quantity and low-stock threshold |
| `stock_movements` | Every stock change; release rows are the release log |
| `notifications`, `notification_reads` | Alerts and per-user read state |
| `record_locks` | Edit locks on patient and visit records |
| `attachments` | Metadata of uploaded files (files are in `UPLOAD_DIR`) |
| `audit_logs` | Who did what to which record and when |
| `reports` | Saved semester and summer reports |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Directory Structure

```text
backend/
├── app/
│   ├── api/                  # Route handlers: auth, users, patients, visits, appointments,
│   │                         # inventory, reports, misc (dashboard, notifications, locks, ws)
│   ├── core/                 # Settings, security, permissions, clock, errors, live events
│   ├── db/                   # Engine, session and declarative base
│   ├── models/               # SQLAlchemy ORM models and enumerations
│   ├── schemas/              # Pydantic request and response schemas
│   └── services/             # Business logic
├── alembic/                  # Database migrations
├── scripts/                  # create_admin, seed_demo, backup
├── tests/                    # pytest suite
├── data/                     # Created at runtime: SQLite file, uploads, backups (git-ignored)
├── .env.example              # Template for environment variables
├── alembic.ini
├── main.py                   # Application entry point
├── pytest.ini
└── requirements.txt
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Operations

### Backups

```powershell
python -m scripts.backup create --keep 30   # new archive, keep the 30 newest
python -m scripts.backup list
python -m scripts.backup restore hau-sync-backup-20261004-170000.zip
```

Each backup is a `.zip` in `BACKUP_DIR` containing the database and the uploaded files. On PostgreSQL the script calls `pg_dump` and `pg_restore`, which must be on the `PATH`. Stop the server before restoring. Schedule `create` daily with Windows Task Scheduler, and copy the archives to another drive: a backup on the same disk does not survive a disk failure.

### Changing the database schema

After editing a model:

```powershell
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Review the generated file in `alembic/versions/` before applying it.

### Moving from SQLite to PostgreSQL

Point `DATABASE_URL` at the PostgreSQL database and run `alembic upgrade head` to create the tables. Data entered into the SQLite file is not copied across.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Design Decisions

These follow the project paper, the interview with the clinic and the dashboard design. Where those sources disagreed, the choice is noted here.

- **Three roles.** The paper names a receptionist in some sections and nurses and student assistants in others. The system uses `coordinator`, `doctor` and `clinic_staff`, with nurses and student assistants sharing `clinic_staff`.
- **No patient accounts.** Patients appear in the Level 0 diagram as a source of information, but the clinic asked for a clinic-only system. Staff enter everything.
- **Appointments need the coordinator's approval.** Staff bookings start as `pending`. Only the coordinator confirms or cancels. A staff reschedule of a confirmed appointment returns it to `pending`. Only a confirmed appointment can be checked in; a patient whose appointment is still pending can be checked in as a walk-in.
- **Records are not deleted.** The clinic described the patient record as its legal basis, and FR-02 lists create, view, update and maintain. Patients are archived and visits are cancelled instead. Only attachments and saved reports can be deleted, by the coordinator.
- **Stock changes go through movements.** A medicine's quantity is never edited directly. Stock-in, release and adjustment each write a `stock_movements` row, so the release log and the quantity always agree.
- **A low-stock alert fires once**, when a release takes the quantity to or below the threshold. `GET /inventory/low-stock` always lists every medicine currently low.
- **Visits are a plain log.** A visit is an entry that is open or completed, with no waiting-line numbers, priority flag or room assignment. The doctor adds notes to the visit directly.
- **One open visit per patient.** A second check-in while a visit is still open is rejected.
- **Late entries.** `POST /visits` takes an optional `visit_date` for a visit written on paper and entered later. It may not be in the future, `checked_in_at` keeps the real entry time, and the audit entry records `entered_late_for`.
- **Monitoring readings.** The first vital signs stay on the visit. Readings taken later, for a patient resting in a ward, are separate timed rows, so the record shows how the patient changed.
- **The report splits each type of request by students and employees** (`visits_by_type_and_patient_type`), the tally the clinic submits every semester. Reports saved before this was added show it as empty.
- **Saved reports are snapshots.** `POST /reports` stores the figures at generation time so a submitted report does not change. `GET /reports/summary` always computes live figures.
- **Times.** Timestamps are stored in UTC. "Today" and report periods follow `TIMEZONE` (default `Asia/Manila`).

<p align="right">(<a href="#readme-top">back to top</a>)</p>
