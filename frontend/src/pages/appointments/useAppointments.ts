import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type {
  Appointment,
  AppointmentCreate,
  AppointmentPage,
  AppointmentUpdate,
} from '@/api/types'
import { staleQueriesFor } from '@/live/liveQueries'

/** One day's appointments in order of time. The server leaves cancelled ones out. */
export function useAppointmentsForDay(day: string) {
  return useQuery({
    queryKey: ['appointments', 'day', day],
    queryFn: ({ signal }) => api<Appointment[]>('/appointments/today', { query: { day }, signal }),
  })
}

/** Every appointment still waiting for the coordinator's decision, on any date. */
export function usePendingAppointments(enabled: boolean) {
  return useQuery({
    queryKey: ['appointments', 'pending'],
    queryFn: ({ signal }) =>
      api<AppointmentPage>('/appointments', {
        query: { status: 'pending', page_size: 50 },
        signal,
      }),
    enabled,
  })
}

/**
 * A change to appointments. The server sends "appointments.updated" over the WebSocket
 * as well; refetching here covers a station whose connection has dropped.
 */
function useAppointmentMutation<Input>(send: (input: Input) => Promise<Appointment>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      const stale = new Set([
        ...staleQueriesFor('appointments.updated'),
        ...staleQueriesFor('notifications.updated'),
      ])
      for (const key of stale) void queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}

/** Books an appointment. It starts as pending until the coordinator confirms it. */
export function useBookAppointment() {
  return useAppointmentMutation((request: AppointmentCreate) =>
    api<Appointment>('/appointments', { method: 'POST', json: request }),
  )
}

/** Reschedules or edits an appointment. */
export function useUpdateAppointment(appointmentId: number) {
  return useAppointmentMutation((changes: AppointmentUpdate) =>
    api<Appointment>(`/appointments/${appointmentId}`, { method: 'PATCH', json: changes }),
  )
}

/** The coordinator approves a pending appointment. */
export function useConfirmAppointment(appointmentId: number) {
  return useAppointmentMutation(() =>
    api<Appointment>(`/appointments/${appointmentId}/confirm`, { method: 'POST' }),
  )
}

/** The coordinator cancels an appointment, with an optional reason. */
export function useCancelAppointment(appointmentId: number) {
  return useAppointmentMutation((reason: string) =>
    api<Appointment>(`/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      json: { reason: reason.trim() || null },
    }),
  )
}

/** Marks a confirmed appointment whose patient did not come. */
export function useMarkNoShow(appointmentId: number) {
  return useAppointmentMutation(() =>
    api<Appointment>(`/appointments/${appointmentId}/no-show`, { method: 'POST' }),
  )
}
