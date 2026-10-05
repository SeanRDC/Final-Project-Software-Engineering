import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { ApiError } from '@/api/client'
import type { PatientType, Sex } from '@/api/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { toDayString } from '@/lib/format'
import {
  BLOOD_TYPES,
  validatePatient,
  type PatientErrors,
  type PatientValues,
} from '@/pages/patients/patientValues'
import { useDepartments } from '@/pages/patients/usePatients'

type TextKey = {
  [Key in keyof PatientValues]: PatientValues[Key] extends string ? Key : never
}[keyof PatientValues]

type PatientFormProps = {
  /** What the form starts with: blanks to register, the saved record to correct. */
  initialValues: PatientValues
  submitLabel: string
  savingLabel: string
  isSaving: boolean
  /** The error of the last save attempt, if it failed. */
  error: unknown
  /** Called with valid values only. */
  onSubmit: (values: PatientValues) => void
  onCancel: () => void
  onDirtyChange?: (isDirty: boolean) => void
}

/** The patient record form, shared by registering a patient and correcting a record. */
export function PatientForm({
  initialValues,
  submitLabel,
  savingLabel,
  isSaving,
  error,
  onSubmit,
  onCancel,
  onDirtyChange,
}: PatientFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<PatientErrors>({})
  const departments = useDepartments()
  const [today] = useState(() => toDayString(new Date()))
  const isStudent = values.patient_type === 'student'

  function change(patch: Partial<PatientValues>) {
    const next = { ...values, ...patch }
    setValues(next)
    onDirtyChange?.(JSON.stringify(next) !== JSON.stringify(initialValues))
    // Once a field has been flagged, clear the flag as soon as it is corrected.
    if (Object.keys(errors).length > 0) setErrors(validatePatient(next))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validatePatient(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }
    onSubmit(values)
  }

  /** A single-line text field bound to one of the form's text values. */
  function text(
    name: TextKey,
    label: string,
    options: {
      type?: string
      autoComplete?: string
      inputMode?: 'tel' | 'email'
      required?: boolean
      description?: ReactNode
      list?: string
      spellCheck?: boolean
      max?: string
    } = {},
  ) {
    const { description, ...inputProps } = options
    return (
      <Field data-invalid={errors[name] ? true : undefined}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <Input
          id={name}
          name={name}
          autoComplete="off"
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          value={values[name]}
          onChange={(event) => change({ [name]: event.target.value })}
          {...inputProps}
        />
        {description ? <FieldDescription>{description}</FieldDescription> : null}
        {errors[name] ? <FieldError id={`${name}-error`}>{errors[name]}</FieldError> : null}
      </Field>
    )
  }

  function area(name: TextKey, label: string, placeholder?: string) {
    return (
      <Field>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <Textarea
          id={name}
          name={name}
          rows={2}
          autoComplete="off"
          placeholder={placeholder}
          value={values[name]}
          onChange={(event) => change({ [name]: event.target.value })}
        />
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Patient record">
      <FieldGroup className="gap-8">
        <FieldSet>
          <FieldLegend>Identity</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="patient_type">Patient type</FieldLabel>
              <NativeSelect
                id="patient_type"
                name="patient_type"
                value={values.patient_type}
                onChange={(event) => change({ patient_type: event.target.value as PatientType })}
              >
                <NativeSelectOption value="student">Student</NativeSelectOption>
                <NativeSelectOption value="employee">Employee</NativeSelectOption>
              </NativeSelect>
            </Field>
            {text('id_number', isStudent ? 'Student number' : 'Employee number', {
              required: true,
              spellCheck: false,
            })}
            {text('last_name', 'Last name', { required: true })}
            {text('first_name', 'First name', { required: true })}
            {text('middle_name', 'Middle name')}
            {text('birth_date', 'Birth date', {
              type: 'date',
              max: today,
            })}
            <Field>
              <FieldLabel htmlFor="sex">Sex</FieldLabel>
              <NativeSelect
                id="sex"
                name="sex"
                value={values.sex}
                onChange={(event) => change({ sex: event.target.value as Sex | '' })}
              >
                <NativeSelectOption value="">Not recorded</NativeSelectOption>
                <NativeSelectOption value="female">Female</NativeSelectOption>
                <NativeSelectOption value="male">Male</NativeSelectOption>
              </NativeSelect>
            </Field>
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend>{isStudent ? 'School details' : 'Work details'}</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('department', isStudent ? 'School or department' : 'Department or office', {
              list: 'department-options',
            })}
            <datalist id="department-options">
              {(departments.data ?? []).map((department) => (
                <option key={department} value={department} />
              ))}
            </datalist>
            {text('program_or_position', isStudent ? 'Program and year' : 'Position')}
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Contact</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('contact_number', 'Contact number', { type: 'tel', inputMode: 'tel' })}
            {text('email', 'Email', { type: 'email', inputMode: 'email', spellCheck: false })}
            <div className="sm:col-span-2">{text('address', 'Address')}</div>
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Parent or guardian</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('guardian_name', 'Name')}
            {text('guardian_relationship', 'Relationship to the patient')}
            {text('guardian_contact', 'Contact number', { type: 'tel', inputMode: 'tel' })}
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend>Medical information</FieldLegend>
          <FieldDescription>
            Allergies, conditions and restrictions are shown as alerts on every visit.
          </FieldDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="blood_type">Blood type</FieldLabel>
              <NativeSelect
                id="blood_type"
                name="blood_type"
                value={values.blood_type}
                onChange={(event) => change({ blood_type: event.target.value })}
              >
                <NativeSelectOption value="">Not known</NativeSelectOption>
                {BLOOD_TYPES.map((type) => (
                  <NativeSelectOption key={type} value={type}>
                    {type}
                  </NativeSelectOption>
                ))}
                {/* Keep a value saved before this list existed. */}
                {values.blood_type &&
                !(BLOOD_TYPES as readonly string[]).includes(values.blood_type) ? (
                  <NativeSelectOption value={values.blood_type}>
                    {values.blood_type}
                  </NativeSelectOption>
                ) : null}
              </NativeSelect>
            </Field>
            <div className="max-sm:hidden" />
            {area('allergies', 'Allergies', 'Medicines, food or anything else…')}
            {area('medical_conditions', 'Medical conditions', 'e.g. asthma, diabetes…')}
            {area('medication_restrictions', 'Medication restrictions')}
            {area('activity_restrictions', 'Activity restrictions')}
            <div className="sm:col-span-2">{area('notes', 'Other notes')}</div>
          </div>
        </FieldSet>

        <Field orientation="horizontal">
          <Checkbox
            id="consent_on_file"
            checked={values.consent_on_file}
            onCheckedChange={(state) => change({ consent_on_file: state === true })}
          />
          <FieldLabel htmlFor="consent_on_file" className="font-normal">
            The signed data privacy consent form is on file
          </FieldLabel>
        </Field>

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>The record was not saved</AlertTitle>
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
