import type { DashboardStats, Medicine } from '@/api/types'
import { cn } from '@/lib/utils'

type Tile = {
  label: string
  value: number
  detail: string
  /** Draws the tile with a red top edge to call attention to it. */
  alert?: boolean
}

function lowStockDetail(lowStock: Medicine[]): string {
  const first = lowStock[0]
  if (!first) return 'All above threshold'
  const name = `${first.name} · ${first.quantity_on_hand} left`
  return lowStock.length > 1 ? `${name}, +${lowStock.length - 1} more` : name
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function tilesFor(stats: DashboardStats, lowStock: Medicine[]): Tile[] {
  return [
    {
      label: 'Open visits',
      value: stats.open_visits,
      detail: `${stats.visits_today} checked in today`,
    },
    {
      label: 'Completed today',
      value: stats.completed_today,
      detail: `${plural(stats.visits_this_month, 'visit', 'visits')} this month`,
    },
    {
      label: 'Appointments today',
      value: stats.appointments_today,
      detail: `${stats.appointments_remaining} still to come`,
    },
    {
      label: 'Low-stock medicines',
      value: stats.low_stock_items,
      detail: lowStockDetail(lowStock),
      alert: stats.low_stock_items > 0,
    },
  ]
}

type StatTilesProps = {
  stats: DashboardStats
  lowStock: Medicine[]
}

/** The four counters under the quick actions. */
export function StatTiles({ stats, lowStock }: StatTilesProps) {
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tilesFor(stats, lowStock).map((tile) => (
        <div
          key={tile.label}
          className={cn(
            'flex flex-col rounded-lg border bg-card px-4 py-3.5',
            tile.alert && 'border-t-[3px] border-t-danger pt-3',
          )}
        >
          <dt className="text-sm text-muted-foreground">{tile.label}</dt>
          <dd className="mt-1 text-[28px] leading-tight font-semibold tabular-nums">
            {tile.value}
          </dd>
          <dd className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{tile.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
