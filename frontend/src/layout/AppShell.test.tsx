import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { AppShell } from '@/layout/AppShell'
import { dashboard } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderShell(options: Parameters<typeof renderApp>[1]) {
  return renderApp(
    <Routes>
      <Route element={<AppShell />}>
        <Route path="*" element={<p>Page content</p>} />
      </Route>
    </Routes>,
    options,
  )
}

test('frames the page with the title of the current screen', () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderShell({ user: nurse, route: '/inventory' })

  expect(screen.getByRole('heading', { level: 1, name: 'Medicine Inventory' })).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveTextContent('Page content')
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
})

test('shows the open visits and unread notifications on every screen', async () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderShell({ user: nurse, route: '/inventory' })

  // Both the bell and the sidebar entry carry the count.
  expect(await screen.findAllByRole('link', { name: 'Notifications, 1 unread' })).toHaveLength(2)
  expect(screen.getByRole('link', { name: /Today's visits.*2 open/ })).toBeInTheDocument()
})

test('offers patient search to accounts that may read patient records', () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderShell({ user: doctor })

  expect(screen.getByRole('searchbox')).toBeInTheDocument()
})
