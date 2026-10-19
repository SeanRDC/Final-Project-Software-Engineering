// Issuing a kit: which kit, and what goes in it. Every item leaves the medicine stock.

import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { MedkitRequest } from '@/api/types'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useInventory } from '@/pages/inventory/useInventory'
import { issueErrors, linesFromContents, toIssue, type KitLine } from '@/pages/medkit/kitLines'
import { kitName } from '@/pages/medkit/medkitDisplay'
import { useIssueKit, useKitContents, useKits } from '@/pages/medkit/useMedkits'

type IssueFormProps = {
  request: MedkitRequest
  initialLines: KitLine[]
  onClose: () => void
}

function IssueForm({ request, initialLines, onClose }: IssueFormProps) {
  const kits = useKits()
  const medicines = useInventory({ q: '', lowStockOnly: false, includeInactive: false })
  const issue = useIssueKit(request.id)
  const available = (kits.data ?? []).filter((kit) => kit.is_active && kit.status === 'available')
  const [kitId, setKitId] = useState('')
  const [lines, setLines] = useState(initialLines)
  const [extraId, setExtraId] = useState('')
  const [errors, setErrors] = useState<{ lines: Record<number, string>; form?: string }>({
    lines: {},
  })
  const [kitError, setKitError] = useState<string>()

  const chosenKit = kitId || (available[0] ? String(available[0].id) : '')
  const others = (medicines.data ?? []).filter(
    (medicine) => !lines.some((line) => line.medicine_id === medicine.id),
  )

  function changeLine(medicineId: number, patch: Partial<KitLine>) {
    setLines(lines.map((line) => (line.medicine_id === medicineId ? { ...line, ...patch } : line)))
    setErrors({ lines: {} })
  }

  function addOther() {
    const medicine = others.find((item) => String(item.id) === extraId)
    if (!medicine) return
    setLines([
      ...lines,
      {
        medicine_id: medicine.id,
        name: medicine.display_name,
        unit: medicine.unit,
        on_hand: medicine.quantity_on_hand,
        quantity: '1',
        included: true,
      },
    ])
    setExtraId('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = issueErrors(lines)
    setErrors(found)
    setKitError(chosenKit ? undefined : 'No kit is available. Take one back first.')
    if (!chosenKit || found.form || Object.keys(found.lines).length > 0) return
    issue.mutate(toIssue(Number(chosenKit), lines), {
      onSuccess: (saved) => {
        toast.success(`Kit #${saved.medkit?.kit_number} issued for ${saved.activity}`, {
          description: 'Its contents were taken out of the medicine stock.',
        })
        onClose()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Issue kit">
      <FieldGroup className="gap-5">
        <Field data-invalid={kitError ? true : undefined}>
          <FieldLabel htmlFor="issue-kit">Kit</FieldLabel>
          {kits.isPending ? (
            <Skeleton className="h-9" />
          ) : (
            <NativeSelect
              id="issue-kit"
              value={chosenKit}
              onChange={(event) => setKitId(event.target.value)}
            >
              {available.length === 0 ? (
                <NativeSelectOption value="">No kit is available</NativeSelectOption>
              ) : null}
              {available.map((kit) => (
                <NativeSelectOption key={kit.id} value={String(kit.id)}>
                  {kitName(kit)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          {kitError ? <p className="text-sm text-danger">{kitError}</p> : null}
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">What goes in the kit</legend>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="w-10 py-2 pl-3 text-left font-semibold">
                    <span className="sr-only">In the kit</span>
                  </th>
                  <th scope="col" className="py-2 text-left font-semibold">
                    Medicine or supply
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    On hand
                  </th>
                  <th scope="col" className="w-28 py-2 pr-3 text-left font-semibold">
                    Quantity
                  </th>
                  <th scope="col" className="w-10">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line) => {
                  const error = errors.lines[line.medicine_id]
                  const isExtra = !initialLines.some(
                    (item) => item.medicine_id === line.medicine_id,
                  )
                  return (
                    <tr key={line.medicine_id} className={cn(!line.included && 'opacity-60')}>
                      <td className="py-2 pl-3 align-top">
                        <Checkbox
                          className="mt-2"
                          aria-label={`Put ${line.name} in the kit`}
                          checked={line.included}
                          onCheckedChange={(state) =>
                            changeLine(line.medicine_id, { included: state === true })
                          }
                        />
                      </td>
                      <td className="py-2 pt-3.5 align-top font-medium">{line.name}</td>
                      <td className="px-3 py-2 pt-3.5 text-right align-top whitespace-nowrap text-muted-foreground tabular-nums">
                        {line.on_hand} {line.unit}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <Input
                          aria-label={`Quantity of ${line.name}`}
                          inputMode="numeric"
                          autoComplete="off"
                          className="h-8"
                          disabled={!line.included}
                          aria-invalid={error ? true : undefined}
                          value={line.quantity}
                          onChange={(event) =>
                            changeLine(line.medicine_id, { quantity: event.target.value })
                          }
                        />
                        {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
                      </td>
                      <td className="py-2 pr-2 align-top">
                        {isExtra ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Remove ${line.name}`}
                            onClick={() =>
                              setLines(
                                lines.filter((item) => item.medicine_id !== line.medicine_id),
                              )
                            }
                          >
                            <Trash2Icon />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {errors.form ? <p className="text-sm text-danger">{errors.form}</p> : null}
        </fieldset>

        <div className="flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="issue-other">Other item</FieldLabel>
            <NativeSelect
              id="issue-other"
              value={extraId}
              onChange={(event) => setExtraId(event.target.value)}
            >
              <NativeSelectOption value="">Choose from the inventory…</NativeSelectOption>
              {others.map((medicine) => (
                <NativeSelectOption key={medicine.id} value={String(medicine.id)}>
                  {medicine.display_name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              Not in the inventory? Add it on the Inventory page first.
            </FieldDescription>
          </Field>
          <Button
            type="button"
            variant="outline"
            className="mb-6"
            disabled={!extraId}
            onClick={addOther}
          >
            <PlusIcon data-icon="inline-start" />
            Add item
          </Button>
        </div>

        {issue.error ? (
          <p role="alert" className="text-sm text-danger">
            {issue.error instanceof ApiError
              ? issue.error.message
              : 'The kit could not be issued. Please try again.'}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={issue.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={issue.isPending}>
            {issue.isPending ? <Spinner data-icon="inline-start" /> : null}
            Issue kit
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

export function IssueKitDialog({
  request,
  open,
  onOpenChange,
}: {
  request: MedkitRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const contents = useKitContents()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue a medical kit</DialogTitle>
          <DialogDescription>
            For {request.activity}. Untick what is not going in the kit and change any quantity;
            everything issued is taken out of the medicine stock.
          </DialogDescription>
        </DialogHeader>
        {contents.isPending ? (
          <div role="status" aria-label="Loading the kit contents">
            <Skeleton className="h-40" />
          </div>
        ) : (
          <IssueForm
            request={request}
            initialLines={linesFromContents(contents.data ?? [])}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
