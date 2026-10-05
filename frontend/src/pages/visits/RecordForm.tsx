import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import type { Visit, VisitType } from '@/api/types'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { humanize } from '@/lib/format'
import { VISIT_TYPES } from '@/lib/status'
import { FormActions } from '@/pages/visits/FormActions'
import {
  CheckboxField,
  OutcomeField,
  ReferralFields,
  TextareaField,
} from '@/pages/visits/formFields'
import { useUpdateRecord } from '@/pages/visits/useVisits'
import {
  recordChanges,
  recordValues,
  validateRecord,
  VITALS,
  type FormErrors,
  type RecordValues,
} from '@/pages/visits/visitForm'

type RecordFormProps = {
  visit: Visit
  /** Called when editing ends, saved or not. */
  onDone: () => void
  onDirtyChange: (isDirty: boolean) => void
}

/** The nurse's record of a visit: complaint, vital signs, assessment, treatment and outcome. */
export function RecordForm({ visit, onDone, onDirtyChange }: RecordFormProps) {
  const [values, setValues] = useState<RecordValues>(() => recordValues(visit))
  const [errors, setErrors] = useState<FormErrors<RecordValues>>({})
  const save = useUpdateRecord(visit.id)

  function change(patch: Partial<RecordValues>) {
    const next = { ...values, ...patch }
    setValues(next)
    onDirtyChange(Object.keys(recordChanges(visit, next)).length > 0)
    // Once a field has been flagged, clear the flag as soon as it is corrected.
    if (Object.keys(errors).length > 0) setErrors(validateRecord(next))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateRecord(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }
    const changes = recordChanges(visit, values)
    if (Object.keys(changes).length === 0) {
      onDone()
      return
    }
    save.mutate(changes, {
      onSuccess: () => {
        toast.success(`Record saved for ${visit.patient.full_name}`)
        onDone()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Visit record">
      <FieldGroup>
        <TextareaField
          id="complaint"
          label="Complaint"
          rows={2}
          required
          value={values.complaint}
          error={errors.complaint}
          onChange={(complaint) => change({ complaint })}
        />

        <Field>
          <FieldLabel htmlFor="visit_type">Type of visit</FieldLabel>
          <NativeSelect
            id="visit_type"
            name="visit_type"
            value={values.visit_type}
            onChange={(event) => change({ visit_type: event.target.value as VisitType })}
          >
            {VISIT_TYPES.map((type) => (
              <NativeSelectOption key={type} value={type}>
                {humanize(type)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <FieldSet>
          <FieldLegend>Vital signs</FieldLegend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {VITALS.map((vital) => (
              <Field key={vital.key} data-invalid={errors[vital.key] ? true : undefined}>
                <FieldLabel htmlFor={vital.key}>{vital.label}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id={vital.key}
                    name={vital.key}
                    inputMode={vital.integer ? 'numeric' : 'decimal'}
                    autoComplete="off"
                    aria-invalid={errors[vital.key] ? true : undefined}
                    aria-describedby={errors[vital.key] ? `${vital.key}-error` : undefined}
                    value={values[vital.key]}
                    onChange={(event) => change({ [vital.key]: event.target.value })}
                  />
                  <InputGroupAddon align="inline-end">{vital.unit}</InputGroupAddon>
                </InputGroup>
                {errors[vital.key] ? (
                  <FieldError id={`${vital.key}-error`}>{errors[vital.key]}</FieldError>
                ) : null}
              </Field>
            ))}
          </div>
        </FieldSet>

        <TextareaField
          id="assessment"
          label="Assessment"
          placeholder="What you found on examining the patient…"
          value={values.assessment}
          onChange={(assessment) => change({ assessment })}
        />
        <TextareaField
          id="treatment"
          label="Treatment"
          placeholder="What was done for the patient…"
          value={values.treatment}
          onChange={(treatment) => change({ treatment })}
        />
        <TextareaField
          id="remarks"
          label="Remarks"
          rows={2}
          value={values.remarks}
          onChange={(remarks) => change({ remarks })}
        />

        <CheckboxField
          id="guardian_notified"
          label="The parent or guardian was notified"
          checked={values.guardian_notified}
          onChange={(guardian_notified) => change({ guardian_notified })}
        />
        <ReferralFields
          referred={values.referred}
          details={values.referral_details}
          onChange={change}
        />
        <OutcomeField
          value={values.disposition}
          onChange={(disposition) => change({ disposition })}
        />

        <FormActions error={save.error} isSaving={save.isPending} onCancel={onDone} />
      </FieldGroup>
    </form>
  )
}
