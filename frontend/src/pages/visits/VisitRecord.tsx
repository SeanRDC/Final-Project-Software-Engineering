import { LockIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import type { PatientAlerts, Visit } from '@/api/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { dispositionLabel } from '@/lib/status'
import { MedicinesSection } from '@/pages/visits/MedicinesSection'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** A labelled value. Renders nothing when there is no value to show. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[15px] whitespace-pre-line">{children}</dd>
    </div>
  )
}

const NOT_RECORDED = <p className="text-sm text-muted-foreground">Not recorded yet.</p>

const ALERT_LABELS: [keyof PatientAlerts, string][] = [
  ['allergies', 'Allergies'],
  ['medical_conditions', 'Medical conditions'],
  ['medication_restrictions', 'Medication restrictions'],
  ['activity_restrictions', 'Activity restrictions'],
]

function vitalSigns(visit: Visit): [string, string][] {
  const signs: [string, string | null][] = [
    ['Temperature', visit.temperature_c === null ? null : `${visit.temperature_c} °C`],
    [
      'Blood pressure',
      visit.bp_systolic === null || visit.bp_diastolic === null
        ? null
        : `${visit.bp_systolic}/${visit.bp_diastolic} mmHg`,
    ],
    ['Pulse rate', visit.pulse_rate === null ? null : `${visit.pulse_rate} bpm`],
    ['Respiratory rate', visit.respiratory_rate === null ? null : `${visit.respiratory_rate} /min`],
    ['Oxygen saturation', visit.oxygen_saturation === null ? null : `${visit.oxygen_saturation}%`],
    ['Weight', visit.weight_kg === null ? null : `${visit.weight_kg} kg`],
    ['Height', visit.height_cm === null ? null : `${visit.height_cm} cm`],
  ]
  return signs.filter((sign): sign is [string, string] => sign[1] !== null)
}

/** Everything recorded on a visit: alerts, vital signs, the nurse's and the doctor's notes, medicines. */
type VisitRecordProps = {
  visit: Visit
  /** Show the form for releasing medicine and the means to undo a release. */
  canReleaseMedicine?: boolean
}

export function VisitRecord({ visit, canReleaseMedicine = false }: VisitRecordProps) {
  const alerts = ALERT_LABELS.filter(([key]) => visit.patient_alerts[key])
  const vitals = vitalSigns(visit)
  const hasNurseRecord =
    visit.assessment || visit.treatment || visit.remarks || visit.referred || visit.disposition
  const hasConsultation =
    visit.consultation_notes || visit.diagnosis || visit.medication_details || visit.doctor_name

  return (
    <div className="flex flex-col gap-5">
      {alerts.length > 0 ? (
        <Alert className="border-warning/40 bg-warning-subtle text-foreground">
          <TriangleAlertIcon className="text-warning" />
          <AlertTitle>Patient alerts</AlertTitle>
          <AlertDescription className="text-foreground">
            <dl className="mt-1 flex flex-col gap-1.5">
              {alerts.map(([key, label]) => (
                <div key={key}>
                  <dt className="inline font-medium">{label}: </dt>
                  <dd className="inline">{visit.patient_alerts[key]}</dd>
                </div>
              ))}
            </dl>
          </AlertDescription>
        </Alert>
      ) : null}

      {visit.lock ? (
        <Alert>
          <LockIcon />
          <AlertTitle>Being edited by {visit.lock.locked_by_name}</AlertTitle>
          <AlertDescription>
            The record can be read, but changes are held until they finish.
          </AlertDescription>
        </Alert>
      ) : null}

      {visit.status === 'cancelled' ? (
        <Section title="Cancelled">
          <p className="text-[15px]">{visit.cancelled_reason ?? 'No reason was given.'}</p>
        </Section>
      ) : null}

      <Section title="Complaint">
        <p className="text-[15px] whitespace-pre-line">{visit.complaint}</p>
      </Section>

      <Section title="Vital signs">
        {vitals.length === 0 ? (
          NOT_RECORDED
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {vitals.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="text-[15px] font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <Section title="Nurse’s record">
        {hasNurseRecord ? (
          <dl className="flex flex-col gap-3">
            <Detail label="Assessment">{visit.assessment}</Detail>
            <Detail label="Treatment">{visit.treatment}</Detail>
            <Detail label="Remarks">{visit.remarks}</Detail>
            <Detail label="Referred">
              {visit.referred ? (visit.referral_details ?? 'Yes') : null}
            </Detail>
            <Detail label="Outcome">
              {visit.disposition ? dispositionLabel(visit.disposition) : null}
            </Detail>
          </dl>
        ) : (
          NOT_RECORDED
        )}
        {visit.guardian_notified ? (
          <p className="text-sm text-muted-foreground">The guardian was notified.</p>
        ) : null}
      </Section>

      <Section title="Doctor’s consultation">
        {hasConsultation ? (
          <dl className="flex flex-col gap-3">
            <Detail label="Doctor">{visit.doctor_name}</Detail>
            <Detail label="Consultation notes">{visit.consultation_notes}</Detail>
            <Detail label="Diagnosis">{visit.diagnosis}</Detail>
            <Detail label="Medication details">{visit.medication_details}</Detail>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No consultation on this visit.</p>
        )}
      </Section>

      <Section title="Medicine released">
        <MedicinesSection visit={visit} canRelease={canReleaseMedicine} />
      </Section>
    </div>
  )
}
