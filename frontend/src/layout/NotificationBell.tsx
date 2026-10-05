import { BellIcon } from 'lucide-react'
import { Link } from 'react-router'

type NotificationBellProps = {
  /** Number of notifications the signed-in account has not read. */
  unread: number
}

/** The bell in the top bar. It opens the notifications screen. */
export function NotificationBell({ unread }: NotificationBellProps) {
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications, nothing unread'

  return (
    <Link
      to="/notifications"
      aria-label={label}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-md text-foreground/80 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BellIcon aria-hidden="true" className="size-5" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </Link>
  )
}
