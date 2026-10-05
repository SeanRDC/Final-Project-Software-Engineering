import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { MonthCalendar } from '@/pages/dashboard/MonthCalendar'
import { dashboard } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderCalendar() {
  return renderApp(<MonthCalendar today="2026-10-04" days={dashboard.calendar} />, { user: nurse })
}

test('shows the current month with today marked', () => {
  renderCalendar()

  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
  const today = screen.getByRole('link', { name: /Sunday, October 4, 2026, today/ })
  expect(today).toHaveAttribute('aria-current', 'date')
  expect(today).toHaveAttribute('href', '/appointments?date=2026-10-04')
})

test('puts a dot on the days that have appointments', () => {
  renderCalendar()

  expect(screen.getAllByTestId('appointment-dot')).toHaveLength(3)
  const busy = screen.getByRole('link', { name: /October 12, 2026, 2 appointments/ })
  expect(within(busy).getByTestId('appointment-dot')).toBeInTheDocument()
  const quiet = screen.getByRole('link', { name: 'Tuesday, October 6, 2026' })
  expect(within(quiet).queryByTestId('appointment-dot')).not.toBeInTheDocument()
})

test('loads another month when it is opened', async () => {
  const server = fakeServer({
    'GET /appointments/calendar': [{ date: '2026-11-09', appointment_count: 1 }],
  })
  const user = userEvent.setup()
  renderCalendar()

  await user.click(screen.getByRole('button', { name: 'Next month' }))

  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument()
  expect(
    await screen.findByRole('link', { name: /November 9, 2026, 1 appointment$/ }),
  ).toBeInTheDocument()
  expect(server.calls).toEqual(['GET /appointments/calendar'])
  expect(screen.queryByRole('link', { name: /today/ })).not.toBeInTheDocument()
})

test('uses the data it was given for the current month without asking the server', async () => {
  const server = fakeServer()
  const user = userEvent.setup()
  renderCalendar()

  await user.click(screen.getByRole('button', { name: 'Previous month' }))
  await user.click(screen.getByRole('button', { name: 'Next month' }))

  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
  expect(screen.getAllByTestId('appointment-dot')).toHaveLength(3)
  expect(server.calls).toEqual(['GET /appointments/calendar'])
})
