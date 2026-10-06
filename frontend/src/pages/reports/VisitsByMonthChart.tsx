// Column chart of the visits in each month of a report, with a table for screen readers.

import type { CountItem } from '@/api/types'
import { SectionCard } from '@/components/SectionCard'
import { cn } from '@/lib/utils'
import { fillMonths } from '@/pages/reports/months'

/** Height in pixels of the tallest column. */
const COLUMN_HEIGHT = 120
/** Up to this many months, every column shows its value and its month. */
const LABEL_ALL = 12

function monthDate(label: string): Date {
  const [year = 1970, month = 1] = label.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

/** The trend of visits over the months of a period. Nothing is drawn for a single month. */
export function VisitsByMonthChart({ items }: { items: CountItem[] }) {
  const months = fillMonths(items)
  if (months.length < 2) return null

  const max = Math.max(...months.map((month) => month.count))
  const labelAll = months.length <= LABEL_ALL
  const labelEvery = Math.ceil(months.length / LABEL_ALL)

  return (
    <SectionCard title="Visits by month">
      <div aria-hidden="true" className="px-4 pt-5 pb-3">
        <div className="flex gap-0.5 border-b">
          {months.map((month) => (
            <div
              key={month.label}
              className="group flex max-w-20 min-w-0 flex-1 flex-col items-center justify-end pt-6 hover:bg-muted"
            >
              <span
                className={cn(
                  'mb-1 text-[13px] leading-none font-medium whitespace-nowrap tabular-nums',
                  // With many months only the busiest is labelled; the rest show on hover.
                  !labelAll && month.count !== max && 'opacity-0 group-hover:opacity-100',
                )}
              >
                {month.count.toLocaleString('en-US')}
              </span>
              <div
                className="w-full max-w-6 rounded-t-sm bg-chart-1"
                style={{
                  height: max === 0 ? 0 : Math.round((month.count / max) * COLUMN_HEIGHT),
                  minHeight: month.count > 0 ? 2 : 0,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-0.5 pt-1.5 text-[13px] leading-tight text-muted-foreground">
          {months.map((month, index) => {
            const date = monthDate(month.label)
            const isLabelled = index % labelEvery === 0
            return (
              <div
                key={month.label}
                className="h-9 max-w-20 min-w-0 flex-1 text-center whitespace-nowrap"
              >
                {isLabelled ? (
                  <>
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                    {index === 0 || date.getMonth() < labelEvery ? (
                      <div className="tabular-nums">{date.getFullYear()}</div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Visits</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.label}>
              <th scope="row">
                {monthDate(month.label).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </th>
              <td>{month.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
