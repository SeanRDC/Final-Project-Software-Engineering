import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Medicine, MedicineCreate, MedicineUpdate } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAddMedicine, useUpdateMedicine } from '@/pages/inventory/useInventory'

type Values = {
  name: string
  strength: string
  form: string
  unit: string
  low_stock_threshold: string
  expiry_date: string
  /** Opening stock, when adding a medicine. */
  quantity_on_hand: string
  is_active: boolean
}

type Errors = Partial<Record<keyof Values, string>>

function startValues(medicine: Medicine | null): Values {
  return {
    name: medicine?.name ?? '',
    strength: medicine?.strength ?? '',
    form: medicine?.form ?? '',
    unit: medicine?.unit ?? 'tablet',
    low_stock_threshold: String(medicine?.low_stock_threshold ?? 20),
    expiry_date: medicine?.expiry_date ?? '',
    quantity_on_hand: '0',
    is_active: medicine?.is_active ?? true,
  }
}

function wholeNumber(text: string): number | null {
  const value = Number(text.trim())
  return text.trim() !== '' && Number.isInteger(value) && value >= 0 ? value : null
}

function validate(values: Values, isNew: boolean): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = 'Enter the medicine’s name.'
  if (!values.unit.trim()) errors.unit = 'Enter the unit it is counted in.'
  if (wholeNumber(values.low_stock_threshold) === null) {
    errors.low_stock_threshold = 'Enter a whole number of 0 or more.'
  }
  if (isNew && wholeNumber(values.quantity_on_hand) === null) {
    errors.quantity_on_hand = 'Enter a whole number of 0 or more.'
  }
  return errors
}

type FormProps = {
  /** The medicine to edit, or null to add a new one. */
  medicine: Medicine | null
  onClose: () => void
}

function MedicineForm({ medicine, onClose }: FormProps) {
  const isNew = medicine === null
  const add = useAddMedicine()
  const update = useUpdateMedicine(medicine?.id ?? 0)
  const [values, setValues] = useState(() => startValues(medicine))
  const [errors, setErrors] = useState<Errors>({})
  const isSaving = add.isPending || update.isPending
  const error = add.error ?? update.error

  function change(patch: Partial<Values>) {
    const next = { ...values, ...patch }
    setValues(next)
    if (Object.keys(errors).length > 0) setErrors(validate(next, isNew))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values, isNew)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`medicine-${firstInvalid}`)?.focus()
      return
    }
    const shared = {
      name: values.name.trim(),
      strength: values.strength.trim(),
      form: values.form.trim() || null,
      unit: values.unit.trim(),
      low_stock_threshold: Number(values.low_stock_threshold),
      expiry_date: values.expiry_date || null,
    }
    if (isNew) {
      const request: MedicineCreate = {
        ...shared,
        quantity_on_hand: Number(values.quantity_on_hand),
      }
      add.mutate(request, {
        onSuccess: (saved) => {
          toast.success(`${saved.display_name} added to the inventory`)
          onClose()
        },
      })
    } else {
      const changes: MedicineUpdate = { ...shared, is_active: values.is_active }
      update.mutate(changes, {
        onSuccess: (saved) => {
          toast.success(`${saved.display_name} updated`)
          onClose()
        },
      })
    }
  }

  function field(
    name: 'name' | 'strength' | 'form' | 'unit' | 'low_stock_threshold' | 'quantity_on_hand',
    label: string,
    options: { placeholder?: string; inputMode?: 'numeric'; required?: boolean } = {},
  ) {
    const id = `medicine-${name}`
    return (
      <Field data-invalid={errors[name] ? true : undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          name={name}
          autoComplete="off"
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `${id}-error` : undefined}
          value={values[name]}
          onChange={(event) => change({ [name]: event.target.value })}
          {...options}
        />
        {errors[name] ? <FieldError id={`${id}-error`}>{errors[name]}</FieldError> : null}
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isNew ? 'Add medicine' : 'Edit medicine'}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('name', 'Name', { placeholder: 'e.g. Paracetamol…', required: true })}
          {field('strength', 'Strength', { placeholder: 'e.g. 500 mg…' })}
          {field('form', 'Form', { placeholder: 'e.g. tablet, syrup…' })}
          {field('unit', 'Counted in', { placeholder: 'e.g. tablet, bottle…', required: true })}
          {field('low_stock_threshold', 'Low-stock threshold', { inputMode: 'numeric' })}
          <Field>
            <FieldLabel htmlFor="medicine-expiry_date">Expiry date</FieldLabel>
            <Input
              id="medicine-expiry_date"
              name="expiry_date"
              type="date"
              value={values.expiry_date}
              onChange={(event) => change({ expiry_date: event.target.value })}
            />
          </Field>
          {isNew ? field('quantity_on_hand', 'Opening stock', { inputMode: 'numeric' }) : null}
        </div>

        {isNew ? null : (
          <>
            <Field orientation="horizontal">
              <Checkbox
                id="medicine-is_active"
                checked={values.is_active}
                onCheckedChange={(state) => change({ is_active: state === true })}
              />
              <FieldLabel htmlFor="medicine-is_active" className="font-normal">
                In use (can be released to patients)
              </FieldLabel>
            </Field>
            <FieldDescription>
              To change the quantity, use Stock in or Adjust count, so the stock history stays
              complete.
            </FieldDescription>
          </>
        )}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isNew ? 'Add medicine' : 'Save changes'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

type MedicineDialogProps = FormProps & { open: boolean }

/** Adds a medicine to the inventory or edits one's details. */
export function MedicineDialog({ open, medicine, onClose }: MedicineDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{medicine ? `Edit ${medicine.display_name}` : 'Add a medicine'}</DialogTitle>
          <DialogDescription>
            {medicine
              ? 'Change the details or the low-stock threshold.'
              : 'A medicine is listed once per strength, e.g. Paracetamol 500 mg.'}
          </DialogDescription>
        </DialogHeader>
        {/* Remounted per medicine so the fields start from that medicine's values. */}
        {open ? (
          <MedicineForm key={medicine?.id ?? 'new'} medicine={medicine} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
