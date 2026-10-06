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

> **🚧 WORK IN PROGRESS:** Every route of the backend API now has a screen. The system is still under test with the clinic.

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

The app opens at `http://localhost:5173`. The dev server forwards every request under `/api`, including the WebSocket, to the backend, so no CORS setup is needed in development. At the clinic there is no dev server: the backend serves the files built by `npm run build` (see "Running at the clinic" in `backend/BACKEND-README.md`).

To use a backend on another address:

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

| Screen                              | Address                                                             | Status                                                                             |
| ----------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Sign in                             | `/login`                                                            | Done                                                                               |
| Clinic Main Menu (dashboard)        | `/`                                                                 | Done                                                                               |
| Check-in / Walk-in                  | `/check-in`                                                         | Done                                                                               |
| Today's visits and the visit record | `/visits`, `/visits/:id`                                            | Done: log, record, consultation, medicine release, complete, cancel                |
| Patients                            | `/patients`, `/patients/new`, `/patients/:id`, `/patients/:id/edit` | Done: list, register, record with visit history, correct, archive and restore      |
| Appointments                        | `/appointments`, `/appointments/new`, `/appointments/:id/edit`      | Done: calendar, day schedule, book, reschedule, confirm, cancel, no-show, check-in |
| Medicine inventory                  | `/inventory`                                                        | Done: stock list, add and edit medicines, stock in, count adjustment               |
| Medicine release log                | `/inventory/releases`                                               | Done: releases to patients, plus all stock movements                               |
| Notifications                       | `/notifications`                                                    | Done: list, unread filter, mark as read                                            |
| Reports                             | `/reports`, `/reports/:id`                                          | Done: statistics for any period, CSV download, saved reports                       |
| Accounts                            | `/users`                                                            | Done: create, edit, deactivate, reset password (coordinator)                       |
| Audit log                           | `/audit`                                                            | Done: who viewed or changed what, with filters (coordinator)                       |
| Change password                     | `/account/password`                                                 | Done: for every account; required after a reset                                    |
| Attachments                         | on `/patients/:id`                                                  | Done: upload, download, delete                                                     |

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
- **Common complaints are one tap** under the complaint box (`src/lib/quickPicks.ts`); several can be combined and the text stays editable.
- **A visit written on paper can be entered later** by changing "Date of visit". A late entry is not in today's log; it is reached from the patient's visit history.
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
- **Monitoring.** `MonitoringSection` lists the vital signs taken again while a patient rests (`POST` and `DELETE /visits/{id}/vitals`), oldest first, with who took them. It needs `visits:record`; the doctor reads them.
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

## Appointments

| Part                               | API                                                                   | Component                                   |
| ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| Month calendar                     | `GET /appointments/calendar`                                          | `MonthCalendar` (shared with the dashboard) |
| A day's schedule                   | `GET /appointments/today?day=`                                        | `AppointmentsPage`, `AppointmentList`       |
| Pending on other days              | `GET /appointments?status=pending`                                    | `AppointmentsPage`                          |
| Book                               | `POST /appointments`                                                  | `NewAppointmentPage`, `AppointmentForm`     |
| Reschedule or edit                 | `PATCH /appointments/{id}`                                            | `EditAppointmentPage`, `AppointmentForm`    |
| Confirm, cancel, no-show, check in | `POST /appointments/{id}/confirm`, `/cancel`, `/no-show`, `/check-in` | `AppointmentActions`                        |

- **The day on screen is in the address** (`/appointments?date=2026-10-12`). The dashboard calendar links straight to a day.
- **Who may do what** follows the API: the coordinator confirms and cancels; the front desk books, reschedules, checks in and marks no-shows. Each action is offered only in a state where the server accepts it.
- **A booking starts as pending.** Moving a confirmed appointment sends it back to pending unless the coordinator made the change; the form says so beforehand.
- **Dates are checked against the clinic's day** as the server reports it (`useClinicToday`), not the station's clock.
- **The API has no route for one appointment**, so the edit screen finds it in its day's list (`?date=` in the address).
- **Cancelled appointments** are left out of a day's schedule by the server.
- **Usual reasons are suggested** as the reason is typed (medical clearance for OJT, an off-campus activity or varsity).

## Inventory and Release Log

| Part                          | API                                                             | Component        |
| ----------------------------- | --------------------------------------------------------------- | ---------------- |
| Stock list                    | `GET /inventory/medicines?q=&low_stock_only=&include_inactive=` | `InventoryPage`  |
| Add or edit a medicine        | `POST`, `PATCH /inventory/medicines`                            | `MedicineDialog` |
| Stock in, adjust count        | `POST /inventory/medicines/{id}/stock-in`, `/adjust`            | `StockDialog`    |
| Release log and stock history | `GET /inventory/movements?movement_type=&start=&end=&page=`     | `ReleaseLogPage` |

- **The quantity is never edited directly.** It changes through stock in, release during a visit, and count adjustment, each of which writes a movement, so the history always adds up.
- **An adjustment needs a reason** and shows the difference from the records before it is saved.
- **Flags:** low stock, out of stock, expired, and expiring within sixty days.
- **The release log** starts on releases to patients, each linked to its visit, and can show deliveries and adjustments too.
- **The doctor** can view both screens but change nothing.

## Notifications

`NotificationsPage` lists the account's alerts (`GET /notifications`): low stock and appointment decisions. Opening one marks it read for that account (`POST /notifications/{id}/read`) and goes to the inventory or the appointments. Read state is per account; the bell and sidebar counts come from the dashboard request.

## Reports

| Part                    | API                                                 | Component                        |
| ----------------------- | --------------------------------------------------- | -------------------------------- |
| Statistics for a period | `GET /reports/summary?start=&end=`                  | `ReportsPage`, `SummaryView`     |
| CSV download            | `GET /reports/summary.csv`, `GET /reports/{id}/csv` | `useCsvDownload`                 |
| Saved reports           | `GET /reports`, `GET /reports/{id}`                 | `ReportsPage`, `SavedReportPage` |
| Save and delete         | `POST /reports`, `DELETE /reports/{id}`             | coordinator only                 |

- **The period is in the address** (`/reports?from=2026-08-01&to=2026-12-15`); it starts on the current month.
- **Semester and summer-term periods** are one click (`terms.ts`): the latest first semester (August to December), second semester (January to May) and summer term (June and July). A term still running ends today.
- **A saved report is a snapshot**: it keeps the figures as they were when it was generated, so a submitted report does not change.
- **Downloads need the token**, so the file is fetched through the API client (`apiDownload`) and handed to the browser to save. A plain link would be refused.
- **Requests by students and employees** is its own table, the tally the clinic submits each term.
- **Charts.** Visits by month is a column chart (`VisitsByMonthChart`), drawn when the period covers two months or more; months without visits are filled in as zero. Each breakdown table has a bar under every name, measured against the table's largest count. Both are plain HTML and CSS in one colour (`--chart-1`), so no chart library is loaded, and every figure stays in a table for screen readers.

## Accounts and Passwords

| Part                     | API                                               | Component             |
| ------------------------ | ------------------------------------------------- | --------------------- |
| List accounts            | `GET /users`                                      | `UsersPage`           |
| Create, edit, deactivate | `POST /users`, `PATCH /users/{id}`                | `UserDialog`          |
| Reset a password         | `POST /users/{id}/reset-password`                 | `ResetPasswordDialog` |
| Change your own password | `POST /auth/change-password`, then `GET /auth/me` | `ChangePasswordPage`  |

- **Accounts are deactivated, never deleted**, so past entries keep the person's name.
- **A new or reset account has a temporary password.** At sign-in it is sent to the change-password screen and cannot open anything else until it has chosen its own (`AppShell`).
- **The server refuses** to demote or deactivate the last active coordinator; the dialog shows its message.

## Audit Log

`AuditLogPage` lists `GET /audit-logs` for the coordinator: when, which account, what action, which record and the detail. Filters (kind of record, exact action, date range) and the page are kept in the address. Entries about a patient, visit or report link to it.

## Attachments

`Attachments` on the patient record lists `GET /patients/{id}/attachments`, uploads with `POST` (multipart), downloads through `GET /attachments/{id}/download` and lets the coordinator delete. The accepted file types and the size limit come from `GET /options` and are checked before uploading (`attachmentRules.ts`); the server checks again.

## Live Updates

`src/live` keeps one WebSocket open to `/api/v1/ws` while someone is signed in.

- Each event marks the matching cached data as stale (`liveQueries.ts`), and TanStack Query refetches what is on screen.
- A ping every ten seconds measures the round trip shown as "Clinic server connected · 3 ms".
- A dropped connection is retried with a growing delay. After it returns, everything on screen is refetched, because events sent in the meantime are lost.

## Sessions and Permissions

- The token is kept in `sessionStorage`, so it lasts for the browser tab only. The stations are shared, and closing the tab signs the person out.
- A station left untouched for an hour signs itself out (`useIdleLogout`), with a warning a minute before. The sign-in page says why.
- Signing out clears every cached response, so one account's patient data is never shown to the next.
- The server enforces permissions. The client uses the list returned at login only to hide what would be refused (`src/auth/permissions.ts`).

## Directory Structure

```text
frontend/
├── public/                   # Favicon
├── src/
│   ├── api/                  # Fetch client, generated schema and type aliases
│   ├── auth/                 # Session storage, auth provider, permission helper
│   ├── components/           # Shared components (SectionCard, StatusPill, Pager, calendar)
│   │   └── ui/               # shadcn/ui primitives, added with `npx shadcn add`
│   ├── layout/               # App shell, top bar, sidebar, page and navigation lists
│   ├── lib/                  # Formatting helpers, query client, status labels, record lock hook
│   ├── live/                 # WebSocket connection and event-to-query mapping
│   ├── pages/                # One folder or file per screen
│   │   ├── account/          # Change password
│   │   ├── appointments/     # Calendar and schedule, booking form, actions by role
│   │   ├── audit/            # Audit log
│   │   ├── checkin/          # Walk-in form, patient picker, expected appointments
│   │   ├── dashboard/        # The Clinic Main Menu and its panels
│   │   ├── inventory/        # Stock list, medicine and stock dialogs, release log
│   │   ├── notifications/    # Notification list
│   │   ├── reports/          # Statistics, saved reports
│   │   ├── users/            # Accounts
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

1. Add the screen to `src/layout/pages.ts` (address, title, permission) and give it a route in `src/App.tsx`. Add a sidebar entry in `src/layout/nav.ts` if it needs one.
2. Build it in `src/pages/<screen>/`, loading data with TanStack Query through `api()` and a query key that starts with the resource name (`['patients', id]`), so live events refresh it.
3. Reuse `SectionCard`, `StatusPill` and the shadcn/ui primitives. Colours come from the tokens in `src/index.css`.
4. Cover loading, empty and error states, and add tests next to the components.

## Design Tokens

Colours, type and radius are CSS variables in `src/index.css`, taken from the baseline: HAU maroon for primary actions and the active navigation entry, charcoal for section headers, and a soft tone per status (info, success, warning, danger, consult). Inter is bundled with the app, because the clinic stations may have no internet access.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
