import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import type { PatientSummary } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatClock } from '@/lib/format'
import { useClinicToday } from '@/lib/useClinicToday'
import { AppointmentForm } from '@/pages/appointments/AppointmentForm'
import { createRequest, emptyAppointment } from '@/pages/appointments/appointmentValues'
import { useBookAppointment } from '@/pages/appointments/useAppointments'
import { usePatient } from '@/pages/patients/usePatients'

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Books an appointment. `?date=` and `?patient=` in the address fill those in ahead. */
export function NewAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const today = useClinicToday()
  const allowed = useCan()
  const book = useBookAppointment()

  const dateParam = searchParams.get('date') ?? ''
  const startDate = DAY.test(dateParam) && dateParam >= today ? dateParam : today
  const linkedId = /^\d+$/.test(searchParams.get('patient') ?? '')
    ? Number(searchParams.get('patient'))
    : null

  const [picked, setPicked] = useState<PatientSummary | null>(null)
  const [dismissedLink, setDismissedLink] = useState(false)
  const linked = usePatient(picked || dismissedLink ? null : linkedId)
  const patient: PatientSummary | null = picked ?? (dismissedLink ? null : (linked.data ?? null))
  const [initialValues] = useState(() => emptyAppointment(startDate))

  const isLoadingLinked = !patient && linkedId !== null && !dismissedLink && linked.isPending

  return (
    <SectionCard title="New appointment" className="mx-auto max-w-3xl">
      <div className="p-4 md:p-6">
        {isLoadingLinked ? (
          <div role="status" aria-label="Loading the patient">
            <Skeleton className="h-16" />
          </div>
        ) : (
          <AppointmentForm
            patient={patient}
            onPatientChange={(next) => {
              setPicked(next)
              if (next === null) setDismissedLink(true)
            }}
            initialValues={initialValues}
            minDate={today}
            submitLabel="Book appointment"
            savingLabel="Booking…"
            isSaving={book.isPending}
            error={book.error}
            note={
              allowed('appointments:decide')
                ? 'The appointment starts as pending. Confirm it from the appointments list.'
                : 'The appointment starts as pending until the Clinic Coordinator confirms it.'
            }
            onCancel={() => void navigate(`/appointments?date=${startDate}`)}
            onSubmit={(values) => {
              if (!patient) return
              book.mutate(createRequest(patient.id, values), {
                onSuccess: (appointment) => {
                  toast.success(`Appointment booked for ${appointment.patient.full_name}`, {
                    description: `${formatClock(appointment.start_time)}, awaiting confirmation.`,
                  })
                  void navigate(`/appointments?date=${appointment.scheduled_date}`)
                },
              })
            }}
          />
        )}
      </div>
    </SectionCard>
  )
}
