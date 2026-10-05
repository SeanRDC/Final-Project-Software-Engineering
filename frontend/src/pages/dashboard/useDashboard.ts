import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { Dashboard } from '@/api/types'
import { useAuth } from '@/auth/authContext'

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const

/** Everything the Clinic Main Menu shows, in one request. Live events keep it current. */
export function useDashboard() {
  const { user } = useAuth()

  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: ({ signal }) => api<Dashboard>('/dashboard', { signal }),
    enabled: user !== null,
  })
}
