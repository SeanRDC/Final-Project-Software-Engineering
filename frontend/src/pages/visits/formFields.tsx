// Fields the nurse's and the doctor's visit forms have in common.

import type { VisitDisposition } from '@/api/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { DISPOSITIONS } from '@/lib/status'

type TextareaFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  rows?: number
  placeholder?: string
  required?: boolean
}

export function TextareaField({
  id,
  label,
  value,
  onChange,
  error,
  rows = 3,
  placeholder,
  required,
}: TextareaFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        name={id}
        rows={rows}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  )
}

type CheckboxFieldProps = {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={checked} onCheckedChange={(state) => onChange(state === true)} />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
    </Field>
  )
}

type ReferralFieldsProps = {
  referred: boolean
  details: string
  onChange: (change: { referred?: boolean; referral_details?: string }) => void
}

/** "Referred" with a place to say where to, shown only once it is ticked. */
export function ReferralFields({ referred, details, onChange }: ReferralFieldsProps) {
  return (
    <>
      <CheckboxField
        id="referred"
        label="Referred to a hospital or another clinic"
        checked={referred}
        onChange={(next) => onChange({ referred: next })}
      />
      {referred ? (
        <Field>
          <FieldLabel htmlFor="referral-details">Referred to</FieldLabel>
          <Input
            id="referral-details"
            name="referral_details"
            autoComplete="off"
            placeholder="Where the patient was sent, and why…"
            value={details}
            onChange={(event) => onChange({ referral_details: event.target.value })}
          />
        </Field>
      ) : null}
    </>
  )
}

type OutcomeFieldProps = {
  id?: string
  value: VisitDisposition | ''
  onChange: (value: VisitDisposition | '') => void
}

/** How the visit ended. It may be left unset until the visit is completed. */
export function OutcomeField({ id = 'disposition', value, onChange }: OutcomeFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Outcome</FieldLabel>
      <NativeSelect
        id={id}
        name="disposition"
        value={value}
        onChange={(event) => onChange(event.target.value as VisitDisposition | '')}
      >
        <NativeSelectOption value="">Not set</NativeSelectOption>
        {DISPOSITIONS.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  )
}
