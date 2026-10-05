import { cn } from '@/lib/utils'

type BrandMarkProps = {
  className?: string
}

/** The round "HAU" emblem next to the university name. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-accent font-serif text-[11px] font-bold tracking-wide text-primary',
        className,
      )}
    >
      HAU
    </span>
  )
}

/** Emblem with "Holy Angel University" and the system name beside it. */
export function BrandLockup({ className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark />
      <div className="flex flex-col leading-tight">
        <span className="font-serif text-[13px] font-bold tracking-[0.12em] uppercase">
          Holy Angel University
        </span>
        <span className="text-xs text-muted-foreground">HAU-Sync · University Clinic</span>
      </div>
    </div>
  )
}
