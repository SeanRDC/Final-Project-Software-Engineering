import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Appointment } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useClinicToday } from '@/lib/useClinicToday'
import { AppointmentForm } from '@/pages/appointments/AppointmentForm'
import {
  appointmentChanges,
  appointmentValues,
  isReschedule,
} from '@/pages/appointments/appointmentValues'
import { useAppointmentsForDay, useUpdateAppointment } from '@/pages/appointments/useAppointments'

function EditForm({ appointment, today }: { appointment: Appointment; today: string }) {
  const navigate = useNavigate()
  const allowed = useCan()
  const save = useUpdateAppointment(appointment.id)
  const [initialValues] = useState(() => appointmentValues(appointment))
  const back = `/appointments?date=${appointment.scheduled_date}`
  const staysConfirmed = appointment.status !== 'confirmed' || allowed('appointments:decide')

  return (
    <AppointmentForm
      patient={appointment.patient}
      initialValues={initialValues}
      minDate={today}
      submitLabel="Save changes"
      savingLabel="Saving…"
      isSaving={save.isPending}
      error={save.error}
      note={
        staysConfirmed
          ? undefined
          : 'This appointment is confirmed. Changing its date or time sends it back to the Clinic Coordinator for confirmation.'
      }
      onCancel={() => void navigate(back)}
      onSubmit={(values) => {
        const changes = appointmentChanges(appointment, values)
        if (Object.keys(changes).length === 0) {
          void navigate(back)
          return
        }
        save.mutate(changes, {
          onSuccess: (saved) => {
            toast.success(
              isReschedule(changes)
                ? `Appointment rescheduled for ${saved.patient.full_name}`
                : `Appointment updated for ${saved.patient.full_name}`,
              {
                description:
                  saved.status === 'pending' && appointment.status === 'confirmed'
                    ? 'It is pending again until the coordinator confirms the new time.'
                    : undefined,
              },
            )
            void navigate(`/appointments?date=${saved.scheduled_date}`)
          },
        })
      }}
    />
  )
}

/**
 * Reschedules or edits an appointment at /appointments/:appointmentId/edit?date=YYYY-MM-DD.
 * The API has no route for one appointment, so it is found in its day's list.
 */
export function EditAppointmentPage() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const today = useClinicToday()
  const appointmentId = Number(params.appointmentId)
  const day = searchParams.get('date') ?? today
  const { data, error, isPending } = useAppointmentsForDay(day)
  const appointment = data?.find((item) => item.id === appointmentId)
  const isClosed =
    appointment !== undefined &&
    appointment.status !== 'pending' &&
    appointment.status !== 'confirmed'

  return (
    <SectionCard title="Reschedule or edit appointment" className="mx-auto max-w-3xl">
      <div className="p-4 md:p-6">
        {isPending ? (
          <div role="status" aria-label="Loading the appointment">
            <Skeleton className="h-40" />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error instanceof ApiError ? error.message : 'The appointment could not be loaded.'}
          </p>
        ) : null}

        {data && (!appointment || isClosed) ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-[15px]">
              {isClosed
                ? `This appointment is ${appointment.status.replace('_', ' ')} and can no longer be changed.`
                : 'This appointment could not be found on that day. It may have been moved.'}
            </p>
            <Button asChild variant="outline">
              <Link to={`/appointments?date=${day}`}>Back to appointments</Link>
            </Button>
          </div>
        ) : null}

        {appointment && !isClosed ? (
          <EditForm key={appointment.id} appointment={appointment} today={today} />
        ) : null}
      </div>
    </SectionCard>
  )
}
