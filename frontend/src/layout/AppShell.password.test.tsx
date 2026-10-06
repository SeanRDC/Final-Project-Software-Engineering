// An account on a temporary password is held at the change-password screen.

import { screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { AppShell } from '@/layout/AppShell'
import { dashboard } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  return <p data-testid="address">{useLocation().pathname}</p>
}

function renderShell(options: Parameters<typeof renderApp>[1]) {
  return renderApp(
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="*" element={<p>Page content</p>} />
        </Route>
      </Routes>
      <Address />
    </>,
    options,
  )
}

test('sends an account with a temporary password to change it, whatever it opened', () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderShell({ user: { ...nurse, must_change_password: true }, route: '/patients' })

  expect(screen.getByTestId('address')).toHaveTextContent('/account/password')
  expect(screen.getByRole('heading', { level: 1, name: 'Change Password' })).toBeInTheDocument()
})

test('leaves every other account where it was going', () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderShell({ user: nurse, route: '/patients' })

  expect(screen.getByTestId('address')).toHaveTextContent('/patients')
})
