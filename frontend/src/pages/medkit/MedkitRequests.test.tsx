// The medical kit request list and the request form (FM-SSA-MDS-8032).

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, MedkitRequestSummary } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { MedkitRequestsPage } from '@/pages/medkit/MedkitRequestsPage'
import { NewMedkitRequestPage } from '@/pages/medkit/NewMedkitRequestPage'
import { doctor, nurse } from '@/test/fixtures'
import { medkitRequest, requestSummary } from '@/test/medkitFixture'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderMedkit(user: CurrentUser, route: string) {
  return renderApp(
    <>
      <Routes>
        <Route path="/medkit" element={<MedkitRequestsPage />} />
        <Route path="/medkit/new" element={<NewMedkitRequestPage />} />
        <Route path="/medkit/requests/:requestId" element={<p>Request page</p>} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user, route },
  )
}

function page(items: MedkitRequestSummary[]) {
  return { items, total: items.length, page: 1, page_size: 20 }
}

test('lists the requests with their kit and state, the overdue ones marked', async () => {
  const queries: string[] = []
  fakeServer({
    'GET /medkit-requests': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return page([
        requestSummary({ id: 2, status: 'issued', is_overdue: true }),
        requestSummary({ id: 1, status: 'requested', medkit: null, activity: 'Foundation day' }),
      ])
    },
  })
  renderMedkit(nurse, '/medkit')

  const list = within(await screen.findByRole('region', { name: 'Medical kit requests' }))
  const out = list.getByRole('row', { name: /Intramurals 2026/ })
  expect(out).toHaveTextContent('Junior Philippine Computer Society')
  expect(out).toHaveTextContent('Kit #3')
  expect(out).toHaveTextContent('Overdue')
  expect(within(out).getByRole('link', { name: 'Intramurals 2026' })).toHaveAttribute(
    'href',
    '/medkit/requests/2',
  )
  expect(list.getByRole('row', { name: /Foundation day/ })).toHaveTextContent('Requested')
  expect(queries[0]).toBe('?page=1&page_size=20')
})

test('filters the requests by state, keeping the choice in the address', async () => {
  const queries: string[] = []
  fakeServer({
    'GET /medkit-requests': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return page([])
    },
  })
  const user = userEvent.setup()
  renderMedkit(nurse, '/medkit')

  await screen.findByText('No kit requests yet')
  await user.click(screen.getByRole('radio', { name: 'Out' }))
  await waitFor(() => expect(queries.at(-1)).toBe('?status=issued&page=1&page_size=20'))
  expect(screen.getByTestId('address')).toHaveTextContent('/medkit?show=issued')

  await user.click(screen.getByRole('radio', { name: 'Overdue' }))
  await waitFor(() => expect(queries.at(-1)).toBe('?overdue_only=true&page=1&page_size=20'))
})

test('files a request on the clinic form and opens it', async () => {
  const server = fakeServer({ 'GET /medkit-requests': page([]) })
  let sent: Record<string, unknown> = {}
  server.on(
    'POST /medkit-requests',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body)) as Record<string, unknown>
      return medkitRequest({ id: 9 })
    },
    201,
  )
  const user = userEvent.setup()
  renderMedkit(nurse, '/medkit/new')

  const form = within(screen.getByRole('form', { name: 'Request for medical kit' }))
  expect(
    within(form.getByRole('group', { name: 'Form code' })).getByText('FM-SSA-MDS-8032'),
  ).toBeInTheDocument()

  await user.click(form.getByRole('button', { name: 'File request' }))
  expect(form.getByText('Enter the organization or department.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /medkit-requests')

  await user.type(
    form.getByLabelText('Organization / department'),
    'Junior Philippine Computer Society',
  )
  await user.type(form.getByLabelText('Name of activity'), 'Intramurals 2026')
  await user.type(form.getByLabelText('Date of activity'), '2026-10-20')
  await user.type(form.getByLabelText('Venue'), 'University gym')
  await user.type(form.getByLabelText('Person responsible'), 'dela cruz, juan')
  await user.type(form.getByLabelText('Contact number'), '0917 555 0100')
  await user.type(form.getByLabelText('Requested by'), 'Lim, Joseph')
  await user.click(form.getByRole('button', { name: 'File request' }))

  expect(await screen.findByText('Kit requested for Intramurals 2026')).toBeInTheDocument()
  expect(sent).toMatchObject({
    organization: 'Junior Philippine Computer Society',
    activity: 'Intramurals 2026',
    activity_date: '2026-10-20',
    venue: 'University gym',
    person_responsible: 'Dela Cruz, Juan',
    contact_number: '0917 555 0100',
    requested_by: 'Lim, Joseph',
  })
  expect(sent.request_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent('/medkit/requests/9'))
})

test('the doctor sees the requests but cannot file one', async () => {
  fakeServer({ 'GET /medkit-requests': page([requestSummary()]) })
  renderMedkit(doctor, '/medkit')

  await screen.findByRole('region', { name: 'Medical kit requests' })
  expect(screen.queryByRole('link', { name: 'New request' })).not.toBeInTheDocument()
})
