import { expect, test } from 'vitest'

import {
  createRequest,
  emptyPatient,
  patientChanges,
  patientValues,
  validatePatient,
} from '@/pages/patients/patientValues'
import { patientRecord } from '@/test/patientFixture'

const TODAY = new Date(2026, 9, 6)

const filled = () => ({
  ...emptyPatient(),
  id_number: ' 20261234 ',
  last_name: ' Dela Cruz ',
  first_name: 'Juan',
})

test('a new patient needs an ID number and a name', () => {
  expect(validatePatient(emptyPatient(), TODAY)).toEqual({
    id_number: 'Enter the student number.',
    last_name: 'Enter the last name.',
    first_name: 'Enter the first name.',
  })
  expect(validatePatient({ ...emptyPatient(), patient_type: 'employee' }, TODAY).id_number).toBe(
    'Enter the employee number.',
  )
})

test('accepts the required fields alone', () => {
  expect(validatePatient(filled(), TODAY)).toEqual({})
})

test('refuses a birth date in the future and a malformed email', () => {
  const errors = validatePatient(
    { ...filled(), birth_date: '2026-10-07', email: 'juan@example' },
    TODAY,
  )

  expect(errors.birth_date).toBe('The birth date cannot be in the future.')
  expect(errors.email).toBe('Enter an email address like name@example.com.')
  expect(validatePatient({ ...filled(), birth_date: '2026-10-06' }, TODAY)).toEqual({})
})

test('holds text to the lengths the server accepts', () => {
  const errors = validatePatient({ ...filled(), contact_number: '0'.repeat(31) }, TODAY)

  expect(errors.contact_number).toBe('Use 30 characters or fewer.')
})

test('the registration request trims text and sends blanks as null', () => {
  const request = createRequest({ ...filled(), allergies: '  Penicillin ', sex: 'male' })

  expect(request).toMatchObject({
    patient_type: 'student',
    id_number: '20261234',
    last_name: 'Dela Cruz',
    first_name: 'Juan',
    allergies: 'Penicillin',
    sex: 'male',
    birth_date: null,
    middle_name: null,
    consent_on_file: false,
  })
})

test('an untouched record has nothing to send', () => {
  const patient = patientRecord()

  expect(patientChanges(patient, patientValues(patient))).toEqual({})
})

test('a correction sends only the fields that changed', () => {
  const patient = patientRecord()
  const values = {
    ...patientValues(patient),
    contact_number: '0917 555 0000',
    medical_conditions: '',
    medication_restrictions: 'No NSAIDs',
  }

  expect(patientChanges(patient, values)).toEqual({
    contact_number: '0917 555 0000',
    medical_conditions: null,
    medication_restrictions: 'No NSAIDs',
  })
})
