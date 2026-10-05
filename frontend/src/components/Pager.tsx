import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

type PagerProps = {
  /** The current page, starting at 1. */
  page: number
  pageSize: number
  /** How many records match in all. */
  total: number
  /** What is being counted, for the summary: "patients", "visits". */
  noun: string
  onPageChange: (page: number) => void
}

/** "Showing 21–40 of 53 patients" with buttons to the previous and next page. */
export function Pager({ page, pageSize, total, noun, onPageChange }: PagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label={`Pages of ${noun}`}
      className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        Showing {first}–{last} of {total} {noun}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </div>
      ) : null}
    </nav>
  )
}
