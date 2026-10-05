import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import type { Visit } from '@/api/types'
import { FieldGroup } from '@/components/ui/field'
import { FormActions } from '@/pages/visits/FormActions'
import { OutcomeField, ReferralFields, TextareaField } from '@/pages/visits/formFields'
import { useUpdateConsultation } from '@/pages/visits/useVisits'
import {
  consultationChanges,
  consultationValues,
  type ConsultationValues,
} from '@/pages/visits/visitForm'

type ConsultationFormProps = {
  visit: Visit
  /** Called when editing ends, saved or not. */
  onDone: () => void
  onDirtyChange: (isDirty: boolean) => void
}

/** The doctor's part of a visit: consultation notes, diagnosis and medication details. */
export function ConsultationForm({ visit, onDone, onDirtyChange }: ConsultationFormProps) {
  const [values, setValues] = useState<ConsultationValues>(() => consultationValues(visit))
  const save = useUpdateConsultation(visit.id)

  function change(patch: Partial<ConsultationValues>) {
    const next = { ...values, ...patch }
    setValues(next)
    onDirtyChange(Object.keys(consultationChanges(visit, next)).length > 0)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const changes = consultationChanges(visit, values)
    if (Object.keys(changes).length === 0) {
      onDone()
      return
    }
    save.mutate(changes, {
      onSuccess: () => {
        toast.success(`Consultation saved for ${visit.patient.full_name}`)
        onDone()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Consultation">
      <FieldGroup>
        <TextareaField
          id="consultation_notes"
          label="Consultation notes"
          rows={5}
          placeholder="History, examination and findings…"
          value={values.consultation_notes}
          onChange={(consultation_notes) => change({ consultation_notes })}
        />
        <TextareaField
          id="diagnosis"
          label="Diagnosis"
          rows={2}
          value={values.diagnosis}
          onChange={(diagnosis) => change({ diagnosis })}
        />
        <TextareaField
          id="medication_details"
          label="Medication details"
          placeholder="Medicines prescribed, dose and how long to take them…"
          value={values.medication_details}
          onChange={(medication_details) => change({ medication_details })}
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
