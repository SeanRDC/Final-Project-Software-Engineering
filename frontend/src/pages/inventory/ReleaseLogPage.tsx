import { CircleAlertIcon, ClipboardListIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import type { StockMovement, StockMovementType } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { Pager } from '@/components/Pager'
import { StatusPill, type StatusTone } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatTimeOfDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MOVEMENTS_PER_PAGE, useStockMovements } from '@/pages/inventory/useInventory'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'
const DAY = /^\d{4}-\d{2}-\d{2}$/

const TYPES: { value: StockMovementType | 'all'; label: string }[] = [
  { value: 'release', label: 'Releases' },
  { value: 'stock_in', label: 'Stock in' },
  { value: 'adjustment', label: 'Adjustments' },
  { value: 'all', label: 'All movements' },
]

const TYPE_DISPLAY: Record<StockMovementType, { label: string; tone: StatusTone }> = {
  release: { label: 'Release', tone: 'info' },
  stock_in: { label: 'Stock in', tone: 'success' },
  adjustment: { label: 'Adjustment', tone: 'warning' },
}

function parseType(value: string | null): StockMovementType | '' {
  if (value === 'all') return ''
  return value === 'stock_in' || value === 'adjustment' ? value : 'release'
}

function when(movement: StockMovement): string {
  const date = new Date(movement.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${date}, ${formatTimeOfDay(movement.created_at)}`
}

/** Every release of medicine to a patient, and on request every other change to stock. */
export function ReleaseLogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()
  const canOpenVisit = allowed('visits:read')

  // The filters live in the address, so a filtered log can be reloaded or shared.
  const movementType = parseType(searchParams.get('type'))
  const start = DAY.test(searchParams.get('from') ?? '') ? searchParams.get('from')! : ''
  const end = DAY.test(searchParams.get('to') ?? '') ? searchParams.get('to')! : ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const { data, error, isPending, isPlaceholderData } = useStockMovements({
    movementType,
    start,
    end,
    page,
  })

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    // Any change to the filters starts again from the first page.
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  const isRangeBackwards = start !== '' && end !== '' && end < start
  const isFiltered = Boolean(start || end)
  const showsOnlyReleases = movementType === 'release'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Kind of stock movement"
          value={movementType || 'all'}
          onValueChange={(next) => next && update({ type: next === 'release' ? null : next })}
        >
          {TYPES.map((type) => (
            <ToggleGroupItem key={type.value} value={type.value} className="bg-card px-3">
              {type.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor="log-from">From</FieldLabel>
            <Input
              id="log-from"
              type="date"
              className="h-9 bg-card"
              max={end || undefined}
              value={start}
              onChange={(event) => update({ from: event.target.value || null })}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="log-to">To</FieldLabel>
            <Input
              id="log-to"
              type="date"
              className="h-9 bg-card"
              min={start || undefined}
              aria-invalid={isRangeBackwards || undefined}
              value={end}
              onChange={(event) => update({ to: event.target.value || null })}
            />
          </Field>
          {isFiltered ? (
            <Button
              variant="ghost"
              className="h-9"
              onClick={() => update({ from: null, to: null })}
            >
              Clear dates
            </Button>
          ) : null}
        </div>
      </div>

      {isRangeBackwards ? (
        <p role="alert" className="text-sm text-danger">
          The “To” date is before the “From” date, so nothing can match.
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The log could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading the log" className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section
          aria-label="Stock movements"
          aria-busy={isPlaceholderData}
          className={cn(
            'overflow-hidden rounded-lg border bg-card transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardListIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {showsOnlyReleases ? 'No medicine was released' : 'No stock movements'}
                </EmptyTitle>
                <EmptyDescription>
                  {isFiltered
                    ? 'Nothing was recorded between these dates.'
                    : showsOnlyReleases
                      ? 'Medicine released during a visit is listed here.'
                      : 'Every change to stock is listed here.'}
                </EmptyDescription>
              </EmptyHeader>
              {isFiltered ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => update({ from: null, to: null })}>
                    Clear dates
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLASS, 'pl-4')}>When</TableHead>
                    <TableHead className={HEAD_CLASS}>Medicine</TableHead>
                    {showsOnlyReleases ? null : <TableHead className={HEAD_CLASS}>Kind</TableHead>}
                    <TableHead className={cn(HEAD_CLASS, 'text-right')}>Quantity</TableHead>
                    <TableHead className={cn(HEAD_CLASS, 'text-right')}>Balance</TableHead>
                    <TableHead className={HEAD_CLASS}>
                      {showsOnlyReleases ? 'Released to' : 'Patient or reason'}
                    </TableHead>
                    <TableHead className={cn(HEAD_CLASS, 'pr-4')}>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((movement) => {
                    const kind = TYPE_DISPLAY[movement.movement_type]
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="py-3 pl-4 text-sm whitespace-nowrap tabular-nums">
                          {when(movement)}
                        </TableCell>
                        <TableCell className="py-3 text-[15px] font-medium">
                          {movement.medicine_name}
                        </TableCell>
                        {showsOnlyReleases ? null : (
                          <TableCell className="py-3">
                            <StatusPill tone={kind.tone}>{kind.label}</StatusPill>
                          </TableCell>
                        )}
                        <TableCell
                          className={cn(
                            'py-3 text-right text-[15px] font-medium tabular-nums',
                            movement.quantity_change > 0 && 'text-success',
                          )}
                        >
                          {movement.quantity_change > 0 ? '+' : '−'}
                          {Math.abs(movement.quantity_change)}
                        </TableCell>
                        <TableCell className="py-3 text-right text-sm text-muted-foreground tabular-nums">
                          {movement.balance_after}
                        </TableCell>
                        <TableCell className="max-w-72 py-3 whitespace-normal">
                          {movement.patient_name ? (
                            <>
                              {movement.visit_id !== null && canOpenVisit ? (
                                <Link
                                  to={`/visits/${movement.visit_id}`}
                                  className="rounded-sm text-[15px] font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {movement.patient_name}
                                </Link>
                              ) : (
                                <span className="text-[15px] font-medium">
                                  {movement.patient_name}
                                </span>
                              )}
                              <div className="text-[13px] text-muted-foreground tabular-nums">
                                {movement.patient_id_number}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm">
                              {movement.reason ?? <span className="text-muted-foreground">—</span>}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 pr-4 text-sm">
                          {movement.performed_by_name ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pager
                page={page}
                pageSize={MOVEMENTS_PER_PAGE}
                total={data.total}
                noun={showsOnlyReleases ? 'releases' : 'movements'}
                onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
