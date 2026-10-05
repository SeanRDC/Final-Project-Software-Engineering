import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { dashboard, notification } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderPage(route = '/notifications') {
  return renderApp(
    <>
      <Routes>
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={null} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user: nurse, route },
  )
}

const list = dashboard.notifications

test('lists notifications, unread ones marked, with the unread count', async () => {
  fakeServer({ 'GET /notifications': list })
  renderPage()

  const items = within(await screen.findByRole('region', { name: 'Notifications' })).getAllByRole(
    'listitem',
  )
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Unread: Low stock: Mefenamic Acid 500 mg')
  expect(items[1]).not.toHaveTextContent('Unread')
  expect(screen.getByRole('radio', { name: /Unread/ })).toHaveTextContent('Unread1')
})

test('opening an unread notification marks it read and goes to what it is about', async () => {
  const server = fakeServer({ 'GET /notifications': list })
  server.on('POST /notifications/9/read', { message: 'Notification marked as read.' })
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: /Low stock: Mefenamic Acid/ }))

  await waitFor(() => expect(server.calls).toContain('POST /notifications/9/read'))
  expect(screen.getByTestId('address')).toHaveTextContent('/inventory?low=1')
})

test('marks everything as read', async () => {
  const server = fakeServer({ 'GET /notifications': list })
  server.on('POST /notifications/read-all', () => {
    server.on('GET /notifications', {
      items: list.items.map((item) => ({ ...item, is_read: true })),
      unread_count: 0,
    })
    return { message: '1 notification(s) marked as read.' }
  })
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Mark all as read' }))

  expect(await screen.findByText('All notifications marked as read')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled(),
  )
  expect(screen.queryByText('Unread:')).not.toBeInTheDocument()
})

test('shows only unread ones on request and says when there are none', async () => {
  const queries: string[] = []
  fakeServer({
    'GET /notifications': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return url.searchParams.get('unread_only')
        ? { items: [], unread_count: 0 }
        : { items: [notification({ is_read: true })], unread_count: 0 }
    },
  })
  const user = userEvent.setup()
  renderPage()

  await screen.findByRole('region', { name: 'Notifications' })
  await user.click(screen.getByRole('radio', { name: /Unread/ }))

  expect(await screen.findByText('Nothing unread')).toBeInTheDocument()
  expect(screen.getByTestId('address')).toHaveTextContent('/notifications?show=unread')
  expect(queries.at(-1)).toBe('?limit=100&unread_only=true')
})
