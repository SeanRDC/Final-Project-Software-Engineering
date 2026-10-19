# Clinic Sessions

Notes, transcripts and photos from each meeting with the Holy Angel University Clinic. The
pre-interview set the requirements; each session after it is an Agile review in which the
clinic tried the system and asked for changes. The transcripts keep the original Filipino and
English wording.

| Session | Date | What happened | Files |
| --- | --- | --- | --- |
| [`pre-interview/`](pre-interview/) | 30 September 2026 | Interview with the Clinic Coordinator before development: the daily workflow, busy hours, the paper forms and what the system should do | [Questions](pre-interview/interview-questions-v1.md), [transcript](pre-interview/pre-interview-transcripts.md), [photos](pre-interview/images/) from the clinic visit, including the form code box |
| [`agile-01/`](agile-01/) | 7 October 2026 | First Agile session: the system demonstrated to the clinic screen by screen, with its feedback | [Transcript](agile-01/agile-session-transcripts-01.md), photos `01.jpg` to `16.jpg` |
| [`agile-02/`](agile-02/) | 13 October 2026 | Second Agile session | Photos `01.jpg` to `18.jpg` |
| [`agile-03/`](agile-03/) | 19 October 2026 | Third Agile session, with the student assistants | The changes it asked for are below |

## What came out of the third session

The clinic's requests from the 19 October session were built on the `feat/clinic-feedback`
branch. The design is in
[`../superpowers/specs/2026-10-19-clinic-feedback-design.md`](../superpowers/specs/2026-10-19-clinic-feedback-design.md):

- The form codes corrected from `MOS` to `MDS` (`FM-SSA-MDS-8011` to `8013`).
- An **Archive** page listing archived patients, with restore for the coordinator.
- **Others** as a patient type, for visitors, guests, contractors and parents.
- The audit log names the person and their role.
- Blood pressure typed in one box (`120/80`), and names capitalised as they are typed.
- Reports downloadable as a formatted **Excel** workbook as well as CSV.
- **Medical kit** loans to organizations (forms `FM-SSA-MDS-8032` and `8033`), drawing on
  the same medicine stock as the inventory.

When adding a session, give it the next `agile-NN/` folder, number its photos from `01.jpg`,
and leave out any real patient details (Data Privacy Act of 2012).
