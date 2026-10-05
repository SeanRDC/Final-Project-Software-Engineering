import { useState } from 'react'

import { toDayString } from '@/lib/format'
import { useDashboard } from '@/pages/dashboard/useDashboard'

/**
 * The clinic's current day as "2026-10-06". The server decides it (the clinic's time
 * zone, not the station's clock); until its answer arrives the station's date is used.
 */
export function useClinicToday(): string {
  const { data } = useDashboard()
  const [stationDay] = useState(() => toDayString(new Date()))
  return data?.date ?? stationDay
}
