// A made-up full patient record (GET /patients/{id}) for the patient screens' tests.

import type { Patient } from '@/api/types'
import { patient } from '@/test/dashboardFixture'

export function patientRecord(overrides: Partial<Patient> = {}): Patient {
  return {
    ...patient(),
    allergies: 'Penicillin',
    medical_conditions: 'Asthma',
    medication_restrictions: null,
    activity_restrictions: 'No strenuous physical activity',
    birth_date: '2006-03-14',
    program_or_position: 'BS Computer Science',
    contact_number: '0917 555 0142',
    email: 'maria.santos@example.com',
    address: 'Angeles City, Pampanga',
    guardian_name: 'Santos, Elena',
    guardian_relationship: 'Mother',
    guardian_contact: '0918 555 0199',
    blood_type: 'O+',
    notes: null,
    consent_on_file: true,
    created_at: '2026-08-10T02:00:00+00:00',
    updated_at: '2026-09-01T02:00:00+00:00',
    visit_count: 3,
    last_visit_date: '2026-10-04',
    ...overrides,
  }
}
