import { screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { dashboard } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('loads the dashboard in one request and shows the counters', async () => {
  const server = fakeServer({ 'GET /dashboard': dashboard })
  renderApp(<DashboardPage />, { user: nurse })

  expect(await screen.findByText('Open visits')).toBeInTheDocument()
  expect(screen.getByText('3 checked in today')).toBeInTheDocument()
  expect(server.calls).toEqual(['GET /dashboard'])
})

test('offers only the shortcuts the account may use', async () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderApp(<DashboardPage />, { user: doctor })

  await screen.findByText('Open visits')
  expect(screen.queryByRole('link', { name: 'Check in patient' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Search patient' })).toBeInTheDocument()
})
