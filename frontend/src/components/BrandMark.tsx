import hauLogo from '@/assets/hau-logo.png'
import { cn } from '@/lib/utils'

type BrandMarkProps = {
  className?: string
}

/** The seal of Holy Angel University, shown next to the university name. */
export function BrandMark({ className }: BrandMarkProps) {
  // The name is written beside the seal, so the image itself says nothing to a screen reader.
  return (
    <img
      src={hauLogo}
      alt=""
      width={44}
      height={44}
      className={cn('size-11 shrink-0 object-contain', className)}
    />
  )
}

/** Seal with "Holy Angel University" and the system name beside it. */
export function BrandLockup({ className }: BrandMarkProps) {
  return (
    <div translate="no" className={cn('flex items-center gap-3', className)}>
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
