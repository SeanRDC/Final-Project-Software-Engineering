// The logic behind the patient form, used both to register a patient and to correct a
// record: starting values, what makes a field invalid, and what is sent to the server.

import type { PatientCreate, PatientRecord, PatientType, PatientUpdate, Sex } from '@/api/types'
import { toDayString } from '@/lib/format'

/** The optional text fields, with the longest value the API accepts (0 = no limit). */
const TEXT_FIELDS = {
  middle_name: 80,
  department: 120,
  program_or_position: 120,
  contact_number: 30,
  email: 120,
  address: 255,
  guardian_name: 120,
  guardian_relationship: 50,
  guardian_contact: 30,
  blood_type: 5,
  allergies: 0,
  medical_conditions: 0,
  medication_restrictions: 0,
  activity_restrictions: 0,
  notes: 0,
} as const

type TextField = keyof typeof TEXT_FIELDS
const TEXT_FIELD_NAMES = Object.keys(TEXT_FIELDS) as TextField[]

export type PatientValues = Record<TextField, string> & {
  patient_type: PatientType
  id_number: string
  last_name: string
  first_name: string
  /** "2006-03-14", or empty when not known. */
  birth_date: string
  sex: Sex | ''
  consent_on_file: boolean
}

export type PatientErrors = Partial<Record<keyof PatientValues, string>>

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

export function emptyPatient(): PatientValues {
  const blanks = Object.fromEntries(TEXT_FIELD_NAMES.map((name) => [name, ''])) as Record<
    TextField,
    string
  >
  return {
    ...blanks,
    patient_type: 'student',
    id_number: '',
    last_name: '',
    first_name: '',
    birth_date: '',
    sex: '',
    consent_on_file: false,
  }
}

export function patientValues(patient: PatientRecord): PatientValues {
  const texts = Object.fromEntries(
    TEXT_FIELD_NAMES.map((name) => [name, patient[name] ?? '']),
  ) as Record<TextField, string>
  return {
    ...texts,
    patient_type: patient.patient_type,
    id_number: patient.id_number,
    last_name: patient.last_name,
    first_name: patient.first_name,
    birth_date: patient.birth_date ?? '',
    sex: patient.sex ?? '',
    consent_on_file: patient.consent_on_file,
  }
}

export function validatePatient(values: PatientValues, today: Date = new Date()): PatientErrors {
  const errors: PatientErrors = {}
  const idLabel = values.patient_type === 'student' ? 'student number' : 'employee number'

  if (!values.id_number.trim()) errors.id_number = `Enter the ${idLabel}.`
  else if (values.id_number.trim().length > 30) errors.id_number = 'Use 30 characters or fewer.'
  if (!values.last_name.trim()) errors.last_name = 'Enter the last name.'
  else if (values.last_name.trim().length > 80) errors.last_name = 'Use 80 characters or fewer.'
  if (!values.first_name.trim()) errors.first_name = 'Enter the first name.'
  else if (values.first_name.trim().length > 80) errors.first_name = 'Use 80 characters or fewer.'

  if (values.birth_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birth_date)) {
      errors.birth_date = 'Enter the date as year, month and day.'
    } else if (values.birth_date > toDayString(today)) {
      errors.birth_date = 'The birth date cannot be in the future.'
    } else if (values.birth_date < '1900-01-01') {
      errors.birth_date = 'Check the year of birth.'
    }
  }

  const email = values.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter an email address like name@example.com.'
  }

  for (const name of TEXT_FIELD_NAMES) {
    const limit = TEXT_FIELDS[name]
    if (limit > 0 && values[name].trim().length > limit) {
      errors[name] ??= `Use ${limit} characters or fewer.`
    }
  }
  return errors
}

type Normalised = Required<PatientCreate>

function normalise(values: PatientValues): Normalised {
  const texts = Object.fromEntries(
    TEXT_FIELD_NAMES.map((name) => [name, values[name].trim() || null]),
  ) as Record<TextField, string | null>
  return {
    ...texts,
    patient_type: values.patient_type,
    id_number: values.id_number.trim(),
    last_name: values.last_name.trim(),
    first_name: values.first_name.trim(),
    birth_date: values.birth_date || null,
    sex: values.sex || null,
    consent_on_file: values.consent_on_file,
  }
}

/** The request that registers a new patient. */
export function createRequest(values: PatientValues): PatientCreate {
  return normalise(values)
}

/** Only what differs from the saved record, so the audit log lists the fields really changed. */
export function patientChanges(patient: PatientRecord, values: PatientValues): PatientUpdate {
  const next = normalise(values)
  const saved = patient as unknown as Record<string, unknown>
  const changes: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(next)) {
    if (value !== saved[key]) changes[key] = value
  }
  return changes as PatientUpdate
}
