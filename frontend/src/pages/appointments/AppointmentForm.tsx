import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { ApiError } from '@/api/client'
import type { PatientSummary } from '@/api/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { APPOINTMENT_REASONS } from '@/lib/quickPicks'
import { describePatient } from '@/lib/visitState'
import {
  defaultEnd,
  validateAppointment,
  type AppointmentErrors,
  type AppointmentValues,
} from '@/pages/appointments/appointmentValues'
import { PatientPicker } from '@/pages/checkin/PatientPicker'

type AppointmentFormProps = {
  /** The patient the appointment is for, once chosen. */
  patient: PatientSummary | null
  /** Given when booking, so the patient can be chosen and changed. Left out when rescheduling. */
  onPatientChange?: (patient: PatientSummary | null) => void
  initialValues: AppointmentValues
  /** The earliest date that can be chosen: the clinic's today. */
  minDate: string
  submitLabel: string
  savingLabel: string
  isSaving: boolean
  /** The error of the last save attempt, if it failed. */
  error: unknown
  /** Shown above the buttons, e.g. what happens to the appointment after saving. */
  note?: ReactNode
  /** Called with valid values only. */
  onSubmit: (values: AppointmentValues) => void
  onCancel: () => void
}

/** The appointment form, shared by booking and rescheduling. */
export function AppointmentForm({
  patient,
  onPatientChange,
  initialValues,
  minDate,
  submitLabel,
  savingLabel,
  isSaving,
  error,
  note,
  onSubmit,
  onCancel,
}: AppointmentFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<AppointmentErrors>({})
  // Until the end time is typed by hand it follows the start time.
  const [endWasEdited, setEndWasEdited] = useState(initialValues.end_time !== '')

  const validation = {
    hasPatient: patient !== null,
    today: minDate,
    // When rescheduling, the date the appointment already has is not an error.
    savedDate: onPatientChange ? undefined : initialValues.scheduled_date,
  }

  function change(patch: Partial<AppointmentValues>) {
    const next = { ...values, ...patch }
    if ('start_time' in patch && !endWasEdited) next.end_time = defaultEnd(next.start_time)
    setValues(next)
    // Once a field has been flagged, clear the flag as soon as it is corrected.
    if (Object.keys(errors).length > 0) {
      setErrors(validateAppointment(next, validation))
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateAppointment(values, validation)
    setErrors(found)
    const firstInvalid = Object.keys(found).find((key) => key !== 'patient')
    if (found.patient) return
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }
    onSubmit(values)
  }

  function describedBy(name: keyof AppointmentValues) {
    return {
      'aria-invalid': errors[name] ? (true as const) : undefined,
      'aria-describedby': errors[name] ? `${name}-error` : undefined,
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Appointment">
      <FieldGroup>
        {patient ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{patient.full_name}</p>
              <p className="truncate text-sm text-muted-foreground">
                <span className="tabular-nums">{patient.id_number}</span> ·{' '}
                {describePatient(patient)}
                {patient.department ? ` · ${patient.department}` : ''}
              </p>
            </div>
            {onPatientChange ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPatientChange(null)}
              >
                Change
              </Button>
            ) : null}
          </div>
        ) : onPatientChange ? (
          <div>
            <PatientPicker onSelect={onPatientChange} />
            {errors.patient ? <FieldError className="mt-2">{errors.patient}</FieldError> : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={errors.scheduled_date ? true : undefined}>
            <FieldLabel htmlFor="scheduled_date">Date</FieldLabel>
            <Input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              min={minDate}
              required
              {...describedBy('scheduled_date')}
              value={values.scheduled_date}
              onChange={(event) => change({ scheduled_date: event.target.value })}
            />
            {errors.scheduled_date ? (
              <FieldError id="scheduled_date-error">{errors.scheduled_date}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={errors.start_time ? true : undefined}>
            <FieldLabel htmlFor="start_time">Starts</FieldLabel>
            <Input
              id="start_time"
              name="start_time"
              type="time"
              step={300}
              required
              {...describedBy('start_time')}
              value={values.start_time}
              onChange={(event) => change({ start_time: event.target.value })}
            />
            {errors.start_time ? (
              <FieldError id="start_time-error">{errors.start_time}</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={errors.end_time ? true : undefined}>
            <FieldLabel htmlFor="end_time">Ends</FieldLabel>
            <Input
              id="end_time"
              name="end_time"
              type="time"
              step={300}
              required
              {...describedBy('end_time')}
              value={values.end_time}
              onChange={(event) => {
                setEndWasEdited(true)
                change({ end_time: event.target.value })
              }}
            />
            {errors.end_time ? (
              <FieldError id="end_time-error">{errors.end_time}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field data-invalid={errors.reason ? true : undefined}>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <Input
            id="reason"
            name="reason"
            autoComplete="off"
            maxLength={255}
            placeholder="e.g. follow-up for asthma, medical clearance…"
            required
            list="reason-options"
            {...describedBy('reason')}
            value={values.reason}
            onChange={(event) => change({ reason: event.target.value })}
          />
          <datalist id="reason-options">
            {APPOINTMENT_REASONS.map((reason) => (
              <option key={reason} value={reason} />
            ))}
          </datalist>
          {errors.reason ? <FieldError id="reason-error">{errors.reason}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            autoComplete="off"
            value={values.notes}
            onChange={(event) => change({ notes: event.target.value })}
          />
        </Field>

        {note ? <FieldDescription>{note}</FieldDescription> : null}

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>The appointment was not saved</AlertTitle>
            <AlertDescription>
              {error instanceof ApiError
                ? error.message
                : 'Something went wrong. Please try again.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isSaving ? savingLabel : submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
