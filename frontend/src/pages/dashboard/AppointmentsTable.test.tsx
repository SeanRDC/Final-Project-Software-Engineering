import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { AppointmentsTable } from '@/pages/dashboard/AppointmentsTable'
import { dashboard } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('lists each appointment with its time, patient, reason and status', () => {
  renderApp(<AppointmentsTable appointments={dashboard.todays_appointments} />, { user: nurse })

  const rows = screen.getAllByRole('row').slice(1)
  expect(rows).toHaveLength(3)

  const second = within(rows[1]!)
  expect(second.getByText('10:30–11:00 AM')).toBeInTheDocument()
  expect(second.getByText('Panergo, Mark')).toBeInTheDocument()
  expect(second.getByText('20240556')).toBeInTheDocument()
  expect(second.getByText('Medical clearance for PE')).toBeInTheDocument()
  expect(second.getByText('Confirmed')).toBeInTheDocument()

  expect(within(rows[2]!).getByText('Pending')).toBeInTheDocument()
})

test('puts the given action in the last column of each row', () => {
  renderApp(
    <AppointmentsTable
      appointments={dashboard.todays_appointments}
      renderAction={(appointment) =>
        appointment.status === 'confirmed' ? <button>Check in</button> : null
      }
    />,
    { user: nurse },
  )

  expect(screen.getAllByRole('button', { name: 'Check in' })).toHaveLength(1)
})

test('says so when nothing is booked for today', () => {
  renderApp(<AppointmentsTable appointments={[]} />, { user: nurse })

  expect(screen.getByText('No appointments today')).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
