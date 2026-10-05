import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { NotificationsPanel } from '@/pages/dashboard/NotificationsPanel'
import { dashboard, notification } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('lists the latest notifications and marks the unread ones', () => {
  renderApp(<NotificationsPanel notifications={dashboard.notifications} />, { user: nurse })

  const items = within(screen.getByRole('region', { name: 'Notifications' })).getAllByRole(
    'listitem',
  )
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Unread: Low stock: Mefenamic Acid 500 mg')
  expect(items[0]).toHaveTextContent('18 left (threshold 20)')
  expect(items[1]).toHaveTextContent('Appointment awaiting approval')
  expect(items[1]).not.toHaveTextContent('Unread')
})

test('shows at most five and links to the rest', () => {
  const items = Array.from({ length: 8 }, (_, index) =>
    notification({ id: index + 1, title: `Alert ${index + 1}` }),
  )
  renderApp(<NotificationsPanel notifications={{ items, unread_count: 8 }} />, { user: nurse })

  expect(screen.getAllByRole('listitem')).toHaveLength(5)
  expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/notifications')
})

test('says so when there is nothing to report', () => {
  renderApp(<NotificationsPanel notifications={{ items: [], unread_count: 0 }} />, {
    user: nurse,
  })

  expect(screen.getByText('No notifications yet.')).toBeInTheDocument()
})
