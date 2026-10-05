import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'consult'

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-info-subtle text-info',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  consult: 'bg-consult-subtle text-consult',
}

type StatusPillProps = Omit<ComponentProps<typeof Badge>, 'variant'> & {
  tone?: StatusTone
}

/** Small coloured label for the state of a visit, appointment or stock item. */
export function StatusPill({ tone = 'neutral', className, ...props }: StatusPillProps) {
  return <Badge variant="secondary" className={cn(TONE_CLASSES[tone], className)} {...props} />
}
