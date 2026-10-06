// The logic behind the visit forms, kept apart from the markup: what the fields start
// with, what makes them invalid, and which of them changed and need to be sent.

import type {
  ConsultationUpdate,
  Visit,
  VisitDisposition,
  VisitRecordUpdate,
  VisitType,
} from '@/api/types'

type VitalKey =
  | 'temperature_c'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'pulse_rate'
  | 'respiratory_rate'
  | 'oxygen_saturation'
  | 'weight_kg'
  | 'height_cm'

export type VitalField = {
  key: VitalKey
  label: string
  unit: string
  min: number
  max: number
  /** Whole numbers only. */
  integer: boolean
}

// The limits are the ones the API enforces (backend/app/schemas/visit.py).
export const VITALS: VitalField[] = [
  { key: 'temperature_c', label: 'Temperature', unit: '°C', min: 30, max: 45, integer: false },
  { key: 'bp_systolic', label: 'BP systolic', unit: 'mmHg', min: 40, max: 300, integer: true },
  { key: 'bp_diastolic', label: 'BP diastolic', unit: 'mmHg', min: 20, max: 200, integer: true },
  { key: 'pulse_rate', label: 'Pulse rate', unit: 'bpm', min: 20, max: 250, integer: true },
  {
    key: 'respiratory_rate',
    label: 'Respiratory rate',
    unit: '/min',
    min: 5,
    max: 80,
    integer: true,
  },
  {
    key: 'oxygen_saturation',
    label: 'Oxygen saturation',
    unit: '%',
    min: 50,
    max: 100,
    integer: true,
  },
  { key: 'weight_kg', label: 'Weight', unit: 'kg', min: 1, max: 400, integer: false },
  { key: 'height_cm', label: 'Height', unit: 'cm', min: 20, max: 260, integer: false },
]

/** The nurse's form. Numbers are kept as typed text until they are sent. */
export type RecordValues = Record<VitalKey, string> & {
  complaint: string
  visit_type: VisitType
  assessment: string
  treatment: string
  remarks: string
  guardian_notified: boolean
  referred: boolean
  referral_details: string
  disposition: VisitDisposition | ''
}

/** The doctor's form. */
export type ConsultationValues = {
  consultation_notes: string
  diagnosis: string
  medication_details: string
  referred: boolean
  referral_details: string
  disposition: VisitDisposition | ''
}

export type FormErrors<Values> = Partial<Record<keyof Values, string>>

const text = (value: string | null): string => value ?? ''
const numberText = (value: number | null): string => (value === null ? '' : String(value))
const blankToNull = (value: string): string | null => value.trim() || null

export function recordValues(visit: Visit): RecordValues {
  return {
    complaint: visit.complaint,
    visit_type: visit.visit_type,
    temperature_c: numberText(visit.temperature_c),
    bp_systolic: numberText(visit.bp_systolic),
    bp_diastolic: numberText(visit.bp_diastolic),
    pulse_rate: numberText(visit.pulse_rate),
    respiratory_rate: numberText(visit.respiratory_rate),
    oxygen_saturation: numberText(visit.oxygen_saturation),
    weight_kg: numberText(visit.weight_kg),
    height_cm: numberText(visit.height_cm),
    assessment: text(visit.assessment),
    treatment: text(visit.treatment),
    remarks: text(visit.remarks),
    guardian_notified: visit.guardian_notified,
    referred: visit.referred,
    referral_details: text(visit.referral_details),
    disposition: visit.disposition ?? '',
  }
}

export function consultationValues(visit: Visit): ConsultationValues {
  return {
    consultation_notes: text(visit.consultation_notes),
    diagnosis: text(visit.diagnosis),
    medication_details: text(visit.medication_details),
    referred: visit.referred,
    referral_details: text(visit.referral_details),
    disposition: visit.disposition ?? '',
  }
}

export function vitalError(field: VitalField, raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const number = Number(value)
  if (!Number.isFinite(number)) return 'Enter a number.'
  if (field.integer && !Number.isInteger(number)) return 'Enter a whole number.'
  if (number < field.min || number > field.max) {
    return `Enter a value from ${field.min} to ${field.max}.`
  }
  return undefined
}

export function validateRecord(values: RecordValues): FormErrors<RecordValues> {
  const errors: FormErrors<RecordValues> = {}
  if (!values.complaint.trim()) errors.complaint = 'Enter the patient’s complaint.'
  for (const field of VITALS) {
    const error = vitalError(field, values[field.key])
    if (error) errors[field.key] = error
  }
  // Half a blood pressure reading is a slip, not a measurement.
  const systolic = values.bp_systolic.trim()
  const diastolic = values.bp_diastolic.trim()
  if (systolic && !diastolic) errors.bp_diastolic ??= 'Enter the diastolic value too.'
  if (diastolic && !systolic) errors.bp_systolic ??= 'Enter the systolic value too.'
  return errors
}

/** Only what differs from the saved visit, so the audit log lists the fields really changed. */
export function recordChanges(visit: Visit, values: RecordValues): VisitRecordUpdate {
  const next: Required<VisitRecordUpdate> = {
    complaint: values.complaint.trim(),
    visit_type: values.visit_type,
    temperature_c: toNumber(values.temperature_c),
    bp_systolic: toNumber(values.bp_systolic),
    bp_diastolic: toNumber(values.bp_diastolic),
    pulse_rate: toNumber(values.pulse_rate),
    respiratory_rate: toNumber(values.respiratory_rate),
    oxygen_saturation: toNumber(values.oxygen_saturation),
    weight_kg: toNumber(values.weight_kg),
    height_cm: toNumber(values.height_cm),
    assessment: blankToNull(values.assessment),
    treatment: blankToNull(values.treatment),
    remarks: blankToNull(values.remarks),
    guardian_notified: values.guardian_notified,
    referred: values.referred,
    referral_details: values.referred ? blankToNull(values.referral_details) : null,
    disposition: values.disposition || null,
  }
  return changedOnly(visit, next)
}

export function consultationChanges(visit: Visit, values: ConsultationValues): ConsultationUpdate {
  const next: Required<ConsultationUpdate> = {
    consultation_notes: blankToNull(values.consultation_notes),
    diagnosis: blankToNull(values.diagnosis),
    medication_details: blankToNull(values.medication_details),
    referred: values.referred,
    referral_details: values.referred ? blankToNull(values.referral_details) : null,
    disposition: values.disposition || null,
  }
  return changedOnly(visit, next)
}

function toNumber(raw: string): number | null {
  const value = raw.trim()
  return value ? Number(value) : null
}

function changedOnly<Update extends object>(visit: Visit, next: Update): Partial<Update> {
  const saved = visit as unknown as Record<string, unknown>
  const changes: Partial<Update> = {}
  for (const key of Object.keys(next) as (keyof Update)[]) {
    if (next[key] !== saved[key as string]) changes[key] = next[key]
  }
  return changes
}
