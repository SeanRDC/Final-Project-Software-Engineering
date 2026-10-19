// The ISO document codes of the clinic's patient record forms, one per kind of patient.

import type { EducationLevel, PatientType } from '@/api/types'

export const FORM_REVISION = '0'
export const FORM_EFFECTIVITY_DATE = 'May 1, 2025'

const EMPLOYEE_FORM = 'FM-SSA-MDS-8011'
const BASIC_EDUCATION_FORM = 'FM-SSA-MDS-8012'
const COLLEGE_FORM = 'FM-SSA-MDS-8013'
// The clinic has not issued a code for the Others form yet; the Xs mark the placeholder.
const OTHERS_FORM = 'FM-SSA-MDS-XXXX'

type Filed = {
  patient_type: PatientType
  education_level: EducationLevel | null
}

/** The code of the form a patient's record is filed under. */
export function formCode(patient: Filed): string {
  if (patient.patient_type === 'employee') return EMPLOYEE_FORM
  if (patient.patient_type === 'other') return OTHERS_FORM
  return patient.education_level === 'basic_education' ? BASIC_EDUCATION_FORM : COLLEGE_FORM
}
