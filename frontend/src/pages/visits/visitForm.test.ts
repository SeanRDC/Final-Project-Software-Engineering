import { expect, test } from 'vitest'

import {
  consultationChanges,
  consultationValues,
  recordChanges,
  recordValues,
  validateRecord,
} from '@/pages/visits/visitForm'
import { visitRecord } from '@/test/visitFixture'

test('starts the form from the saved visit, with blanks for what was not recorded', () => {
  const values = recordValues(visitRecord())

  expect(values).toMatchObject({
    complaint: 'Difficulty breathing',
    temperature_c: '36.8',
    bp_systolic: '110',
    weight_kg: '',
    remarks: '',
    guardian_notified: true,
    disposition: '',
  })
})

test('an untouched form has nothing to send', () => {
  const visit = visitRecord()

  expect(recordChanges(visit, recordValues(visit))).toEqual({})
  expect(consultationChanges(visit, consultationValues(visit))).toEqual({})
})

test('sends only the fields that changed, as numbers and trimmed text', () => {
  const visit = visitRecord()
  const values = {
    ...recordValues(visit),
    temperature_c: ' 37.5 ',
    weight_kg: '52',
    remarks: '  Advised to rest  ',
    disposition: 'sent_home' as const,
  }

  expect(recordChanges(visit, values)).toEqual({
    temperature_c: 37.5,
    weight_kg: 52,
    remarks: 'Advised to rest',
    disposition: 'sent_home',
  })
})

test('clearing a field sends null', () => {
  const visit = visitRecord()

  expect(
    recordChanges(visit, { ...recordValues(visit), pulse_rate: '', assessment: '  ' }),
  ).toEqual({
    pulse_rate: null,
    assessment: null,
  })
})

test('unticking referred also clears the referral details', () => {
  const visit = visitRecord({ referred: true, referral_details: 'Angeles Medical Center' })

  expect(recordChanges(visit, { ...recordValues(visit), referred: false })).toEqual({
    referred: false,
    referral_details: null,
  })
})

test('the consultation form sends what the doctor wrote', () => {
  const visit = visitRecord()
  const values = { ...consultationValues(visit), diagnosis: 'Acute asthma exacerbation' }

  expect(consultationChanges(visit, values)).toEqual({ diagnosis: 'Acute asthma exacerbation' })
})

test('accepts a valid record', () => {
  expect(validateRecord(recordValues(visitRecord()))).toEqual({})
})

test('requires the complaint', () => {
  expect(validateRecord({ ...recordValues(visitRecord()), complaint: '  ' }).complaint).toBe(
    'Enter the patient’s complaint.',
  )
})

test('rejects vital signs that are not numbers, not whole, or out of range', () => {
  const errors = validateRecord({
    ...recordValues(visitRecord()),
    temperature_c: 'warm',
    pulse_rate: '72.5',
    oxygen_saturation: '120',
  })

  expect(errors.temperature_c).toBe('Enter a number.')
  expect(errors.pulse_rate).toBe('Enter a whole number.')
  expect(errors.oxygen_saturation).toBe('Enter a value from 50 to 100.')
})

test('asks for both halves of a blood pressure reading', () => {
  const values = recordValues(visitRecord())

  expect(validateRecord({ ...values, bp_diastolic: '' }).bp_diastolic).toBe(
    'Enter the diastolic value too.',
  )
  expect(validateRecord({ ...values, bp_systolic: '' }).bp_systolic).toBe(
    'Enter the systolic value too.',
  )
  expect(validateRecord({ ...values, bp_systolic: '', bp_diastolic: '' })).toEqual({})
})
