import { Link } from 'react-router'

import type { NotificationList } from '@/api/types'
import { SectionCard } from '@/components/SectionCard'
import { formatAgo } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/utils'

// The panel is a glance at the latest alerts; the notifications screen has the rest.
const MAX_ITEMS = 5

type NotificationsPanelProps = {
  notifications: NotificationList
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const now = useNow()
  const shown = notifications.items.slice(0, MAX_ITEMS)

  return (
    <SectionCard
      title="Notifications"
      action={
        <Link to="/notifications" className="rounded-sm underline-offset-4 hover:underline">
          View all
        </Link>
      }
    >
      {shown.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="divide-y">
          {shown.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5 px-4 py-3">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-[7px] size-2 shrink-0 rounded-full',
                  item.is_read ? 'bg-transparent' : 'bg-primary',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-[15px]', !item.is_read && 'font-medium')}>
                  {item.is_read ? null : <span className="sr-only">Unread: </span>}
                  {item.title}
                </p>
                {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
              </div>
              <time
                dateTime={item.created_at}
                className="shrink-0 pt-0.5 text-[13px] text-muted-foreground tabular-nums"
              >
                {formatAgo(item.created_at, now)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
