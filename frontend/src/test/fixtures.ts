// Made-up accounts and records shared by the tests. Never real patient data.

import type { CurrentUser } from '@/api/types'

export const nurse: CurrentUser = {
  id: 2,
  username: 'nurse',
  full_name: 'Reyes, Ana',
  role: 'clinic_staff',
  job_title: 'Nurse',
  is_active: true,
  must_change_password: false,
  created_at: '2026-10-01T00:00:00Z',
  last_login_at: null,
  permissions: [
    'appointments:read',
    'appointments:write',
    'attachments:read',
    'attachments:write',
    'inventory:read',
    'inventory:write',
    'medicines:dispense',
    'patients:read',
    'patients:write',
    'reports:view',
    'visits:read',
    'visits:record',
  ],
}

export const doctor: CurrentUser = {
  id: 4,
  username: 'doctor',
  full_name: 'Dr. Villareal',
  role: 'doctor',
  job_title: 'Attending Physician',
  is_active: true,
  must_change_password: false,
  created_at: '2026-10-01T00:00:00Z',
  last_login_at: null,
  permissions: [
    'appointments:read',
    'attachments:read',
    'attachments:write',
    'inventory:read',
    'patients:read',
    'patients:write',
    'reports:view',
    'visits:consult',
    'visits:read',
  ],
}
