// A made-up GET /dashboard response for 4 October 2026, used by the dashboard tests.

import type {
  Appointment,
  Dashboard,
  Medicine,
  Notification,
  PatientSummary,
  VisitSummary,
} from '@/api/types'

export function patient(overrides: Partial<PatientSummary> = {}): PatientSummary {
  return {
    id: 1,
    patient_type: 'student',
    id_number: '20221187',
    last_name: 'Santos',
    first_name: 'Maria',
    middle_name: null,
    full_name: 'Santos, Maria',
    age: 20,
    sex: 'female',
    department: 'School of Computing',
    is_archived: false,
    ...overrides,
  }
}

export function visit(overrides: Partial<VisitSummary> = {}): VisitSummary {
  return {
    id: 14,
    visit_date: '2026-10-04',
    status: 'open',
    visit_type: 'consultation',
    complaint: 'Difficulty breathing',
    doctor_id: null,
    doctor_name: null,
    checked_in_at: '2026-10-04T01:54:00+00:00',
    completed_at: null,
    patient: patient(),
    ...overrides,
  }
}

export function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 3,
    patient: patient({ id: 7, full_name: 'Panergo, Mark', id_number: '20240556' }),
    scheduled_date: '2026-10-04',
    start_time: '10:30:00',
    end_time: '11:00:00',
    reason: 'Medical clearance for PE',
    notes: null,
    status: 'confirmed',
    decided_by_name: 'Salazar, CJ',
    decided_at: '2026-10-03T02:00:00+00:00',
    cancellation_reason: null,
    created_at: '2026-10-02T02:00:00+00:00',
    ...overrides,
  }
}

export function medicine(overrides: Partial<Medicine> = {}): Medicine {
  return {
    id: 5,
    name: 'Mefenamic Acid',
    strength: '500 mg',
    display_name: 'Mefenamic Acid 500 mg',
    form: 'capsule',
    unit: 'capsule',
    quantity_on_hand: 18,
    low_stock_threshold: 20,
    is_low_stock: true,
    expiry_date: null,
    is_active: true,
    updated_at: '2026-10-04T01:00:00+00:00',
    ...overrides,
  }
}

export function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 9,
    type: 'low_stock',
    title: 'Low stock: Mefenamic Acid 500 mg',
    body: '18 left (threshold 20)',
    entity_type: 'medicine',
    entity_id: 5,
    created_at: '2026-10-04T01:00:00+00:00',
    is_read: false,
    ...overrides,
  }
}

/** The moment the fixture is "viewed": 10:00 AM in Manila on 4 October 2026. */
export const FIXTURE_NOW = new Date('2026-10-04T02:00:00+00:00')

export const dashboard: Dashboard = {
  date: '2026-10-04',
  stats: {
    visits_today: 3,
    open_visits: 2,
    completed_today: 1,
    appointments_today: 3,
    appointments_remaining: 2,
    low_stock_items: 1,
    visits_this_month: 12,
  },
  todays_visits: [
    visit(),
    visit({
      id: 10,
      complaint: 'Sprained ankle',
      doctor_id: 4,
      doctor_name: 'Dr. Villareal',
      checked_in_at: '2026-10-04T01:25:00+00:00',
      patient: patient({ id: 2, full_name: 'Mendoza, Carlo', age: 21, id_number: '20210044' }),
    }),
    visit({
      id: 8,
      status: 'completed',
      visit_type: 'treatment',
      complaint: 'Minor wound',
      checked_in_at: '2026-10-04T00:10:00+00:00',
      completed_at: '2026-10-04T01:20:00+00:00',
      patient: patient({
        id: 3,
        full_name: 'Lim, Joseph',
        id_number: 'EMP-0031',
        patient_type: 'employee',
        age: 42,
      }),
    }),
  ],
  todays_appointments: [
    appointment({
      id: 2,
      patient: patient({ id: 6, full_name: 'Villanueva, Rosa', id_number: '20221187' }),
      start_time: '09:00:00',
      end_time: '09:30:00',
      reason: 'Follow-up: asthma',
      status: 'completed',
    }),
    appointment(),
    appointment({
      id: 4,
      patient: patient({ id: 8, full_name: 'Miranda, Gil', id_number: 'EMP-0042' }),
      start_time: '14:00:00',
      end_time: '14:30:00',
      reason: 'BP monitoring',
      status: 'pending',
      decided_by_name: null,
      decided_at: null,
    }),
  ],
  calendar: [
    { date: '2026-10-04', appointment_count: 3 },
    { date: '2026-10-05', appointment_count: 1 },
    { date: '2026-10-12', appointment_count: 2 },
  ],
  low_stock: [medicine()],
  notifications: {
    items: [
      notification(),
      notification({
        id: 8,
        type: 'appointment_pending',
        title: 'Appointment awaiting approval',
        body: 'Miranda, Gil · 4 Oct, 2:00 PM',
        entity_type: 'appointment',
        entity_id: 4,
        created_at: '2026-10-04T00:00:00+00:00',
        is_read: true,
      }),
    ],
    unread_count: 1,
  },
}
