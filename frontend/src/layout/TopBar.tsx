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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-t-[3px] border-b border-t-primary bg-card px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-6">
      <div className="flex shrink-0 items-center gap-2 md:min-w-0">
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

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold md:text-center md:text-[22px]">
        {title}
      </h1>

      <div className="flex shrink-0 items-center justify-end gap-2 md:min-w-0">{children}</div>
    </header>
  )
}
