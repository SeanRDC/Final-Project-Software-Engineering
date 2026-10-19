# Clinic Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the eight changes the clinic asked for on 19 October 2026: form code fix, Archive page, Others patients, names in the audit log, one blood pressure field, name capitalisation, an Excel export and the medical kit.

**Architecture:** Backend changes follow `app/api` → `app/services` → `app/models` with an Alembic migration per model change. Frontend screens are registered in `layout/pages.ts` and `layout/nav.ts` and follow the `new-screen` skill. The medical kit is a new backend module (`models/medkit.py`, `schemas/medkit.py`, `services/medkits.py`, `api/medkits.py`) and a new frontend folder `pages/medkit/`.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, pytest, openpyxl (new); React 19, TypeScript, TanStack Query, shadcn/ui, vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-clinic-feedback-design.md`

## Global Constraints

- Each source file starts with a one-line comment saying what it is for.
- Stock changes only through `inventory.apply_movement`. Patient changes write an audit entry in the same transaction.
- Permissions live in `app/core/permissions.py` and are mirrored in `frontend/src/auth/permissions.ts`.
- Made-up data only in tests, seeds and docs.
- Commits: `<type>(scope): <lower-case imperative>`, one feature per commit with a descriptive body, author SeanRDC, no Co-Authored-By. Backend suite and frontend `npm test`, `typecheck` and `lint` green at every commit.
- After each backend schema change run `npm run gen:api` (backend running on a temp database) so `schema.d.ts` matches.
- Migrations tested up and down on a seeded temporary database.

## Review Focus

- An "Others" patient registered with an empty ID number gets `OTH-` + zero-padded id and never collides with a typed one. Test in Task 3.
- Issuing a kit when one item is short changes no stock at all. Test in Task 8.
- Returning more than was issued, or a negative quantity, is refused. Test in Task 8.
- A kit that is already out cannot be issued for a second request. Test in Task 8.
- Blood pressure typed as `120/` or `80/120` blocks saving with a message. Test in Task 5.

---

### Task 1: Form code MOS → MDS

**Files:** Modify `frontend/src/lib/formCodes.ts`, its test, `components/FormCodeBox.test.tsx`, `pages/patients/Patients.test.tsx`, `frontend/FRONTEND-README.md`, `backend/BACKEND-README.md`.

- [ ] Replace `FM-SSA-MOS-` with `FM-SSA-MDS-` everywhere listed. Run `npm test`. Commit `fix(frontend): print the clinic's MDS form codes instead of MOS`.

### Task 2: Audit log shows name and role

**Files:** `backend/app/models/support.py` (AuditLog `user` relationship, `user_full_name`, `user_role` properties), `backend/app/schemas/support.py` (`AuditLogOut.user_full_name: str | None`, `user_role: str | None`), `backend/tests/test_extras.py`, `frontend/src/pages/audit/AuditLogPage.tsx` and test.

- [ ] Test: an audit entry made by the coordinator returns `user_full_name` equal to the account's full name and `user_role == "coordinator"`.
- [ ] Implement, regenerate the API types, show name with the role label beneath it in the table. Commit backend and frontend separately.

### Task 3: Others patient type

**Files:** `models/enums.py` (`PatientType.OTHER = "other"`), `models/patient.py` (`other_description: Mapped[str | None]` String 120), migration `20261019_0006_patient_other_type.py`, `schemas/patient.py`, `services/patients.py`, `services/reports.py` if it lists types, `scripts/seed_demo.py`, `tests/test_patients.py`; frontend `api/types.ts`, `lib/formCodes.ts` (`OTHER_FORM = 'FM-SSA-MDS-XXXX'`), `pages/patients/PatientForm.tsx`, `patientValues.ts`, `PatientPage.tsx`, `PatientsPage.tsx` filter, labels in `lib/format.ts` or wherever patient type labels live.

- [ ] Tests: create `other` without description → 422; with description and blank `id_number` → `OTH-000{id}`; `other` patient has no education level; search by `patient_type=other`.
- [ ] `PatientCreate.id_number` becomes optional (`str | None`); a missing id is only allowed for `other` (422 otherwise). Generated after flush: `f"OTH-{patient.id:06d}"`, re-check uniqueness.
- [ ] Frontend: "Others" option, a "Description" field shown only for Others, ID number optional for Others, form code placeholder. Tests in `patientValues.test.ts`, `formCodes.test.ts`.
- [ ] Commit backend (`feat(backend): add others as a patient type`) and frontend (`feat(frontend): register others patients with a description and placeholder form code`).

### Task 4: Archive page

**Files:** `services/patients.py` `search(..., archived_only: bool = False)`, `api/patients.py` query param, `schemas/patient.py` `PatientSummary.archived_at: datetime | None`, `archived_by_name: str | None` (read from the latest `patient.archive` audit entry in the service for archived rows), `tests/test_patients.py`; frontend `pages/patients/ArchivePage.tsx` + test, `layout/pages.ts` (`ARCHIVE` `/patients/archive`, `patients:read`), `layout/nav.ts` child "Archive", `App.tsx` route, `usePatients.ts` hook `useArchivedPatients`.

- [ ] Tests: `archived_only=true` returns only archived patients with `archived_at` and `archived_by_name`; the Restore button hidden without `patients:archive`; restoring removes the row.
- [ ] Commit backend and frontend separately.

### Task 5: Blood pressure in one field

**Files:** create `frontend/src/lib/bloodPressure.ts` + test, `frontend/src/components/BloodPressureInput.tsx`; modify `pages/visits/visitForm.ts`, `RecordForm.tsx`/`formFields.tsx`, `MonitoringSection.tsx` and their tests.

- [ ] `parseBloodPressure(text: string): { systolic: number; diastolic: number } | null | { error: string }`. Separators: one or more spaces or `/`. Ranges keep the existing ones: systolic 40–300, diastolic 20–200, systolic > diastolic.
- [ ] `formatBloodPressure(systolic, diastolic): string` → `"120/80"`.
- [ ] Form values carry `bp: string`; `toPayload` splits into `bp_systolic`, `bp_diastolic`. Errors land on `bp`.
- [ ] Tests: `"120 80"` → 120/80, `"120/"` → error, `"80/120"` → error, `""` → null. Commit `feat(frontend): enter blood pressure in one field`.

### Task 6: Name capitalisation

**Files:** create `frontend/src/lib/capitalize.ts` + test; modify `PatientForm.tsx`.

- [ ] `capitalizeWords(text: string): string` upper-cases the first letter after start, space, hyphen or apostrophe; leaves the rest. Tests: `"juan dela cruz"` → `"Juan Dela Cruz"`, `"McDonald"` unchanged, `"o'neil"` → `"O'Neil"`, `"ana-marie"` → `"Ana-Marie"`.
- [ ] Apply on change when the last typed character is a space, and on blur, for first, middle, last and guardian names. Commit `feat(frontend): capitalise patient names as they are typed`.

### Task 7: Excel export

**Files:** `backend/requirements.txt` (`openpyxl`), copy `frontend/src/assets/hau-logo.png` to `backend/app/assets/hau-logo.png`, create `backend/app/services/report_xlsx.py`, modify `api/reports.py`, `tests/test_dashboard_reports.py`; frontend `pages/reports/ReportsPage.tsx`, `SavedReportPage.tsx`, `useReports.ts` and test.

- [ ] `report_xlsx.build(summary: ReportSummary, title: str, generated_by: str | None) -> bytes`. Header fill is the app's primary red (read the hex from `frontend/src/index.css`), white bold font, banded rows, thin borders, frozen panes under the header, column widths fitted, landscape and fit-to-width, print title rows.
- [ ] Routes `GET /reports/summary.xlsx?start&end` and `GET /reports/{id}/xlsx`, media type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- [ ] Test: load the bytes with `openpyxl.load_workbook`, check the first sheet's title cell, that the header row fill is the red, and that a known count appears.
- [ ] Frontend: "Download Excel" primary button next to "Download CSV". Commit backend then frontend.

### Task 8: Medical kit backend

**Files:** create `models/medkit.py` (`Medkit`, `MedkitTemplateItem`, `MedkitRequest`, `MedkitRequestItem`), enums `MedkitStatus` (`available`, `out`, `lost`), `MedkitRequestStatus` (`requested`, `issued`, `returned`, `lost`, `cancelled`), `NotificationType.MEDKIT_OVERDUE`; `StockMovement.medkit_request_id`; migration `20261019_0007_medkits.py`; `schemas/medkit.py`; `services/medkits.py`; `api/medkits.py` registered in `api/router.py`; permissions `MEDKITS_READ`, `MEDKITS_WRITE`, `MEDKITS_MANAGE`; `inventory.apply_movement(..., medkit_request_id: int | None = None)`; release log label; `seed_demo.py`; `tests/test_medkits.py`; README.

Service functions (all take `db`, return the ORM object, audit + commit + `medkits.updated` event):
`create_kit(data, actor)`, `update_kit(kit_id, data, actor)`, `get_template()`, `set_template(items, actor)`, `create_request(data, actor)`, `list_requests(status, page, page_size)`, `get_request(id)`, `issue(request_id, data: MedkitIssue(medkit_id, items[{medicine_id, quantity}]), actor)`, `return_kit(request_id, data: MedkitReturn(items[{item_id, quantity_returned}]), actor)`, `mark_lost(request_id, actor)`, `cancel(request_id, actor)`, `flag_overdue(db)`.

- [ ] Tests: issue lowers stock and marks the kit out; return puts back the returned amount and records used; short item → 400 and no stock change; return more than issued → 422; issue on a kit that is out → 409; lost leaves stock and marks kit lost; cancel only from requested; overdue notifies once; doctor gets 403 on issue; release log shows the medkit.
- [ ] Movement type: issue uses `release`, return uses `stock_in`, both with `medkit_request_id`; the visit-based report counts exclude rows with a `medkit_request_id`.
- [ ] Commit model+migration, then service+routes+tests, then README.

### Task 9: Medical kit screens

**Files:** `frontend/src/pages/medkit/` — `useMedkits.ts`, `MedkitRequestsPage.tsx`, `NewMedkitRequestPage.tsx`, `MedkitRequestPage.tsx` (detail + actions), `IssueKitDialog.tsx`, `ReturnKitDialog.tsx`, `MedkitPrint.tsx`, `KitsPage.tsx`, `KitContentsPage.tsx`, `Medkit.test.tsx`; `layout/pages.ts`, `layout/nav.ts` group "Medical kit", `App.tsx`, `auth/permissions.ts`, `live/liveQueries.ts` for `medkits.updated`, `FRONTEND-README.md`.

- [ ] Tests: new request form submits the 8032 fields; issue dialog prefills template quantities and adds an extra medicine; return dialog "Returned complete" fills every quantity; overdue badge shows; doctor sees no actions.
- [ ] Commit each page with its test.

### Task 10: Finish

- [ ] Whole backend suite, `npm test`, `typecheck`, `lint`, `build`. Run the app on a temp seeded database and click through each feature. Request a whole-branch review and fix findings.
