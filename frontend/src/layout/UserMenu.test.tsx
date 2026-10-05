import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { UserMenu } from '@/layout/UserMenu'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('shows who is signed in and their job title', () => {
  renderApp(<UserMenu />, { user: nurse })

  const trigger = screen.getByRole('button', { name: /Reyes, Ana/ })
  expect(trigger).toHaveTextContent('Nurse')
})

test('signs out from the menu', async () => {
  const logout = vi.fn()
  const user = userEvent.setup()
  renderApp(<UserMenu />, { user: nurse, auth: { logout } })

  await user.click(screen.getByRole('button', { name: /Reyes, Ana/ }))
  await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

  expect(logout).toHaveBeenCalledOnce()
})

test('renders nothing when nobody is signed in', () => {
  renderApp(<UserMenu />)

  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
