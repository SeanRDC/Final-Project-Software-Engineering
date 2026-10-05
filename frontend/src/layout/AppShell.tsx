import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCan } from '@/auth/permissions'
import { ConnectionStatus } from '@/layout/ConnectionStatus'
import { PatientSearch } from '@/layout/PatientSearch'
import { pageFor } from '@/layout/pages'
import { Sidebar } from '@/layout/Sidebar'
import { TopBar } from '@/layout/TopBar'
import { UserMenu } from '@/layout/UserMenu'

/** The frame around every signed-in screen: top bar, sidebar and the page itself. */
export function AppShell() {
  const location = useLocation()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const allowed = useCan()
  const canSearch = allowed('patients:read')
  const title = pageFor(location.pathname)?.title ?? 'HAU-Sync'

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>

      <TopBar title={title} onOpenNavigation={() => setIsDrawerOpen(true)}>
        <ConnectionStatus className="max-md:hidden" />
        <UserMenu />
      </TopBar>

      <div className="flex flex-1">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-[260px] shrink-0 border-r bg-sidebar lg:block">
          <Sidebar header={canSearch ? <PatientSearch /> : null} />
        </aside>

        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="left" className="w-[280px] gap-0 p-0">
            <SheetHeader className="border-b">
              <SheetTitle>HAU-Sync</SheetTitle>
              <SheetDescription>University Clinic</SheetDescription>
            </SheetHeader>
            <Sidebar
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
