// One box for a blood pressure reading: "120 80" becomes "120/80" as it is typed.

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { tidyBloodPressure } from '@/lib/bloodPressure'
import { cn } from '@/lib/utils'

type BloodPressureInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
  label?: string
  className?: string
  inputClassName?: string
}

export function BloodPressureInput({
  id,
  value,
  onChange,
  error,
  label = 'Blood pressure',
  className,
  inputClassName,
}: BloodPressureInputProps) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup className={cn(inputClassName)}>
        <InputGroupInput
          id={id}
          name={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="120/80"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          onChange={(event) => onChange(tidyBloodPressure(event.target.value))}
        />
        <InputGroupAddon align="inline-end">mmHg</InputGroupAddon>
      </InputGroup>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  )
}
