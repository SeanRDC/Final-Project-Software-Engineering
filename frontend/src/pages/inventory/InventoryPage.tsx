import { CircleAlertIcon, PillIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import type { Medicine } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { StatusPill, type StatusTone } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseDay } from '@/lib/format'
import { useClinicToday } from '@/lib/useClinicToday'
import { cn } from '@/lib/utils'
import { MedicineDialog } from '@/pages/inventory/MedicineDialog'
import { StockDialog, type StockAction } from '@/pages/inventory/StockDialog'
import { useInventory } from '@/pages/inventory/useInventory'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

/** Medicines that expire within this many days are flagged. */
const EXPIRING_SOON_DAYS = 60

function stockStatus(medicine: Medicine): { label: string; tone: StatusTone } {
  if (!medicine.is_active) return { label: 'Not in use', tone: 'neutral' }
  if (medicine.quantity_on_hand === 0) return { label: 'Out of stock', tone: 'danger' }
  if (medicine.is_low_stock) return { label: 'Low stock', tone: 'warning' }
  return { label: 'In stock', tone: 'success' }
}

function expiry(
  medicine: Medicine,
  today: string,
): { text: string; tone: 'normal' | 'soon' | 'expired' } {
  if (!medicine.expiry_date) return { text: '—', tone: 'normal' }
  const text = parseDay(medicine.expiry_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (medicine.expiry_date < today) return { text: `${text} · expired`, tone: 'expired' }
  const days = Math.round(
    (parseDay(medicine.expiry_date).getTime() - parseDay(today).getTime()) / 86_400_000,
  )
  return days <= EXPIRING_SOON_DAYS
    ? { text: `${text} · ${days} days`, tone: 'soon' }
    : { text, tone: 'normal' }
}

function SearchBox({ term, onSearch }: { term: string; onSearch: (term: string) => void }) {
  const [value, setValue] = useState(term)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
      <InputGroup className="h-10 bg-card">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          name="q"
          aria-label="Search medicines by name"
          placeholder="Medicine name…"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </InputGroup>
      <Button type="submit" variant="outline" className="h-10 bg-card px-4">
        Search
      </Button>
    </form>
  )
}

/** The medicine inventory: what is in stock, what is running low, and the means to restock. */
export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()
  const today = useClinicToday()
  const canWrite = allowed('inventory:write')

  const q = searchParams.get('q') ?? ''
  const lowStockOnly = searchParams.get('low') === '1'
  const includeInactive = searchParams.get('inactive') === '1'
  const { data, error, isPending, isPlaceholderData } = useInventory({
    q,
    lowStockOnly,
    includeInactive,
  })

  // null = closed, 'new' = adding, a medicine = editing it.
  const [editing, setEditing] = useState<Medicine | 'new' | null>(null)
  const [stock, setStock] = useState<{ medicine: Medicine; action: StockAction } | null>(null)

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  const isFiltered = Boolean(q || lowStockOnly)
  const lowCount = (data ?? []).filter(
    (medicine) => medicine.is_active && medicine.is_low_stock,
  ).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox key={q} term={q} onSearch={(term) => update({ q: term || null })} />
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="lg" className="h-10 bg-card px-4">
            <Link to="/inventory/releases">Release log</Link>
          </Button>
          {canWrite ? (
            <Button size="lg" className="h-10 px-4" onClick={() => setEditing('new')}>
              <PlusIcon data-icon="inline-start" />
              Add medicine
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={lowStockOnly}
            onCheckedChange={(state) => update({ low: state === true ? '1' : null })}
          />
          Low stock only
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={includeInactive}
            onCheckedChange={(state) => update({ inactive: state === true ? '1' : null })}
          />
          Include medicines not in use
        </label>
        {data && !lowStockOnly && lowCount > 0 ? (
          <p className="text-warning">
            {lowCount} {lowCount === 1 ? 'medicine is' : 'medicines are'} at or below the low-stock
            threshold.
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The inventory could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading the inventory" className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section
          aria-label="Medicines"
          aria-busy={isPlaceholderData}
          className={cn(
            'overflow-hidden rounded-lg border bg-card transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PillIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {lowStockOnly && !q
                    ? 'Nothing is running low'
                    : isFiltered
                      ? 'No medicine matches'
                      : 'The inventory is empty'}
                </EmptyTitle>
                <EmptyDescription>
                  {lowStockOnly && !q
                    ? 'Every medicine in use is above its low-stock threshold.'
                    : isFiltered
                      ? 'Check the spelling or clear the filters.'
                      : 'Add the first medicine to start tracking stock.'}
                </EmptyDescription>
              </EmptyHeader>
              {isFiltered ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => setSearchParams({})}>
                    Show all medicines
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Medicine</TableHead>
                  <TableHead className={cn(HEAD_CLASS, 'text-right')}>In stock</TableHead>
                  <TableHead className={cn(HEAD_CLASS, 'text-right')}>Threshold</TableHead>
                  <TableHead className={HEAD_CLASS}>Status</TableHead>
                  <TableHead className={HEAD_CLASS}>Expiry</TableHead>
                  {canWrite ? (
                    <TableHead className="pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((medicine) => {
                  const status = stockStatus(medicine)
                  const expires = expiry(medicine, today)
                  return (
                    <TableRow key={medicine.id} className={cn(!medicine.is_active && 'opacity-70')}>
                      <TableCell className="py-3 pl-4">
                        <div className="text-[15px] font-medium">{medicine.display_name}</div>
                        {medicine.form ? (
                          <div className="text-[13px] text-muted-foreground">{medicine.form}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-3 text-right text-[15px] font-medium tabular-nums">
                        {medicine.quantity_on_hand}{' '}
                        <span className="text-[13px] font-normal text-muted-foreground">
                          {medicine.unit}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm text-muted-foreground tabular-nums">
                        {medicine.low_stock_threshold}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-3 text-sm whitespace-nowrap tabular-nums',
                          expires.tone === 'soon' && 'font-medium text-warning',
                          expires.tone === 'expired' && 'font-medium text-danger',
                        )}
                      >
                        {expires.text}
                      </TableCell>
                      {canWrite ? (
                        <TableCell className="py-3 pr-4">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-card"
                              aria-label={`Stock in ${medicine.display_name}`}
                              onClick={() => setStock({ medicine, action: 'stock-in' })}
                            >
                              Stock in
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Adjust count of ${medicine.display_name}`}
                              onClick={() => setStock({ medicine, action: 'adjust' })}
                            >
                              Adjust
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Edit ${medicine.display_name}`}
                              onClick={() => setEditing(medicine)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}

      <MedicineDialog
        open={editing !== null}
        medicine={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
      <StockDialog target={stock} onClose={() => setStock(null)} />
    </div>
  )
}
