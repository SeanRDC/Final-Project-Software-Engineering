import { PillIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Medicine, Visit } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { useDispense, useMedicines } from '@/pages/visits/useVisits'

// The most the API accepts in one release.
const MAX_QUANTITY = 1000

type Errors = { medicine?: string; quantity?: string }

function validate(medicine: Medicine | undefined, quantityText: string): Errors {
  const errors: Errors = {}
  if (!medicine) errors.medicine = 'Choose the medicine.'
  const quantity = Number(quantityText.trim())
  if (!quantityText.trim() || !Number.isInteger(quantity) || quantity < 1) {
    errors.quantity = 'Enter a whole number of 1 or more.'
  } else if (quantity > MAX_QUANTITY) {
    errors.quantity = `Enter ${MAX_QUANTITY} or less.`
  } else if (medicine && quantity > medicine.quantity_on_hand) {
    errors.quantity = `Only ${medicine.quantity_on_hand} ${medicine.unit} left in stock.`
  }
  return errors
}

/** Releases a medicine to the patient of this visit. The server deducts it from stock. */
export function ReleaseMedicineForm({ visit }: { visit: Visit }) {
  const medicines = useMedicines(true)
  const dispense = useDispense(visit.id)
  const [medicineId, setMedicineId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [instructions, setInstructions] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const chosen = medicines.data?.find((medicine) => String(medicine.id) === medicineId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(chosen, quantity)
    setErrors(found)
    if (found.medicine) {
      document.getElementById('release-medicine')?.focus()
      return
    }
    if (found.quantity || !chosen) {
      document.getElementById('release-quantity')?.focus()
      return
    }
    const amount = Number(quantity.trim())
    dispense.mutate(
      { medicine_id: chosen.id, quantity: amount, instructions: instructions.trim() || null },
      {
        onSuccess: () => {
          toast.success(`${amount} × ${chosen.display_name} released`, {
            description: `Deducted from stock for ${visit.patient.full_name}.`,
          })
          setMedicineId('')
          setQuantity('1')
          setInstructions('')
        },
      },
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Release medicine"
      className="rounded-md border bg-muted/40 p-3"
    >
      <FieldGroup className="gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
          <Field data-invalid={errors.medicine ? true : undefined}>
            <FieldLabel htmlFor="release-medicine">Medicine</FieldLabel>
            <NativeSelect
              id="release-medicine"
              name="medicine_id"
              className="bg-card"
              disabled={medicines.isPending}
              aria-invalid={errors.medicine ? true : undefined}
              aria-describedby={errors.medicine ? 'release-medicine-error' : undefined}
              value={medicineId}
              onChange={(event) => {
                setMedicineId(event.target.value)
                setErrors({})
              }}
            >
              <NativeSelectOption value="">
                {medicines.isPending ? 'Loading the inventory…' : 'Choose a medicine…'}
              </NativeSelectOption>
              {(medicines.data ?? []).map((medicine) => (
                <NativeSelectOption
                  key={medicine.id}
                  value={medicine.id}
                  disabled={medicine.quantity_on_hand === 0}
                >
                  {medicine.display_name} ({medicine.quantity_on_hand} {medicine.unit} left)
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {errors.medicine ? (
              <FieldError id="release-medicine-error">{errors.medicine}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={errors.quantity ? true : undefined}>
            <FieldLabel htmlFor="release-quantity">Quantity</FieldLabel>
            <Input
              id="release-quantity"
              name="quantity"
              className="bg-card"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={errors.quantity ? true : undefined}
              aria-describedby={errors.quantity ? 'release-quantity-error' : undefined}
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value)
                setErrors({})
              }}
            />
          </Field>
        </div>
        {errors.quantity ? (
          <FieldError id="release-quantity-error">{errors.quantity}</FieldError>
        ) : null}

        <Field>
          <FieldLabel htmlFor="release-instructions">Instructions (optional)</FieldLabel>
          <Input
            id="release-instructions"
            name="instructions"
            className="bg-card"
            maxLength={255}
            autoComplete="off"
            placeholder="e.g. one tablet every 6 hours after meals…"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </Field>

        {medicines.error || dispense.error ? (
          <p role="alert" className="text-sm text-danger">
            {[medicines.error, dispense.error].find((error) => error instanceof ApiError)
              ?.message ?? 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="outline"
          className="self-start bg-card"
          disabled={dispense.isPending}
        >
          {dispense.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PillIcon data-icon="inline-start" />
          )}
          Release medicine
        </Button>
      </FieldGroup>
    </form>
  )
}
