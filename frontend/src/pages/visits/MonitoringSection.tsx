// Vital signs taken again while a patient is kept for monitoring, e.g. resting in a ward.

import { ActivityIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Visit, VitalReading, VitalReadingCreate } from '@/api/types'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { formatTimeOfDay } from '@/lib/format'
import { useAddVitalReading, useRemoveVitalReading } from '@/pages/visits/useVisits'
import { vitalError, VITALS } from '@/pages/visits/visitForm'

type ReadingKey = Exclude<keyof VitalReadingCreate, 'note'>

// Weight and height do not change while a patient rests, so a reading leaves them out.
const READING_FIELDS = VITALS.filter(
  (field) => field.key !== 'weight_kg' && field.key !== 'height_cm',
) as ((typeof VITALS)[number] & { key: ReadingKey })[]

type Values = Record<ReadingKey, string>
type Errors = Partial<Record<ReadingKey | 'form', string>>

const EMPTY: Values = {
  temperature_c: '',
  bp_systolic: '',
  bp_diastolic: '',
  pulse_rate: '',
  respiratory_rate: '',
  oxygen_saturation: '',
}

function validate(values: Values): Errors {
  const errors: Errors = {}
  for (const field of READING_FIELDS) {
    const error = vitalError(field, values[field.key])
    if (error) errors[field.key] = error
  }
  const systolic = values.bp_systolic.trim()
  const diastolic = values.bp_diastolic.trim()
  if (systolic && !diastolic) errors.bp_diastolic ??= 'Enter the diastolic value too.'
  if (diastolic && !systolic) errors.bp_systolic ??= 'Enter the systolic value too.'
  if (Object.values(values).every((value) => !value.trim())) {
    errors.form = 'Enter at least one vital sign.'
  }
  return errors
}

/** "38.6 °C · 110/70 mmHg · 104 bpm" */
function describeReading(reading: VitalReading): string {
  const parts = [
    reading.temperature_c === null ? null : `${reading.temperature_c} °C`,
    reading.bp_systolic === null || reading.bp_diastolic === null
      ? null
      : `${reading.bp_systolic}/${reading.bp_diastolic} mmHg`,
    reading.pulse_rate === null ? null : `${reading.pulse_rate} bpm`,
    reading.respiratory_rate === null ? null : `${reading.respiratory_rate} /min`,
    reading.oxygen_saturation === null ? null : `${reading.oxygen_saturation}% SpO₂`,
  ]
  return parts.filter((part) => part !== null).join(' · ')
}

function AddReadingForm({ visit, onClose }: { visit: Visit; onClose: () => void }) {
  const add = useAddVitalReading(visit.id)
  const [values, setValues] = useState<Values>(EMPTY)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      const target = firstInvalid === 'form' ? READING_FIELDS[0]!.key : firstInvalid
      document.getElementById(`reading-${target}`)?.focus()
      return
    }
    const reading: VitalReadingCreate = { note: note.trim() || null }
    for (const field of READING_FIELDS) {
      const raw = values[field.key].trim()
      if (raw) reading[field.key] = Number(raw)
    }
    add.mutate(reading, {
      onSuccess: () => {
        toast.success(`Reading added for ${visit.patient.full_name}`)
        onClose()
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Add reading"
      className="rounded-md border bg-muted/40 p-3"
    >
      <FieldGroup className="gap-3">
        <div className="grid grid-cols-2 gap-3">
          {READING_FIELDS.map((field) => (
            <Field key={field.key} data-invalid={errors[field.key] ? true : undefined}>
              <FieldLabel htmlFor={`reading-${field.key}`}>{field.label}</FieldLabel>
              <InputGroup className="bg-card">
                <InputGroupInput
                  id={`reading-${field.key}`}
                  name={field.key}
                  inputMode={field.integer ? 'numeric' : 'decimal'}
                  autoComplete="off"
                  aria-invalid={errors[field.key] ? true : undefined}
                  aria-describedby={errors[field.key] ? `reading-${field.key}-error` : undefined}
                  value={values[field.key]}
                  onChange={(event) => {
                    setValues({ ...values, [field.key]: event.target.value })
                    setErrors({})
                  }}
                />
                <InputGroupAddon align="inline-end">{field.unit}</InputGroupAddon>
              </InputGroup>
              {errors[field.key] ? (
                <FieldError id={`reading-${field.key}-error`}>{errors[field.key]}</FieldError>
              ) : null}
            </Field>
          ))}
        </div>

        <Field>
          <FieldLabel htmlFor="reading-note">Note (optional)</FieldLabel>
          <Input
            id="reading-note"
            name="note"
            className="bg-card"
            maxLength={255}
            autoComplete="off"
            placeholder="e.g. resting, feels better…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        {errors.form || add.error ? (
          <p role="alert" className="text-sm text-danger">
            {errors.form ??
              (add.error instanceof ApiError
                ? add.error.message
                : 'Something went wrong. Please try again.')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" className="bg-card" disabled={add.isPending}>
            {add.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save reading
          </Button>
          <Button type="button" variant="ghost" disabled={add.isPending} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

type MonitoringSectionProps = {
  visit: Visit
  /** Show the means to add a reading and to remove one recorded by mistake. */
  canRecord: boolean
}

/** The readings taken during a visit, oldest first, with the means to add another. */
export function MonitoringSection({ visit, canRecord }: MonitoringSectionProps) {
  const remove = useRemoveVitalReading(visit.id)
  const [isAdding, setIsAdding] = useState(false)
  const [toRemove, setToRemove] = useState<VitalReading | null>(null)

  function closeDialog() {
    setToRemove(null)
    remove.reset()
  }

  return (
    <div className="flex flex-col gap-3">
      {visit.vital_readings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No readings after the first vital signs.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {visit.vital_readings.map((reading) => (
            <li key={reading.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[15px] font-medium tabular-nums">{describeReading(reading)}</p>
                {reading.note ? (
                  <p className="text-sm text-muted-foreground">{reading.note}</p>
                ) : null}
                <p className="text-[13px] text-muted-foreground">
                  {formatTimeOfDay(reading.taken_at)}
                  {reading.recorded_by_name ? ` · ${reading.recorded_by_name}` : ''}
                </p>
              </div>
              {canRecord ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  aria-label={`Remove the reading taken at ${formatTimeOfDay(reading.taken_at)}`}
                  onClick={() => setToRemove(reading)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canRecord && isAdding ? (
        <AddReadingForm visit={visit} onClose={() => setIsAdding(false)} />
      ) : null}
      {canRecord && !isAdding ? (
        <Button variant="outline" className="self-start" onClick={() => setIsAdding(true)}>
          <ActivityIcon data-icon="inline-start" />
          Add reading
        </Button>
      ) : null}

      <AlertDialog open={toRemove !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this reading?</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove
                ? `The reading taken at ${formatTimeOfDay(toRemove.taken_at)} (${describeReading(toRemove)}) will be removed from the visit. Use this only when it was recorded by mistake.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error ? (
            <p role="alert" className="text-sm text-danger">
              {remove.error instanceof ApiError
                ? remove.error.message
                : 'The reading could not be removed. Please try again.'}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Keep it</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                toRemove &&
                remove.mutate(toRemove.id, {
                  onSuccess: () => {
                    toast.success('Reading removed')
                    closeDialog()
                  },
                })
              }
            >
              {remove.isPending ? <Spinner data-icon="inline-start" /> : null}
              Remove reading
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
