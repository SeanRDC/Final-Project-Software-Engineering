import { screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { ArrivingByAppointment } from '@/pages/checkin/ArrivingByAppointment'
import { appointment, dashboard } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('lists who is still expected and offers check-in for confirmed appointments', async () => {
  fakeServer({ 'GET /appointments/today': dashboard.todays_appointments })
  renderApp(<ArrivingByAppointment />, { user: nurse })

  const items = await screen.findAllByRole('listitem')
  expect(items).toHaveLength(2)

  expect(items[0]).toHaveTextContent('Panergo, Mark')
  expect(items[0]).toHaveTextContent('10:30 AM · Medical clearance for PE')
  expect(
    within(items[0]!).getByRole('button', { name: 'Check in Panergo, Mark' }),
  ).toBeInTheDocument()

  expect(items[1]).toHaveTextContent('Miranda, Gil')
  expect(within(items[1]!).getByText('Pending')).toBeInTheDocument()
  expect(within(items[1]!).queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByText(/check them in as a walk-in/)).toBeInTheDocument()
})

test('says so when nobody else is expected', async () => {
  fakeServer({ 'GET /appointments/today': [appointment({ status: 'completed' })] })
  renderApp(<ArrivingByAppointment />, { user: nurse })

  expect(
    await screen.findByText('No one else is expected by appointment today.'),
  ).toBeInTheDocument()
})
