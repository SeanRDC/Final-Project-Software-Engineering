// The sidebar: what it lists, in which groups, and the permission each entry needs.

import {
  BarChart3Icon,
  BellIcon,
  BoxesIcon,
  CalendarDaysIcon,
  ClipboardPlusIcon,
  LayoutGridIcon,
  ListOrderedIcon,
  PillIcon,
  ScrollTextIcon,
  UserCogIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'

import type { Permission } from '@/auth/permissions'

/** A live count shown at the right of an entry. */
export type NavBadge = 'openVisits' | 'unreadNotifications'

export type NavChild = {
  to: string
  label: string
  permission?: Permission
}

export type NavItem = NavChild & {
  icon: LucideIcon
  /** Highlight only on the exact address, not on the screens beneath it. */
  end?: boolean
  badge?: NavBadge
  children?: NavChild[]
}

export type NavGroup = {
  heading?: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: LayoutGridIcon, end: true }],
  },
  {
    heading: 'Front desk',
    items: [
      {
        to: '/check-in',
        label: 'Check-in / Walk-in',
        icon: ClipboardPlusIcon,
        permission: 'visits:record',
      },
      {
        to: '/visits',
        label: "Today's visits",
        icon: ListOrderedIcon,
        permission: 'visits:read',
        badge: 'openVisits',
      },
    ],
  },
  {
    heading: 'Patients',
    items: [
      {
        to: '/patients',
        label: 'Patients',
        icon: UsersIcon,
        permission: 'patients:read',
        end: true,
        children: [
          { to: '/patients/new', label: 'Register patient', permission: 'patients:write' },
        ],
      },
      {
        to: '/appointments',
        label: 'Appointments',
        icon: CalendarDaysIcon,
        permission: 'appointments:read',
      },
    ],
  },
  {
    heading: 'Medicine',
    items: [
      {
        to: '/inventory',
        label: 'Inventory',
        icon: PillIcon,
        permission: 'inventory:read',
        end: true,
      },
      {
        to: '/inventory/releases',
        label: 'Release log',
        icon: BoxesIcon,
        permission: 'inventory:read',
      },
    ],
  },
  {
    heading: 'Records and admin',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3Icon, permission: 'reports:view' },
      { to: '/users', label: 'Accounts', icon: UserCogIcon, permission: 'users:manage' },
      { to: '/audit', label: 'Audit log', icon: ScrollTextIcon, permission: 'audit:view' },
    ],
  },
  {
    items: [
      {
        to: '/notifications',
        label: 'Notifications',
        icon: BellIcon,
        badge: 'unreadNotifications',
      },
    ],
  },
]

/** The entries an account may see. Groups left with nothing are dropped. */
export function visibleNav(
  groups: NavGroup[],
  allowed: (permission: Permission | undefined) => boolean,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => allowed(item.permission))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => allowed(child.permission)),
        })),
    }))
    .filter((group) => group.items.length > 0)
}
