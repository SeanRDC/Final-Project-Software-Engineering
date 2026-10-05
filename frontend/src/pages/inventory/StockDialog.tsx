import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Medicine } from '@/api/types'
import { Button } from '@/components/ui/button'
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
import { useAdjustStock, useStockIn } from '@/pages/inventory/useInventory'

export type StockAction = 'stock-in' | 'adjust'

type FormProps = {
  medicine: Medicine
  action: StockAction
  onClose: () => void
}

function StockForm({ medicine, action, onClose }: FormProps) {
  const isStockIn = action === 'stock-in'
  const stockIn = useStockIn(medicine.id)
  const adjust = useAdjustStock(medicine.id)
  const [quantity, setQuantity] = useState(isStockIn ? '' : String(medicine.quantity_on_hand))
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ quantity?: string; reason?: string }>({})
  const isSaving = stockIn.isPending || adjust.isPending
  const error = stockIn.error ?? adjust.error

  const amount = Number(quantity.trim())
  const isWhole = quantity.trim() !== '' && Number.isInteger(amount)
  const difference = isWhole ? amount - medicine.quantity_on_hand : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found: typeof errors = {}
    if (isStockIn && (!isWhole || amount < 1)) found.quantity = 'Enter a whole number of 1 or more.'
    if (!isStockIn && (!isWhole || amount < 0))
      found.quantity = 'Enter a whole number of 0 or more.'
    // A count that differs from the records has to be explained; it goes in the stock history.
    if (!isStockIn && !reason.trim()) found.reason = 'Say why the count differs.'
    setErrors(found)
    if (found.quantity) {
      document.getElementById('stock-quantity')?.focus()
      return
    }
    if (found.reason) {
      document.getElementById('stock-reason')?.focus()
      return
    }

    if (isStockIn) {
      stockIn.mutate(
        { quantity: amount, reason },
        {
          onSuccess: (saved) => {
            toast.success(`${amount} ${saved.unit} added to ${saved.display_name}`, {
              description: `${saved.quantity_on_hand} now in stock.`,
            })
            onClose()
          },
        },
      )
    } else {
      adjust.mutate(
        { newQuantity: amount, reason },
        {
          onSuccess: (saved) => {
            toast.success(`${saved.display_name} set to ${saved.quantity_on_hand} ${saved.unit}`)
            onClose()
          },
        },
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isStockIn ? 'Stock in' : 'Adjust count'}>
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          In stock now:{' '}
          <span className="font-medium text-foreground tabular-nums">
            {medicine.quantity_on_hand} {medicine.unit}
          </span>
        </p>

        <Field data-invalid={errors.quantity ? true : undefined}>
          <FieldLabel htmlFor="stock-quantity">
            {isStockIn
              ? `Quantity delivered (${medicine.unit})`
              : `Counted quantity (${medicine.unit})`}
          </FieldLabel>
          <Input
            id="stock-quantity"
            name="quantity"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={errors.quantity ? 'stock-quantity-error' : 'stock-quantity-result'}
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value)
              setErrors({})
            }}
          />
          {errors.quantity ? (
            <FieldError id="stock-quantity-error">{errors.quantity}</FieldError>
          ) : (
            <FieldDescription id="stock-quantity-result">
              {isStockIn
                ? isWhole && amount > 0
                  ? `Stock will be ${medicine.quantity_on_hand + amount} ${medicine.unit}.`
                  : 'Added to the quantity in stock.'
                : difference === null || difference === 0
                  ? 'Enter what was physically counted.'
                  : `${difference > 0 ? '+' : '−'}${Math.abs(difference)} ${medicine.unit} compared with the records.`}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.reason ? true : undefined}>
          <FieldLabel htmlFor="stock-reason">{isStockIn ? 'Note (optional)' : 'Reason'}</FieldLabel>
          <Input
            id="stock-reason"
            name="reason"
            maxLength={255}
            autoComplete="off"
            placeholder={
              isStockIn ? 'e.g. delivery from the supplier…' : 'e.g. expired stock removed…'
            }
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={errors.reason ? 'stock-reason-error' : undefined}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setErrors({})
            }}
          />
          {errors.reason ? <FieldError id="stock-reason-error">{errors.reason}</FieldError> : null}
        </Field>

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
            {isStockIn ? 'Add stock' : 'Save count'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

type StockDialogProps = {
  /** The medicine and what to do with it, or null when the dialog is closed. */
  target: { medicine: Medicine; action: StockAction } | null
  onClose: () => void
}

/** Adds delivered stock, or sets the quantity to a physical count. Both are logged as movements. */
export function StockDialog({ target, onClose }: StockDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target
              ? `${target.action === 'stock-in' ? 'Stock in' : 'Adjust count'} · ${target.medicine.display_name}`
              : 'Stock'}
          </DialogTitle>
          <DialogDescription>
            {target?.action === 'adjust'
              ? 'Use this when a physical count differs from the records.'
              : 'Record stock that was delivered to the clinic.'}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <StockForm
            key={`${target.medicine.id}-${target.action}`}
            medicine={target.medicine}
            action={target.action}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
