# Clinic Sessions

Notes, transcripts and photos from each meeting with the Holy Angel University Clinic. The
first session set the requirements; each one after it is an Agile review in which the clinic
tried the system and asked for changes. The transcripts keep the original Filipino and
English wording.

| Session | What happened | Files |
| --- | --- | --- |
| [`pre-interview/`](pre-interview/) | Interview with the Clinic Coordinator before development: the daily workflow, busy hours, the paper forms and what the system should do | [Questions](pre-interview/interview-questions-v1.md), [transcript](pre-interview/pre-interview-transcripts.md), [photos](pre-interview/images/) from the clinic visit, including the form code box |
| [`agile-01/`](agile-01/) | First demonstration to the clinic (19 October 2026), walking through every screen | [Transcript](agile-01/agile-session-transcripts-01.md) |

## What came out of the first review

The clinic's requests from `agile-01` were built on the `feat/clinic-feedback` branch. The
design is in
[`../superpowers/specs/2026-10-19-clinic-feedback-design.md`](../superpowers/specs/2026-10-19-clinic-feedback-design.md):

- The form codes corrected from `MOS` to `MDS` (`FM-SSA-MDS-8011` to `8013`).
- An **Archive** page listing archived patients, with restore for the coordinator.
- **Others** as a patient type, for visitors, guests, contractors and parents.
- The audit log names the person and their role.
- Blood pressure typed in one box (`120/80`), and names capitalised as they are typed.
- Reports downloadable as a formatted **Excel** workbook as well as CSV.
- **Medical kit** loans to organizations (forms `FM-SSA-MDS-8032` and `8033`), drawing on
  the same medicine stock as the inventory.

When adding a session, leave out any real patient details (Data Privacy Act of 2012).
