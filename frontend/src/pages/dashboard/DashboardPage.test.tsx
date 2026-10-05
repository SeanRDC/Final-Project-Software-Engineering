import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { dashboard } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows a loading placeholder, then every panel from one request', async () => {
  const server = fakeServer({ 'GET /dashboard': dashboard })
  renderApp(<DashboardPage />, { user: nurse })

  expect(screen.getByRole('status', { name: 'Loading the dashboard' })).toBeInTheDocument()

  expect(await screen.findByText('Open visits')).toBeInTheDocument()
  expect(screen.queryByRole('status', { name: 'Loading the dashboard' })).not.toBeInTheDocument()
  for (const name of [
    "Today's visits",
    "Today's appointments",
    'Appointment calendar',
    'Events for today',
    'Notifications',
  ]) {
    expect(screen.getByRole('region', { name })).toBeInTheDocument()
  }
  expect(server.calls).toEqual(['GET /dashboard'])
})

test('lets the front desk check in a confirmed appointment only', async () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderApp(<DashboardPage />, { user: nurse })

  const table = within(await screen.findByRole('region', { name: "Today's appointments" }))
  expect(table.getAllByRole('button')).toHaveLength(1)
  expect(table.getByRole('button', { name: 'Check in Panergo, Mark' })).toBeInTheDocument()
})

test('hides front-desk actions from the doctor', async () => {
  fakeServer({ 'GET /dashboard': dashboard })
  renderApp(<DashboardPage />, { user: doctor })

  const table = within(await screen.findByRole('region', { name: "Today's appointments" }))
  expect(table.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Check in patient' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Search patient' })).toBeInTheDocument()
})

test('explains a failed load and loads again on request', async () => {
  const server = fakeServer()
  server.on('GET /dashboard', { detail: 'The clinic database is not available' }, 500)
  const user = userEvent.setup()
  renderApp(<DashboardPage />, { user: nurse })

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('The dashboard could not be loaded')
  expect(alert).toHaveTextContent('The clinic database is not available')

  server.on('GET /dashboard', dashboard)
  await user.click(within(alert).getByRole('button', { name: 'Try again' }))

  expect(await screen.findByText('Open visits')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
