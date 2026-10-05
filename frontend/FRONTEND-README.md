<a id="readme-top"></a>

<div align="center">
  <h3 align="center">Frontend | HAU-Sync</h3>
  <p align="center">
    The browser client of HAU-Sync, the Patient Record Management and Appointment System for the Holy Angel University Clinic.
    <br />
    <br />
    <strong>Tags:</strong> <code>react</code>, <code>typescript</code>, <code>vite</code>, <code>tailwindcss</code>, <code>shadcn-ui</code>
  </p>
</div>

> **🚧 WORK IN PROGRESS:** The frontend is being built screen by screen on top of the finished backend API.

## Tech Stack

- **Language:** TypeScript
- **Framework:** React 19, built with Vite
- **Styling:** Tailwind CSS 4 and shadcn/ui components (Radix primitives)
- **Routing and server data:** React Router and TanStack Query
- **Tests:** Vitest and Testing Library
- **Lint and format:** oxlint and Prettier

## Getting Started

### Prerequisites

- Node.js 20.19 or higher and `npm`
- The backend running on `http://localhost:8000` (see `backend/BACKEND-README.md`)

### Setup

```powershell
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`. The dev server forwards every request under `/api`, including the WebSocket, to the backend, so no CORS setup is needed in development. To use a backend on another address:

```powershell
$env:BACKEND_URL = "http://192.168.1.10:8000"; npm run dev
```

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the dev server with hot reload                      |
| `npm run build`      | Type-check and build the static files into `dist/`        |
| `npm run preview`    | Serve the built files locally                             |
| `npm test`           | Run the test suite once                                   |
| `npm run test:watch` | Re-run tests as files change                              |
| `npm run lint`       | Lint with oxlint                                          |
| `npm run typecheck`  | Type-check without building                               |
| `npm run gen:api`    | Regenerate `src/api/schema.d.ts` from the running backend |
| `npm run format`     | Format every file with Prettier                           |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## What Is Built

| Screen                                              | Address                                                             | Status                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Sign in                                             | `/login`                                                            | Done                                                                          |
| Clinic Main Menu (dashboard)                        | `/`                                                                 | Done                                                                          |
| Check-in / Walk-in                                  | `/check-in`                                                         | Done                                                                          |
| Today's visits and the visit record                 | `/visits`, `/visits/:id`                                            | Done: log, record, consultation, medicine release, complete, cancel           |
| Patients                                            | `/patients`, `/patients/new`, `/patients/:id`, `/patients/:id/edit` | Done: list, register, record with visit history, correct, archive and restore |
| Appointments, inventory, release log, notifications | see `src/layout/pages.ts`                                           | Placeholder, built next                                                       |

Sign in with a clinic account. For development, `python -m scripts.seed_demo` in `backend/` creates `coordinator`, `nurse`, `assistant` and `doctor`.

## How the Dashboard Maps to the API

The whole screen comes from one request, `GET /api/v1/dashboard`. The design baseline is `proj-docs/dash.png`.

| Part of the screen      | Data                                                      | Component                            |
| ----------------------- | --------------------------------------------------------- | ------------------------------------ |
| Quick actions           | The account's `permissions`                               | `QuickActions`                       |
| Counters                | `stats`, `low_stock`                                      | `StatTiles`                          |
| Today's visits          | `todays_visits`                                           | `TodaysVisits`, `VisitCard`          |
| Today's appointments    | `todays_appointments`; `POST /appointments/{id}/check-in` | `AppointmentsTable`, `CheckInButton` |
| Calendar                | `calendar`; `GET /appointments/calendar` for other months | `MonthCalendar`                      |
| Events for today        | `todays_appointments` that are pending or confirmed       | `TodaysEvents`                       |
| Notifications           | `notifications`                                           | `NotificationsPanel`                 |
| Sidebar and bell counts | `stats.open_visits`, `notifications.unread_count`         | `AppShell`                           |

### Where the screen differs from the baseline

The baseline shows a live queue with ticket numbers, an Urgent flag, Intake / Queued stages and room names. The backend records none of these: a visit is `open`, `completed` or `cancelled` (see Design Decisions in `backend/BACKEND-README.md`). The dashboard keeps the card layout and shows what the API reports:

- A visit is **Open**, **In consultation** once the doctor has added notes to it, **Completed** or **Cancelled**.
- The counters are open visits, completed today, appointments today and low-stock medicines.
- An open visit's timer turns amber after 20 minutes and red after 40.

## Check-in and Today's Visits

| Part                  | API                                                           | Component                                   |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| Find the patient      | `GET /patients?q=` as the term is typed                       | `PatientPicker`, `usePatientSearch`         |
| Walk-in check-in      | `POST /visits`                                                | `WalkInForm`                                |
| Expected appointments | `GET /appointments/today`; `POST /appointments/{id}/check-in` | `ArrivingByAppointment`, `CheckInButton`    |
| Visit log             | `GET /visits/today`                                           | `VisitsPage`, `VisitsFilter`, `VisitsTable` |
| One visit             | `GET /visits/{id}`                                            | `VisitPanel`, `VisitRecord`                 |
| Cancel a visit        | `POST /visits/{id}/cancel`                                    | `CancelVisitDialog`                         |

- **One open visit per patient.** When check-in is refused for that reason, the form links to the visit that is already open.
- **Pending appointments** cannot be checked in. The screen says to check the patient in as a walk-in, which is the clinic's rule.
- **The filter is in the address** (`/visits?status=open`), so it survives a reload and opening a visit.
- **A visit has its own address** (`/visits/14`) and opens in a panel over the log. Dashboard cards and a successful check-in lead there.
- **Patient alerts** (allergies, conditions, restrictions) are shown first in every visit record.
- **Reading a visit is audited** by the server each time the panel loads it.

## Recording a Visit

The visit panel (`/visits/:id`) switches between the record and a form.

| Action                                                        | Who                     | API                                        | Component                                 |
| ------------------------------------------------------------- | ----------------------- | ------------------------------------------ | ----------------------------------------- |
| Record complaint, vital signs, assessment, treatment, outcome | `visits:record`         | `PATCH /visits/{id}`                       | `RecordForm`                              |
| Consultation notes, diagnosis, medication details             | `visits:consult`        | `PATCH /visits/{id}/consultation`          | `ConsultationForm`                        |
| Release medicine, undo a release                              | `medicines:dispense`    | `POST` and `DELETE /visits/{id}/medicines` | `ReleaseMedicineForm`, `MedicinesSection` |
| Complete the visit                                            | either of the first two | `POST /visits/{id}/complete`               | `CompleteVisitDialog`                     |

- **Edit lock.** Opening a form takes the lock on the visit (`useRecordLock`, `PUT /locks/visit/{id}`), renews it every minute and releases it when the form closes. If someone else holds it, the form does not open and the panel says who is editing. The hook also works for patient records.
- **Only changes are sent.** `visitForm.ts` compares the form with the saved visit and sends the fields that differ, so the audit log lists what was really changed.
- **Validation mirrors the API.** Vital sign limits are the ones in `backend/app/schemas/visit.py`; half a blood pressure reading is refused.
- **Stock.** A medicine with nothing on hand cannot be chosen and a quantity above the stock is refused before it is sent. The server makes the final check when it deducts the stock.
- **After completion** a visit can still be corrected, as the clinic requires. A cancelled visit offers no actions.
- **Unsaved changes.** Closing the panel with an edited form asks before discarding it.

## Patients

| Part                    | API                                                      | Component                            |
| ----------------------- | -------------------------------------------------------- | ------------------------------------ |
| List, search and filter | `GET /patients?q=&patient_type=&include_archived=&page=` | `PatientsPage`, `Pager`              |
| Register                | `POST /patients`                                         | `RegisterPatientPage`, `PatientForm` |
| Record                  | `GET /patients/{id}`                                     | `PatientPage`, `PatientAlertsBox`    |
| Visit history           | `GET /patients/{id}/visits`                              | `VisitHistory`                       |
| Correct a record        | `PATCH /patients/{id}`, under `PUT /locks/patient/{id}`  | `EditPatientPage`, `PatientForm`     |
| Archive and restore     | `POST /patients/{id}/archive`, `/restore`                | `ArchiveControl`                     |

- **Search state is in the address** (`/patients?q=santos&type=student&page=2`). The sidebar search box lands on the same list, and the back button returns to the same results.
- **Records are never deleted.** The coordinator can archive a record, which hides it from search and from check-in, and restore it at any time.
- **One form** registers a patient and corrects a record. A correction sends only the fields that changed (`patientValues.ts`).
- **Departments already in use** are offered as suggestions, so one school is not spelled several ways.
- **Leaving with unsaved changes** makes the browser ask first.
- **Check in from the record** opens check-in with the patient already chosen (`/check-in?patient=12`), and a visit links back to its patient record.
- **Reading a record is audited** by the server each time the page loads it.

## Live Updates

`src/live` keeps one WebSocket open to `/api/v1/ws` while someone is signed in.

- Each event marks the matching cached data as stale (`liveQueries.ts`), and TanStack Query refetches what is on screen.
- A ping every ten seconds measures the round trip shown as "Clinic server connected · 3 ms".
- A dropped connection is retried with a growing delay. After it returns, everything on screen is refetched, because events sent in the meantime are lost.

## Sessions and Permissions

- The token is kept in `sessionStorage`, so it lasts for the browser tab only. The stations are shared, and closing the tab signs the person out.
- Signing out clears every cached response, so one account's patient data is never shown to the next.
- The server enforces permissions. The client uses the list returned at login only to hide what would be refused (`src/auth/permissions.ts`).

## Directory Structure

```text
frontend/
├── public/                   # Favicon
├── src/
│   ├── api/                  # Fetch client, generated schema and type aliases
│   ├── auth/                 # Session storage, auth provider, permission helper
│   ├── components/           # Shared components (SectionCard, StatusPill, BrandMark)
│   │   └── ui/               # shadcn/ui primitives, added with `npx shadcn add`
│   ├── layout/               # App shell, top bar, sidebar, page and navigation lists
│   ├── lib/                  # Formatting helpers, query client, status labels, record lock hook
│   ├── live/                 # WebSocket connection and event-to-query mapping
│   ├── pages/                # One folder or file per screen
│   │   ├── checkin/          # Walk-in form, patient picker, expected appointments
│   │   ├── dashboard/        # The Clinic Main Menu and its panels
│   │   ├── patients/         # Patient list, record, register and edit form, archive
│   │   └── visits/           # Visit log, visit panel, record and consultation forms, medicine release
│   ├── routes/               # Route guards (signed in, permission)
│   ├── test/                 # Fixtures, fake API server and render helper
│   ├── App.tsx               # Route table
│   ├── index.css             # Design tokens and base styles
│   └── main.tsx              # Entry point and providers
├── components.json           # shadcn/ui configuration
├── vite.config.ts            # Dev proxy, path alias, test setup
└── package.json
```

## Adding a Screen

1. Move the screen's entry from `UPCOMING_PAGES` in `src/layout/pages.ts` to its own route in `src/App.tsx`.
2. Build it in `src/pages/<screen>/`, loading data with TanStack Query through `api()` and a query key that starts with the resource name (`['patients', id]`), so live events refresh it.
3. Reuse `SectionCard`, `StatusPill` and the shadcn/ui primitives. Colours come from the tokens in `src/index.css`.
4. Cover loading, empty and error states, and add tests next to the components.

## Design Tokens

Colours, type and radius are CSS variables in `src/index.css`, taken from the baseline: HAU maroon for primary actions and the active navigation entry, charcoal for section headers, and a soft tone per status (info, success, warning, danger, consult). Inter is bundled with the app, because the clinic stations may have no internet access.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
