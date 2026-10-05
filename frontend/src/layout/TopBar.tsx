import { MenuIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandLockup, BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'

type TopBarProps = {
  /** Title of the current screen, shown in the middle. */
  title: string
  /** Opens the navigation drawer on screens too narrow for the sidebar. */
  onOpenNavigation: () => void
  /** Status, notifications and the account menu, shown at the right. */
  children?: ReactNode
}

export function TopBar({ title, onOpenNavigation, children }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 border-t-[3px] border-b border-t-primary bg-card px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenNavigation}
        >
          <MenuIcon />
        </Button>
        <BrandLockup className="max-md:hidden" />
        <BrandMark className="md:hidden" />
      </div>

      <h1 className="truncate text-center text-xl font-semibold md:text-[22px]">{title}</h1>

      <div className="flex min-w-0 items-center justify-end gap-2">{children}</div>
    </header>
  )
}
