import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { TodaysEvents } from '@/pages/dashboard/TodaysEvents'
import { appointment, dashboard } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('lists only the appointments still ahead', () => {
  renderApp(<TodaysEvents appointments={dashboard.todays_appointments} />, { user: nurse })

  const items = within(screen.getByRole('region', { name: 'Events for today' })).getAllByRole(
    'listitem',
  )
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Panergo, Mark')
  expect(items[0]).toHaveTextContent('10:30 AM')
  expect(items[1]).toHaveTextContent('Miranda, Gil')
  expect(items[1]).toHaveTextContent('BP monitoring · awaiting approval')
})

test('says so when the day has nothing left', () => {
  renderApp(<TodaysEvents appointments={[appointment({ status: 'completed' })]} />, {
    user: nurse,
  })

  expect(screen.getByText('Nothing else is scheduled for today.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View all appointments' })).toHaveAttribute(
    'href',
    '/appointments',
  )
})
