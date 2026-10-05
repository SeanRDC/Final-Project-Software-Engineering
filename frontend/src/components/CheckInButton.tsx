import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/api/client'
import type { Appointment } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { staleQueriesFor } from '@/live/liveQueries'

/** Opens a visit for a confirmed appointment once the patient has arrived. */
export function CheckInButton({ appointment }: { appointment: Appointment }) {
  const queryClient = useQueryClient()
  const name = appointment.patient.full_name

  const checkIn = useMutation({
    mutationFn: () => api(`/appointments/${appointment.id}/check-in`, { method: 'POST', json: {} }),
    onSuccess: () => {
      toast.success(`${name} checked in`, {
        description: 'A visit was opened for the appointment.',
      })
      // The live event does the same; this covers a station whose connection has dropped.
      for (const event of ['visits.updated', 'appointments.updated']) {
        for (const key of staleQueriesFor(event)) {
          void queryClient.invalidateQueries({ queryKey: [key] })
        }
      }
    },
    onError: (error) => {
      toast.error(`Could not check in ${name}`, {
        description: error instanceof ApiError ? error.message : 'Please try again.',
      })
    },
  })

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 bg-card px-3 text-sm"
      disabled={checkIn.isPending}
      aria-label={`Check in ${name}`}
      onClick={() => checkIn.mutate()}
    >
      {checkIn.isPending ? <Spinner data-icon="inline-start" /> : null}
      Check in
    </Button>
  )
}
