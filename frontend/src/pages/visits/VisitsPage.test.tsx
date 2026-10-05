import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { VisitsPage } from '@/pages/visits/VisitsPage'
import { dashboard } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage(options: Parameters<typeof renderApp>[1]) {
  return renderApp(
    <Routes>
      <Route path="/visits" element={<VisitsPage />}>
        <Route path=":visitId" element={<p>Visit panel</p>} />
      </Route>
    </Routes>,
    options,
  )
}

function patientNames(): string[] {
  return within(screen.getByRole('region', { name: 'Visit log' }))
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

test('lists the day’s visits with a link to each', async () => {
  fakeServer({ 'GET /visits/today': dashboard.todays_visits })
  renderPage({ user: nurse, route: '/visits' })

  const log = await screen.findByRole('region', { name: 'Visit log' })
  expect(patientNames()).toEqual(['Santos, Maria', 'Mendoza, Carlo', 'Lim, Joseph'])

  const rows = within(log).getAllByRole('row').slice(1)
  expect(rows[1]).toHaveTextContent('In consultation')
  expect(rows[1]).toHaveTextContent('Dr. Villareal')
  expect(rows[2]).toHaveTextContent('Visit took 1 h 10 min')
  expect(screen.getByRole('link', { name: 'Santos, Maria' })).toHaveAttribute('href', '/visits/14')
})

test('filters by status and keeps the filter in the address', async () => {
  fakeServer({ 'GET /visits/today': dashboard.todays_visits })
  const user = userEvent.setup()
  renderPage({ user: nurse, route: '/visits' })

  await screen.findByRole('region', { name: 'Visit log' })
  expect(screen.getByRole('radio', { name: /Open/ })).toHaveTextContent('Open2')

  await user.click(screen.getByRole('radio', { name: /Completed/ }))

  expect(patientNames()).toEqual(['Lim, Joseph'])
  expect(screen.getByRole('link', { name: 'Lim, Joseph' })).toHaveAttribute(
    'href',
    '/visits/8?status=completed',
  )
})

test('starts on the filter named in the address', async () => {
  fakeServer({ 'GET /visits/today': dashboard.todays_visits })
  renderPage({ user: nurse, route: '/visits?status=open' })

  await screen.findByRole('region', { name: 'Visit log' })
  expect(patientNames()).toEqual(['Santos, Maria', 'Mendoza, Carlo'])
})

test('explains an empty filter and offers the way back', async () => {
  fakeServer({ 'GET /visits/today': dashboard.todays_visits.slice(0, 2) })
  const user = userEvent.setup()
  renderPage({ user: nurse, route: '/visits?status=completed' })

  expect(await screen.findByText('No completed visits yet')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Show all visits' }))

  expect(patientNames()).toHaveLength(2)
})

test('offers check-in to the front desk only', async () => {
  fakeServer({ 'GET /visits/today': [] })
  renderPage({ user: doctor, route: '/visits' })

  expect(await screen.findByText('No visits yet today')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Check in patient' })).not.toBeInTheDocument()
})

test('shows the opened visit over the list', async () => {
  fakeServer({ 'GET /visits/today': dashboard.todays_visits })
  renderPage({ user: nurse, route: '/visits/14' })

  expect(screen.getByText('Visit panel')).toBeInTheDocument()
  expect(await screen.findByRole('region', { name: 'Visit log' })).toBeInTheDocument()
})
