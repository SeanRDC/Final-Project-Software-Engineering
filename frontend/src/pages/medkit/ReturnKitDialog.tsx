// Taking a kit back: the checklist of its contents. What came back returns to stock.

import { ListChecksIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { MedkitRequest } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { returnErrors, toReturn } from '@/pages/medkit/kitLines'
import { useReturnKit } from '@/pages/medkit/useMedkits'

function ReturnForm({ request, onClose }: { request: MedkitRequest; onClose: () => void }) {
  const giveBack = useReturnKit(request.id)
  const [counts, setCounts] = useState<Record<number, string>>({})
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<number, string>>({})
  const kit = request.medkit ? `Kit #${request.medkit.kit_number}` : 'The kit'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = returnErrors(request.items, counts)
    setErrors(found)
    const first = request.items.find((item) => found[item.id])
    if (first) {
      document.getElementById(`return-${first.id}`)?.focus()
      return
    }
    giveBack.mutate(toReturn(request.items, counts, notes), {
      onSuccess: () => {
        toast.success(`${kit} is back`, {
          description: 'What came back was returned to the medicine stock.',
        })
        onClose()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Take back kit">
      <FieldGroup className="gap-5">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCounts(
                Object.fromEntries(
                  request.items.map((item) => [item.id, String(item.quantity_issued)]),
                ),
              )
              setErrors({})
            }}
          >
            <ListChecksIcon data-icon="inline-start" />
            Returned complete
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="py-2 pl-3 text-left font-semibold">
                  Medicine or supply
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Issued
                </th>
                <th scope="col" className="w-28 py-2 text-left font-semibold">
                  Returned
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {request.items.map((item) => {
                const typed = (counts[item.id] ?? '').trim()
                const back = /^\d+$/.test(typed) ? Number(typed) : null
                const used =
                  back !== null && back <= item.quantity_issued ? item.quantity_issued - back : null
                return (
                  <tr key={item.id}>
                    <td className="py-2 pt-3.5 pl-3 align-top font-medium">{item.medicine_name}</td>
                    <td className="px-3 py-2 pt-3.5 text-right align-top whitespace-nowrap tabular-nums">
                      {item.quantity_issued} {item.unit}
                    </td>
                    <td className="py-2 align-top">
                      <Input
                        id={`return-${item.id}`}
                        aria-label={`${item.medicine_name} returned`}
                        inputMode="numeric"
                        autoComplete="off"
                        className="h-8"
                        aria-invalid={errors[item.id] ? true : undefined}
                        value={counts[item.id] ?? ''}
                        onChange={(event) => {
                          setCounts({ ...counts, [item.id]: event.target.value })
                          setErrors({})
                        }}
                      />
                      {errors[item.id] ? (
                        <p className="mt-1 text-xs text-danger">{errors[item.id]}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 pt-3.5 text-right align-top whitespace-nowrap text-muted-foreground tabular-nums">
                      {used === null ? '—' : `${used} used`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Field>
          <FieldLabel htmlFor="return-notes">Notes (optional)</FieldLabel>
          <Textarea
            id="return-notes"
            rows={2}
            placeholder="e.g. two patients treated for sprains…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        {giveBack.error ? (
          <p role="alert" className="text-sm text-danger">
            {giveBack.error instanceof ApiError
              ? giveBack.error.message
              : 'The kit could not be taken back. Please try again.'}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={giveBack.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={giveBack.isPending}>
            {giveBack.isPending ? <Spinner data-icon="inline-start" /> : null}
            Return to stock
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

export function ReturnKitDialog({
  request,
  open,
  onOpenChange,
}: {
  request: MedkitRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const kit = request.medkit ? `Kit #${request.medkit.kit_number}` : 'the kit'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Take back {kit}</DialogTitle>
          <DialogDescription>
            Count what came back of each item, 0 for anything used up. It goes back into the
            medicine stock; the rest is recorded as used.
          </DialogDescription>
        </DialogHeader>
        {open ? <ReturnForm request={request} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}
