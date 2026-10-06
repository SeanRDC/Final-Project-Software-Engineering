import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlertIcon, ClipboardPlusIcon } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { api, ApiError } from '@/api/client'
import type { CheckInRequest, PatientSummary, Visit, VisitType } from '@/api/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { humanize, parseDay } from '@/lib/format'
import { addComplaint, COMMON_COMPLAINTS } from '@/lib/quickPicks'
import { VISIT_TYPES } from '@/lib/status'
import { useClinicToday } from '@/lib/useClinicToday'
import { describePatient } from '@/lib/visitState'
import { staleQueriesFor } from '@/live/liveQueries'
import { PatientPicker } from '@/pages/checkin/PatientPicker'
import { usePatient } from '@/pages/patients/usePatients'

/** The id of the visit the patient already has open, when that is why check-in was refused. */
function openVisitId(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const id = error.data.visit_id
  return typeof id === 'number' ? id : null
}

/** Opens a visit for a patient who walked in: pick the record, then log the complaint. */
export function WalkInForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const complaintRef = useRef<HTMLTextAreaElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [picked, setPicked] = useState<PatientSummary | null>(null)
  // A patient record can send someone here with that patient already chosen: /check-in?patient=12
  const linkedId = /^\d+$/.test(searchParams.get('patient') ?? '')
    ? Number(searchParams.get('patient'))
    : null
  const linked = usePatient(picked ? null : linkedId)
  const patient: PatientSummary | null = picked ?? linked.data ?? null
  const [complaint, setComplaint] = useState('')
  const [visitType, setVisitType] = useState<VisitType>('consultation')
  const today = useClinicToday()
  // Null means today. An earlier date is for a visit written on paper and entered later.
  const [earlierDate, setEarlierDate] = useState<string | null>(null)
  const visitDate = earlierDate ?? today
  const isLate = visitDate < today
  const isFuture = visitDate > today
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const checkIn = useMutation({
    mutationFn: (request: CheckInRequest) =>
      api<Visit>('/visits', { method: 'POST', json: request }),
    onSuccess: (visit) => {
      toast.success(`${visit.patient.full_name} checked in`)
      for (const key of staleQueriesFor('visits.updated')) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      void navigate(`/visits/${visit.id}`)
    },
  })

  function choosePatient(next: PatientSummary | null) {
    setPicked(next)
    if (next === null && linkedId !== null) setSearchParams({}, { replace: true })
    // What was typed belongs to the previous patient and must not follow to the next one.
    setComplaint('')
    setVisitType('consultation')
    setEarlierDate(null)
    setWasSubmitted(false)
    checkIn.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!patient) return
    setWasSubmitted(true)
    if (!complaint.trim()) {
      complaintRef.current?.focus()
      return
    }
    if (isFuture) {
      document.getElementById('visit-date')?.focus()
      return
    }
    checkIn.mutate({
      patient_id: patient.id,
      complaint: complaint.trim(),
      visit_type: visitType,
      // Left out for today, so the server decides what today is.
      ...(isLate ? { visit_date: visitDate } : {}),
    })
  }

  if (!patient && linkedId !== null && linked.isPending) {
    return (
      <div role="status" aria-label="Loading the patient">
        <Skeleton className="h-16" />
      </div>
    )
  }
  if (!patient) return <PatientPicker onSelect={choosePatient} />

  const complaintMissing = wasSubmitted && !complaint.trim()
  const existingVisitId = openVisitId(checkIn.error)

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{patient.full_name}</p>
            <p className="truncate text-sm text-muted-foreground">
              <span className="tabular-nums">{patient.id_number}</span> · {describePatient(patient)}
              {patient.department ? ` · ${patient.department}` : ''}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => choosePatient(null)}>
            Change
          </Button>
        </div>

        {checkIn.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not check in {patient.full_name}</AlertTitle>
            <AlertDescription>
              <p>
                {checkIn.error instanceof ApiError
                  ? checkIn.error.message
                  : 'Something went wrong. Please try again.'}
              </p>
              {existingVisitId !== null ? (
                <Link
                  to={`/visits/${existingVisitId}`}
                  className="font-medium underline underline-offset-4"
                >
                  Open that visit
                </Link>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={complaintMissing || undefined}>
          <FieldLabel htmlFor="complaint">Complaint</FieldLabel>
          <Textarea
            ref={complaintRef}
            id="complaint"
            name="complaint"
            rows={3}
            placeholder="What the patient came in for, e.g. headache since this morning…"
            autoComplete="off"
            autoFocus
            required
            aria-invalid={complaintMissing || undefined}
            aria-describedby={complaintMissing ? 'complaint-error' : undefined}
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
          />
          {complaintMissing ? (
            <FieldError id="complaint-error">Enter the patient’s complaint.</FieldError>
          ) : null}
          <div role="group" aria-label="Common complaints" className="flex flex-wrap gap-1.5">
            {COMMON_COMPLAINTS.map((pick) => (
              <Button
                key={pick}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setComplaint(addComplaint(complaint, pick))
                  complaintRef.current?.focus()
                }}
              >
                {pick}
              </Button>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="visit-type">Type of visit</FieldLabel>
          <NativeSelect
            id="visit-type"
            name="visit_type"
            value={visitType}
            onChange={(event) => setVisitType(event.target.value as VisitType)}
          >
            {VISIT_TYPES.map((type) => (
              <NativeSelectOption key={type} value={type}>
                {humanize(type)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field data-invalid={isFuture || undefined}>
          <FieldLabel htmlFor="visit-date">Date of visit</FieldLabel>
          <Input
            id="visit-date"
            name="visit_date"
            type="date"
            className="w-auto self-start"
            max={today}
            aria-invalid={isFuture || undefined}
            aria-describedby={
              isFuture ? 'visit-date-error' : isLate ? 'visit-date-note' : undefined
            }
            value={visitDate}
            onChange={(event) =>
              setEarlierDate(
                event.target.value && event.target.value !== today ? event.target.value : null,
              )
            }
          />
          {isFuture ? (
            <FieldError id="visit-date-error">
              A visit cannot be logged for a future date.
            </FieldError>
          ) : null}
          {isLate ? (
            <FieldDescription id="visit-date-note">
              This is saved as a visit on{' '}
              {parseDay(visitDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              , entered late. It will not appear in today’s visits; find it in the patient’s visit
              history.
            </FieldDescription>
          ) : null}
        </Field>

        <Button
          type="submit"
          size="lg"
          className="h-10 self-start px-4"
          disabled={checkIn.isPending}
        >
          {checkIn.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <ClipboardPlusIcon data-icon="inline-start" />
          )}
          {checkIn.isPending ? 'Checking in…' : 'Check in patient'}
        </Button>
      </FieldGroup>
    </form>
  )
}
