import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/auth/authContext'
import { useCan } from '@/auth/permissions'
import { useIdleLogout } from '@/auth/useIdleLogout'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ConnectionStatus } from '@/layout/ConnectionStatus'
import { NotificationBell } from '@/layout/NotificationBell'
import { CHANGE_PASSWORD, pageFor } from '@/layout/pages'
import { PatientSearch } from '@/layout/PatientSearch'
import { Sidebar, type NavBadgeCounts } from '@/layout/Sidebar'
import { TopBar } from '@/layout/TopBar'
import { UserMenu } from '@/layout/UserMenu'
import { useDashboard } from '@/pages/dashboard/useDashboard'

/** The frame around every signed-in screen: top bar, sidebar and the page itself. */
export function AppShell() {
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user } = useAuth()
  useIdleLogout()
  const allowed = useCan()
  const canSearch = allowed('patients:read')
  const title = pageFor(location.pathname)?.title ?? 'HAU-Sync'

  // The counts ride on the dashboard request, which live events keep fresh on every screen.
  const { data: dashboard } = useDashboard()
  const unread = dashboard?.notifications.unread_count ?? 0
  const badges: NavBadgeCounts = {
    openVisits: dashboard?.stats.open_visits ?? 0,
    unreadNotifications: unread,
  }

  // An account still on the password the coordinator set must replace it before anything else.
  if (user?.must_change_password && location.pathname !== CHANGE_PASSWORD.path) {
    return <Navigate to={CHANGE_PASSWORD.path} replace />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>

      <TopBar title={title} onOpenNavigation={() => setIsDrawerOpen(true)}>
        <ConnectionStatus />
        <NotificationBell unread={unread} />
        <UserMenu />
      </TopBar>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-[260px] shrink-0 border-r bg-sidebar lg:block">
          <Sidebar badges={badges} header={canSearch ? <PatientSearch /> : null} />
        </aside>

        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="left" className="w-[280px] gap-0 p-0">
            <SheetHeader className="border-b">
              <SheetTitle>HAU-Sync</SheetTitle>
              <SheetDescription>University Clinic</SheetDescription>
            </SheetHeader>
            <Sidebar
              badges={badges}
              header={canSearch ? <PatientSearch onSearch={() => setIsDrawerOpen(false)} /> : null}
              onNavigate={() => setIsDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
