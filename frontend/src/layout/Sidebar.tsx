import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

import { useCan } from '@/auth/permissions'
import { NAV_GROUPS, visibleNav, type NavBadge } from '@/layout/nav'
import { cn } from '@/lib/utils'

export type NavBadgeCounts = Partial<Record<NavBadge, number>>

type SidebarProps = {
  /** Live counts for the entries that show one. Zero or missing shows nothing. */
  badges?: NavBadgeCounts
  /** Shown above the navigation, e.g. the patient search box. */
  header?: ReactNode
  /** Called after a link is followed, so the mobile drawer can close. */
  onNavigate?: () => void
}

const LINK_BASE =
  'flex items-center gap-3 border-l-[3px] border-transparent py-2 pr-4 text-[15px] text-foreground/90 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
const LINK_ACTIVE = 'border-primary bg-accent font-medium text-accent-foreground hover:bg-accent'

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">
        , {count} {label}
      </span>
    </span>
  )
}

const BADGE_LABELS: Record<NavBadge, string> = {
  openVisits: 'open',
  unreadNotifications: 'unread',
}

export function Sidebar({ badges = {}, header, onNavigate }: SidebarProps) {
  const allowed = useCan()
  const groups = visibleNav(NAV_GROUPS, allowed)

  return (
    <div className="flex h-full flex-col">
      {header ? <div className="border-b p-3">{header}</div> : null}
      <nav aria-label="Main" className="flex-1 overflow-y-auto pb-4">
        {groups.map((group, index) => (
          <div
            key={group.heading ?? `group-${index}`}
            className={cn('py-2', index > 0 && 'border-t')}
          >
            {group.heading ? (
              <h2 className="px-4 pt-2 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {group.heading}
              </h2>
            ) : null}
            <ul>
              {group.items.map((item) => {
                const count = item.badge ? (badges[item.badge] ?? 0) : 0
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(LINK_BASE, 'pl-[13px]', isActive && LINK_ACTIVE)
                      }
                    >
                      <item.icon aria-hidden="true" className="size-[18px] shrink-0 opacity-80" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && count > 0 ? (
                        <CountBadge count={count} label={BADGE_LABELS[item.badge]} />
                      ) : null}
                    </NavLink>
                    {item.children?.length ? (
                      <ul>
                        {item.children.map((child) => (
                          <li key={child.to}>
                            <NavLink
                              to={child.to}
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                cn(
                                  LINK_BASE,
                                  'pl-[40px] text-sm text-muted-foreground',
                                  isActive && LINK_ACTIVE,
                                )
                              }
                            >
                              <span className="truncate">{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
