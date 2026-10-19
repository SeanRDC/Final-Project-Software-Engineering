// What a medical kit normally carries: the lines filled in when a kit is issued. The coordinator keeps it.

import { ArrowDownIcon, ArrowUpIcon, CircleAlertIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { KitContentsLine } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useInventory } from '@/pages/inventory/useInventory'
import { useKitContents, useSaveKitContents } from '@/pages/medkit/useMedkits'

type Line = KitContentsLine & { quantity: string }

const HEAD_CLASS = 'py-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

function ReadOnlyContents({ lines }: { lines: KitContentsLine[] }) {
  return (
    <table className="w-full text-[15px]">
      <thead className="bg-muted/60">
        <tr>
          <th scope="col" className={cn(HEAD_CLASS, 'pl-4 text-left')}>
            Medicine or supply
          </th>
          <th scope="col" className={cn(HEAD_CLASS, 'px-4 text-right')}>
            In a kit
          </th>
          <th scope="col" className={cn(HEAD_CLASS, 'pr-4 text-right')}>
            On hand
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {lines.map((line) => (
          <tr key={line.medicine_id}>
            <th scope="row" className="py-2.5 pl-4 text-left font-normal">
              {line.medicine_name}
            </th>
            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
              {line.default_quantity} {line.unit}
            </td>
            <td
              className={cn(
                'py-2.5 pr-4 text-right tabular-nums',
                line.quantity_on_hand < line.default_quantity && 'font-medium text-danger',
              )}
            >
              {line.quantity_on_hand}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ContentsEditor({ saved }: { saved: KitContentsLine[] }) {
  const medicines = useInventory({ q: '', lowStockOnly: false, includeInactive: false })
  const save = useSaveKitContents()
  const [lines, setLines] = useState<Line[]>(() =>
    saved.map((line) => ({ ...line, quantity: String(line.default_quantity) })),
  )
  const [toAdd, setToAdd] = useState('')
  const [errors, setErrors] = useState<Record<number, string>>({})
  // What is on hand changes while editing; always show the latest figure.
  const onHand = new Map(saved.map((line) => [line.medicine_id, line.quantity_on_hand]))
  const addable = (medicines.data ?? []).filter(
    (medicine) => !lines.some((line) => line.medicine_id === medicine.id),
  )

  function move(index: number, by: -1 | 1) {
    const next = [...lines]
    const [line] = next.splice(index, 1)
    next.splice(index + by, 0, line!)
    setLines(next)
  }

  function add() {
    const medicine = addable.find((item) => String(item.id) === toAdd)
    if (!medicine) return
    setLines([
      ...lines,
      {
        medicine_id: medicine.id,
        medicine_name: medicine.display_name,
        unit: medicine.unit,
        default_quantity: 10,
        quantity_on_hand: medicine.quantity_on_hand,
        quantity: '10',
      },
    ])
    setToAdd('')
  }

  function submit() {
    const found: Record<number, string> = {}
    for (const line of lines) {
      if (!/^\d+$/.test(line.quantity.trim()) || Number(line.quantity) < 1) {
        found[line.medicine_id] = 'Enter 1 or more.'
      }
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return
    save.mutate(
      lines.map((line) => ({
        medicine_id: line.medicine_id,
        default_quantity: Number(line.quantity),
      })),
      { onSuccess: () => toast.success('Kit contents saved') },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Standard kit contents"
        className="overflow-hidden rounded-lg border bg-card"
      >
        {lines.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No lines yet. Add the medicines boxed on the dispensary form below.
          </p>
        ) : (
          <table className="w-full text-[15px]">
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className={cn(HEAD_CLASS, 'pl-4 text-left')}>
                  Medicine or supply
                </th>
                <th scope="col" className={cn(HEAD_CLASS, 'w-32 px-3 text-left')}>
                  In a kit
                </th>
                <th scope="col" className={cn(HEAD_CLASS, 'px-3 text-right')}>
                  On hand
                </th>
                <th scope="col" className="w-32 pr-3">
                  <span className="sr-only">Order and remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line, index) => (
                <tr key={line.medicine_id}>
                  <th scope="row" className="py-2 pt-3.5 pl-4 text-left align-top font-normal">
                    {line.medicine_name}
                  </th>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`How many ${line.medicine_name}`}
                        inputMode="numeric"
                        autoComplete="off"
                        className="h-8 w-16"
                        aria-invalid={errors[line.medicine_id] ? true : undefined}
                        value={line.quantity}
                        onChange={(event) => {
                          setLines(
                            lines.map((item) =>
                              item.medicine_id === line.medicine_id
                                ? { ...item, quantity: event.target.value }
                                : item,
                            ),
                          )
                          setErrors({})
                        }}
                      />
                      <span className="text-sm text-muted-foreground">{line.unit}</span>
                    </div>
                    {errors[line.medicine_id] ? (
                      <p className="mt-1 text-xs text-danger">{errors[line.medicine_id]}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 pt-3.5 text-right align-top tabular-nums">
                    {onHand.get(line.medicine_id) ?? line.quantity_on_hand}
                  </td>
                  <td className="py-2 pr-3 text-right align-top whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Move ${line.medicine_name} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Move ${line.medicine_name} down`}
                      disabled={index === lines.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Remove ${line.medicine_name}`}
                      onClick={() =>
                        setLines(lines.filter((item) => item.medicine_id !== line.medicine_id))
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <Field className="w-72">
            <FieldLabel htmlFor="contents-add">Add to the kit</FieldLabel>
            <NativeSelect
              id="contents-add"
              className="bg-card"
              value={toAdd}
              onChange={(event) => setToAdd(event.target.value)}
            >
              <NativeSelectOption value="">Choose from the inventory…</NativeSelectOption>
              {addable.map((medicine) => (
                <NativeSelectOption key={medicine.id} value={String(medicine.id)}>
                  {medicine.display_name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Button variant="outline" className="bg-card" disabled={!toAdd} onClick={add}>
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        </div>
        <Button disabled={save.isPending} onClick={submit}>
          {save.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save contents
        </Button>
      </div>
      {save.error ? (
        <p role="alert" className="text-sm text-danger">
          {save.error instanceof ApiError ? save.error.message : 'Please try again.'}
        </p>
      ) : null}
    </div>
  )
}

export function KitContentsPage() {
  const { data, error, isPending } = useKitContents()
  const allowed = useCan()

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        The boxed medicines of the dispensary form (FM-SSA-MDS-8033). When a kit is issued these
        lines are filled in with these quantities, and staff can still change them or add other
        items. A medicine must be in the inventory to be listed here.
      </p>
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The kit contents could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {isPending ? (
        <div role="status" aria-label="Loading the kit contents">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : null}
      {data ? (
        allowed('medkits:manage') ? (
          // Starts again only when the saved lines change, not when stock on hand moves,
          // so a release at the front desk does not wipe edits in progress.
          <ContentsEditor
            key={data.map((line) => `${line.medicine_id}:${line.default_quantity}`).join(',')}
            saved={data}
          />
        ) : (
          <SectionCard title="Standard kit contents">
            {data.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                The Clinic Coordinator has not listed the kit contents yet.
              </p>
            ) : (
              <ReadOnlyContents lines={data} />
            )}
          </SectionCard>
        )
      ) : null}
    </div>
  )
}
