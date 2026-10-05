import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: string
  /** Link or button shown at the right of the header, e.g. "View calendar". */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** A dashboard panel: charcoal header bar with a title, then the content. */
export function SectionCard({ title, action, className, children }: SectionCardProps) {
  return (
    <section
      aria-label={title}
      className={cn('overflow-hidden rounded-lg border bg-card text-card-foreground', className)}
    >
      <header className="flex min-h-10 items-center justify-between gap-4 bg-header px-4 py-2 text-header-foreground">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action ? <div className="text-sm font-medium">{action}</div> : null}
      </header>
      {children}
    </section>
  )
}
