# Clinic feedback, 19 October 2026: design

Changes the clinic asked for after the system was shown to the student assistants. They are
built on the `feat/clinic-feedback` branch, one feature per commit, in the order below:
the small fixes first, then the Excel export, then the medical kit.

## 1. Form code fix (MOS to MDS)

The patient record form codes are `FM-SSA-MDS-8011` (employee), `FM-SSA-MDS-8012` (basic
education) and `FM-SSA-MDS-8013` (college). `MOS` was a typing error.

- `frontend/src/lib/formCodes.ts` and its tests, `FormCodeBox` tests, `Patients.test.tsx`.
- Both READMEs.

## 2. Archive page

- New screen **Archive** at `/patients/archive`, listed in the left navigation under
  Patients. Every role that can read patients sees it (`patients:read`).
- Lists archived patients only, with search (name or ID number), patient type, the date
  archived and who archived it, newest first.
- **Restore** button on each row, shown only with `patients:archive` (the Coordinator).
  It asks for confirmation and calls the existing `POST /patients/{id}/restore`, which
  already writes the audit entry.
- Backend: `GET /patients` gains `archived_only: bool`. The date archived and who did it are
  read from the latest `patient.archive` audit entry, so no new column is needed.
  If that join proves awkward, add `archived_at` and `archived_by_id` to `patients` with a
  migration instead.

## 3. New patient type: Others

For people who are neither students nor employees: visitors, guests, contractors, parents.

- `PatientType.OTHER = "other"`. No education level, department or program are required.
- New nullable column `patients.other_description` (String 120), required when the type is
  `other`, e.g. "Visitor – parent of a Grade 3 student".
- `id_number` stays required and unique. For an Others patient left without one, the
  service assigns `OTH-000123` (the patient id, zero padded).
- Form code `FM-SSA-MDS-XXXX`, a visible placeholder until the clinic gives the real code.
- Reports count Others as its own group. The patient form, patient page, patient list
  filter, check-in search and seed data all learn the new type.
- Migration adds the column. On SQLite the enum is stored as a string with no check
  constraint (`native_enum=False`), so the new value needs no table rebuild. The
  migration is tested up and down on a seeded database.

## 4. Audit log shows name and role

- `AuditLogOut` gains `user_full_name` and `user_role` (from the joined user, falling back
  to the stored username for deleted or system entries).
- The Audit Log screen shows "Maria Santos" with "Clinic Staff" (the role label) beneath or
  beside it, instead of the role only. The filter by user still works.

## 5. Blood pressure in one field

- The database keeps `bp_systolic` and `bp_diastolic`. Only the input changes.
- One text box, `BloodPressureInput`, in the visit record and in monitoring readings.
  A space or `/` separates the numbers, so `120 80` becomes `120/80`. When the box loses
  focus it shows `120/80` with "mmHg" beside it.
- Parsing lives in a pure function `parseBloodPressure(text)`, which returns
  `{ systolic, diastolic }`, `null` for empty input, or an error message.
- Rules: both parts are whole numbers, systolic 40–300, diastolic 20–200 (the ranges the form already uses), and systolic
  greater than diastolic. A half-written reading such as `120/` shows the error under the
  box and the form will not save.
- The existing abnormal-reading flags and reports are unchanged.

## 6. Name capitalisation while typing

- A helper `capitalizeWords(text)` makes the first letter of each word upper case and
  leaves the rest as typed, so "McDonald" and "dela Cruz" typed as "dela cruz" become
  "McDonald" and "Dela Cruz".
- Applied to first, middle and last name on the patient form (register and edit) when
  space is pressed and when the field loses focus, so the last word is covered too. The
  caret position is kept.
- Guardian name gets the same treatment.

## 7. Excel export for reports

- New routes `GET /reports/summary.xlsx` and `GET /reports/{id}/xlsx`, built with
  `openpyxl` (added to `requirements.txt`). The CSV routes stay.
- The Reports screen gets **Download Excel** as the main button and keeps **Download CSV**
  next to it.
- Workbook layout, one sheet per section of the summary (Overview, Visits by type,
  Complaints, Medicines released, Patients by type and level, and so on):
  - Rows 1–4: the Holy Angel University logo (`hau-logo.png`, copied into
    `backend/app/assets/`), "Holy Angel University · University Clinic", the report title,
    the date range, and "Generated 19 Oct 2026, 3:05 PM by Maria Santos".
  - A header row in the clinic red (the app's primary colour) with white bold text, then
    data rows with light shading on every other row and thin borders.
  - Columns sized to their content, the header row frozen, dates and numbers formatted.
  - Page setup: landscape, fitted to one page wide, the header row repeated on each page.
- The workbook builder lives in `app/services/report_xlsx.py`, apart from the CSV code.

## 8. Medical kit

A new **Medical Kit** section in the left navigation with three pages: **Requests**,
**Kits** and **Kit Contents**. The paper forms are `FM-SSA-MDS-8032` (request) and
`FM-SSA-MDS-8033` (dispensary). Kits draw from the same medicine stock as the inventory.

### Data

- `medkits`: a physical kit. `kit_number` (unique, e.g. 3), `label`, `is_active`, plus
  status `available`, `out` or `lost`. The status is updated by the request flow, never
  by hand, except that a Coordinator can put a lost kit back as available once it has
  been replaced.
- `medkit_template_items`: the standard contents. `medicine_id`, `default_quantity`,
  `sort_order`. Seeded with the eight medicines boxed on form 8033: Meclizine
  Hydrochloride; Phenylpropanolamine HCl + Chlorphenamine Maleate + Paracetamol; Hyoscine
  N-Butylbromide; Aluminum OH + Magnesium OH + Simethicone; Loperamide; Loratadine 10 mg;
  Mefenamic Acid 500 mg; Paracetamol 500 mg. The demo seed adds these medicines to the
  inventory. On a real database, the Kit Contents page lists any line not yet linked to a
  medicine, and a kit cannot be issued until every line is linked.
- `medkit_requests`: one borrowing. Form 8032 fields (organization/department, activity,
  activity date, venue, person responsible, contact number, requested by, request date),
  plus `status` (`requested`, `issued`, `returned`, `lost`, `cancelled`), `medkit_id`,
  `issued_at`/`issued_by_id`, `returned_at`/`returned_by_id`, `notes` and
  `overdue_notified_at`.
- `medkit_request_items`: what was in the kit. `medicine_id`, `quantity_issued`,
  `quantity_returned` (null until return). The quantity used is issued minus returned.
- `stock_movements` gains a nullable `medkit_request_id`, so the release log can show
  "Medical kit #3 – Intramurals" in the same way it shows the patient for a visit release.

### Flow

1. **Request** (`requested`). Anyone with `medkits:write` fills in form 8032. No stock moves.
   It can be cancelled while in this state.
2. **Issue** (`requested` → `issued`). Staff choose an available kit. The template items
   are filled in with their default quantities, which can be changed. **Add other item**
   picks any active medicine from the inventory. On confirm, every item goes through
   `inventory.apply_movement` as a `release` with the request id, all in one transaction.
   If any item is short, nothing is released and the error names the item and how many
   are on hand. The kit becomes `out`. The low-stock check runs as it does for visit releases.
3. **Return** (`issued` → `returned`). A checklist lists each item with the quantity
   issued and a box for the quantity returned. **Returned complete** fills every box with
   the issued amount. Returned amounts go back through `apply_movement` as `stock_in`
   with the request id. The rest is recorded as used. The kit becomes `available`.
4. **Lost** (`issued` → `lost`). Nothing returns to stock. The kit becomes `lost`, and
   the request shows that the person responsible must replace the kit and its contents
   (the note on the form).
5. **Overdue.** A request still `issued` after its activity date shows a red Overdue
   badge. There is no scheduler, so `medkits.flag_overdue(db)` runs when the dashboard or
   the requests list is loaded, sends one `medkit_overdue` notification per request and
   sets `overdue_notified_at` so it is not sent twice.

Every step writes an audit entry in the same transaction and sends a `medkits.updated`
live event. Stock changes also send `inventory.updated`.

### Permissions

- `medkits:read`: all roles.
- `medkits:write` (request, issue, return, mark lost, cancel): Coordinator and clinic staff.
- `medkits:manage` (kits and kit contents): Coordinator.

### API

`GET/POST /medkits`, `PATCH /medkits/{id}`, `GET/PUT /medkits/template`,
`GET/POST /medkit-requests`, `GET /medkit-requests/{id}`,
`POST /medkit-requests/{id}/issue`, `/return`, `/lost`, `/cancel`.

### Screens

- **Requests**: the list with status tabs (Requested, Out, Overdue, Returned, All), and a
  **New request** form shaped like form 8032. The request page shows the form details, the
  kit and its items, and the actions that fit its status: Issue, Return, Mark lost,
  Cancel, Print.
- **Print** shows form 8033 laid out for paper: the form code box, the logo, the kit number,
  the organization, activity and date, the item table with the totals issued, and the
  "Received by", medical staff signature and notes lines. It uses a print stylesheet.
- **Kits**: the kit numbers with their status, who has each kit out and since when.
  The Coordinator can add, rename, deactivate or restore a kit.
- **Kit Contents**: the template list. The Coordinator links each line to an inventory
  medicine and sets the default quantity and the order.

## Testing

- Backend: pytest for the `other` type and placeholder id, the audit name fields,
  `archived_only`, the xlsx routes (open the workbook with openpyxl and check the header
  fill and title rows), and the whole medkit flow: stock goes down on issue, back up on
  return, the used amount, nothing moving when an item is short, lost, cancel, overdue
  notifying once, and permissions per role.
- Frontend: vitest for `parseBloodPressure`, `capitalizeWords`, the form code for Others,
  the Archive screen with and without restore permission, the request form, the issue
  form with an extra item, and the return checklist with **Returned complete**.
- Migrations tested up and down on a seeded temporary database.
- Both READMEs updated with each feature.
