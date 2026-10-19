// The request for a medical kit, laid out as the clinic's form FM-SSA-MDS-8032.

import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { MedkitRequestCreate } from '@/api/types'
import { FormCodeBox } from '@/components/FormCodeBox'
import { SectionCard } from '@/components/SectionCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { capitalizeWords } from '@/lib/capitalize'
import { toDayString } from '@/lib/format'
import { MEDKIT_REQUEST_FORM } from '@/lib/formCodes'
import { useCreateMedkitRequest } from '@/pages/medkit/useMedkits'

type Values = {
  organization: string
  activity: string
  activity_date: string
  venue: string
  person_responsible: string
  contact_number: string
  requested_by: string
  request_date: string
  notes: string
}
type Errors = Partial<Record<keyof Values, string>>

const REQUIRED: Partial<Record<keyof Values, string>> = {
  organization: 'Enter the organization or department.',
  activity: 'Enter the name of the activity.',
  activity_date: 'Enter the date of the activity.',
  person_responsible: 'Enter who is responsible for the kit.',
  requested_by: 'Enter who asked for the kit.',
  request_date: 'Enter the date of the request.',
}

/** The names of people get their capital letters when the box is left. */
const NAMES: (keyof Values)[] = ['person_responsible', 'requested_by']

function validate(values: Values): Errors {
  const errors: Errors = {}
  for (const [name, message] of Object.entries(REQUIRED) as [keyof Values, string][]) {
    if (!values[name].trim()) errors[name] = message
  }
  return errors
}

function toRequest(values: Values): MedkitRequestCreate {
  const text = (value: string) => value.trim() || null
  return {
    organization: values.organization.trim(),
    activity: values.activity.trim(),
    activity_date: values.activity_date,
    venue: text(values.venue),
    person_responsible: values.person_responsible.trim(),
    contact_number: text(values.contact_number),
    requested_by: values.requested_by.trim(),
    request_date: values.request_date,
    notes: text(values.notes),
  }
}

export function NewMedkitRequestPage() {
  const navigate = useNavigate()
  const create = useCreateMedkitRequest()
  const [values, setValues] = useState<Values>(() => ({
    organization: '',
    activity: '',
    activity_date: '',
    venue: '',
    person_responsible: '',
    contact_number: '',
    requested_by: '',
    request_date: toDayString(new Date()),
    notes: '',
  }))
  const [errors, setErrors] = useState<Errors>({})

  function change(patch: Partial<Values>) {
    const next = { ...values, ...patch }
    setValues(next)
    if (Object.keys(errors).length > 0) setErrors(validate(next))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`kit-${firstInvalid}`)?.focus()
      return
    }
    create.mutate(toRequest(values), {
      onSuccess: (request) => {
        toast.success(`Kit requested for ${request.activity}`, {
          description: 'Issue a kit from the request when it is collected.',
        })
        void navigate(`/medkit/requests/${request.id}`)
      },
    })
  }

  function field(
    name: keyof Values,
    label: string,
    options: { type?: string; inputMode?: 'tel'; wide?: boolean } = {},
  ) {
    const id = `kit-${name}`
    return (
      <Field
        data-invalid={errors[name] ? true : undefined}
        className={options.wide ? 'sm:col-span-2' : undefined}
      >
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          name={name}
          type={options.type}
          inputMode={options.inputMode}
          autoComplete="off"
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `${id}-error` : undefined}
          value={values[name]}
          onChange={(event) => change({ [name]: event.target.value })}
          onBlur={() => {
            if (NAMES.includes(name) && capitalizeWords(values[name]) !== values[name]) {
              change({ [name]: capitalizeWords(values[name]) })
            }
          }}
        />
        {errors[name] ? <FieldError id={`${id}-error`}>{errors[name]}</FieldError> : null}
      </Field>
    )
  }

  return (
    <SectionCard title="Request for medical kit" className="mx-auto max-w-3xl">
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Request for medical kit"
        className="p-4 md:p-6"
      >
        <FieldGroup className="gap-6">
          <FormCodeBox code={MEDKIT_REQUEST_FORM} className="self-end" />
          <div className="grid gap-4 sm:grid-cols-2">
            {field('organization', 'Organization / department', { wide: true })}
            {field('activity', 'Name of activity', { wide: true })}
            {field('activity_date', 'Date of activity', { type: 'date' })}
            {field('venue', 'Venue')}
            {field('person_responsible', 'Person responsible')}
            {field('contact_number', 'Contact number', { type: 'tel', inputMode: 'tel' })}
            {field('requested_by', 'Requested by')}
            {field('request_date', 'Date requested', { type: 'date' })}
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="kit-notes">Notes (optional)</FieldLabel>
              <Textarea
                id="kit-notes"
                name="notes"
                rows={2}
                value={values.notes}
                onChange={(event) => change({ notes: event.target.value })}
              />
            </Field>
          </div>

          <ol className="list-decimal rounded-md border bg-muted/40 py-3 pr-4 pl-9 text-sm text-muted-foreground">
            <li>
              The medical kit is to be returned <strong>immediately</strong> after the day of the
              activity.
            </li>
            <li>
              In case of <strong>loss</strong>, the medical kit and its contents are replaced by the
              person responsible.
            </li>
          </ol>

          {create.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>The request could not be filed</AlertTitle>
              <AlertDescription>
                {create.error instanceof ApiError ? create.error.message : 'Please try again.'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => void navigate('/medkit')}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Spinner data-icon="inline-start" /> : null}
              File request
            </Button>
          </div>
        </FieldGroup>
      </form>
    </SectionCard>
  )
}
