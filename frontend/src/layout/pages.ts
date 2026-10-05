// Every screen of the app: its address, the title shown in the top bar and the
// permission an account needs to open it.

import type { Permission } from '@/auth/permissions'

export type Page = {
  path: string
  title: string
  permission?: Permission
}

export const DASHBOARD: Page = { path: '/', title: 'Clinic Main Menu' }
export const CHECK_IN: Page = {
  path: '/check-in',
  title: 'Check-in / Walk-in',
  permission: 'visits:record',
}
export const VISITS: Page = { path: '/visits', title: "Today's Visits", permission: 'visits:read' }

/** Screens that are planned but not built yet. They show a placeholder for now. */
export const UPCOMING_PAGES: Page[] = [
  { path: '/patients', title: 'Patients', permission: 'patients:read' },
  { path: '/patients/new', title: 'Register Patient', permission: 'patients:write' },
  { path: '/appointments', title: 'Appointments', permission: 'appointments:read' },
  { path: '/appointments/new', title: 'New Appointment', permission: 'appointments:write' },
  { path: '/inventory', title: 'Medicine Inventory', permission: 'inventory:read' },
  { path: '/inventory/releases', title: 'Medicine Release Log', permission: 'inventory:read' },
  { path: '/notifications', title: 'Notifications' },
]

export const PAGES: Page[] = [DASHBOARD, CHECK_IN, VISITS, ...UPCOMING_PAGES]

/** The page a browser address belongs to, e.g. "/patients/12" belongs to "/patients". */
export function pageFor(pathname: string): Page | undefined {
  const exact = PAGES.find((page) => page.path === pathname)
  if (exact) return exact
  return PAGES.filter((page) => page.path !== '/' && pathname.startsWith(`${page.path}/`)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0]
}
