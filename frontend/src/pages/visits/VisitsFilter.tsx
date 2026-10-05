import type { VisitSummary } from '@/api/types'
import { applyFilter, parseFilter, type VisitFilter } from '@/pages/visits/filter'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const FILTERS: { value: VisitFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
]

type VisitsFilterProps = {
  visits: VisitSummary[]
  value: VisitFilter
  onChange: (filter: VisitFilter) => void
}

/** Narrows the log to open or completed visits, with the count of each. */
export function VisitsFilter({ visits, value, onChange }: VisitsFilterProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Show visits"
      value={value}
      // Clicking the active option would clear it; a filter is always chosen.
      onValueChange={(next) => next && onChange(parseFilter(next))}
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem key={filter.value} value={filter.value} className="bg-card px-3">
          {filter.label}
          <span className="text-muted-foreground tabular-nums">
            {applyFilter(visits, filter.value).length}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
