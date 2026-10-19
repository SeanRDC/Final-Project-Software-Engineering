// Made-up medical kits and loans for the medical kit screens' tests.

import type { KitContentsLine, Medkit, MedkitRequest, MedkitRequestSummary } from '@/api/types'

export function requestSummary(
  overrides: Partial<MedkitRequestSummary> = {},
): MedkitRequestSummary {
  return {
    id: 2,
    organization: 'Junior Philippine Computer Society',
    activity: 'Intramurals 2026',
    activity_date: '2026-10-05',
    venue: 'University gym',
    person_responsible: 'Dela Cruz, Juan',
    status: 'issued',
    is_overdue: false,
    medkit: { id: 3, kit_number: 3, label: 'Grey box' },
    created_at: '2026-10-02T01:00:00+00:00',
    issued_at: '2026-10-04T01:00:00+00:00',
    ...overrides,
  }
}

export function medkitRequest(overrides: Partial<MedkitRequest> = {}): MedkitRequest {
  return {
    ...requestSummary(),
    status: 'requested',
    medkit: null,
    issued_at: null,
    contact_number: '0917 555 0100',
    requested_by: 'Lim, Joseph',
    request_date: '2026-10-02',
    notes: null,
    issued_by_name: null,
    closed_at: null,
    closed_by_name: null,
    items: [],
    ...overrides,
  }
}

export function kit(overrides: Partial<Medkit> = {}): Medkit {
  return {
    id: 3,
    kit_number: 3,
    label: 'Grey box',
    status: 'available',
    is_active: true,
    current_request: null,
    ...overrides,
  }
}

export const contents: KitContentsLine[] = [
  {
    medicine_id: 11,
    medicine_name: 'Loperamide 2 mg',
    unit: 'capsule',
    default_quantity: 10,
    quantity_on_hand: 40,
  },
  {
    medicine_id: 12,
    medicine_name: 'Paracetamol 500 mg',
    unit: 'tablet',
    default_quantity: 20,
    quantity_on_hand: 240,
  },
]
