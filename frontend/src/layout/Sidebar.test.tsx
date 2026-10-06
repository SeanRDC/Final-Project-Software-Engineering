import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { Sidebar } from '@/layout/Sidebar'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

function linkNames(): string[] {
  const nav = screen.getByRole('navigation', { name: 'Main' })
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

test('shows the front desk everything it works with', () => {
  renderApp(<Sidebar />, { user: nurse })

  expect(linkNames()).toEqual([
    'Dashboard',
    'Check-in / Walk-in',
    "Today's visits",
    'Patients',
    'Register patient',
    'Appointments',
    'Inventory',
    'Release log',
    'Reports',
    'Notifications',
  ])
})

test('hides check-in from the doctor, who cannot open a visit', () => {
  renderApp(<Sidebar />, { user: doctor })

  expect(screen.queryByRole('link', { name: 'Check-in / Walk-in' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: "Today's visits" })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Inventory' })).toBeInTheDocument()
})

test('marks the current screen', () => {
  renderApp(<Sidebar />, { user: nurse, route: '/inventory' })

  expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
})

test('shows a count only when there is something to count', () => {
  renderApp(<Sidebar badges={{ openVisits: 5, unreadNotifications: 0 }} />, { user: nurse })

  expect(screen.getByRole('link', { name: /Today's visits.*5 open/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument()
})

test('shows accounts and the audit log to the coordinator only', () => {
  const coordinator = {
    ...nurse,
    role: 'coordinator' as const,
    permissions: [...nurse.permissions, 'users:manage', 'audit:view'],
  }
  const view = renderApp(<Sidebar />, { user: coordinator })

  expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute('href', '/users')
  expect(screen.getByRole('link', { name: 'Audit log' })).toHaveAttribute('href', '/audit')

  view.unmount()
  renderApp(<Sidebar />, { user: nurse })

  expect(screen.queryByRole('link', { name: 'Accounts' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument()
})
