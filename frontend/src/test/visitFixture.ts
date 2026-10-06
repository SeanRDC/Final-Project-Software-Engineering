// A made-up full visit record (GET /visits/{id}) for the visit screens' tests.

import type { Visit } from '@/api/types'
import { visit } from '@/test/dashboardFixture'

export function visitRecord(overrides: Partial<Visit> = {}): Visit {
  return {
    ...visit(),
    assessment: 'Mild wheezing on both lungs',
    treatment: 'Nebulised with salbutamol',
    diagnosis: null,
    disposition: null,
    medicines: [
      {
        id: 1,
        medicine_id: 5,
        medicine_name: 'Salbutamol 2 mg',
        quantity: 2,
        instructions: 'One tablet every 8 hours',
        dispensed_by_name: 'Reyes, Ana',
        dispensed_at: '2026-10-04T01:58:00+00:00',
      },
    ],
    appointment_id: null,
    temperature_c: 36.8,
    bp_systolic: 110,
    bp_diastolic: 70,
    pulse_rate: 96,
    respiratory_rate: 24,
    oxygen_saturation: 95,
    weight_kg: null,
    height_cm: null,
    remarks: null,
    guardian_notified: true,
    referred: false,
    referral_details: null,
    consultation_notes: null,
    medication_details: null,
    cancelled_reason: null,
    updated_at: '2026-10-04T01:58:00+00:00',
    patient_alerts: {
      allergies: 'Penicillin',
      medical_conditions: 'Asthma',
      medication_restrictions: null,
      activity_restrictions: 'No strenuous physical activity',
    },
    lock: null,
    vital_readings: [],
    ...overrides,
  }
}
