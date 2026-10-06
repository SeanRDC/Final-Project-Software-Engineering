import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { AuditEntry } from '@/api/types'
import { AuditLogPage } from '@/pages/audit/AuditLogPage'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const entries: AuditEntry[] = [
  {
    id: 2,
    user_id: 2,
    username: 'nurse',
    action: 'patient.view',
    entity_type: 'patient',
    entity_id: 1,
    detail: null,
    created_at: '2026-10-04T02:00:00+00:00',
  },
  {
    id: 1,
    user_id: null,
    username: null,
    action: 'auth.login_failed',
    entity_type: null,
    entity_id: null,
    detail: 'username=nurse',
    created_at: '2026-10-04T01:00:00+00:00',
  },
]

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderPage(route = '/audit') {
  return renderApp(
    <>
      <Routes>
        <Route path="/audit" element={<AuditLogPage />} />
      </Routes>
      <Address />
    </>,
    { user: nurse, route },
  )
}

function server(items = entries) {
  const queries: URLSearchParams[] = []
  fakeServer({
    'GET /audit-logs': ({ url }: { url: URL }) => {
      queries.push(url.searchParams)
      return { items, total: items.length, page: 1, page_size: 50 }
    },
  })
  return queries
}

test('lists who did what, with a link to records that have a screen', async () => {
  server()
  renderPage()

  const rows = within(await screen.findByRole('region', { name: 'Audit entries' })).getAllByRole(
    'row',
  )
  expect(rows[1]).toHaveTextContent('nurse')
  expect(rows[1]).toHaveTextContent('Patient: view')
  expect(within(rows[1]!).getByRole('link', { name: 'Patient #1' })).toHaveAttribute(
    'href',
    '/patients/1',
  )
  expect(rows[2]).toHaveTextContent('Auth: login failed')
  expect(rows[2]).toHaveTextContent('username=nurse')
})

test('filters by kind of record and keeps the filter in the address', async () => {
  const queries = server()
  const user = userEvent.setup()
  renderPage()

  await screen.findByRole('region', { name: 'Audit entries' })
  await user.selectOptions(screen.getByLabelText('Kind of record'), 'Visit')

  expect(screen.getByTestId('address')).toHaveTextContent('/audit?record=visit')
  await waitFor(() => expect(queries.at(-1)?.get('entity_type')).toBe('visit'))
})

test('sends a day range as the instants the days start and end', async () => {
  const queries = server()
  renderPage('/audit?from=2026-10-01&to=2026-10-04&action=patient.view')

  await screen.findByRole('region', { name: 'Audit entries' })
  const sent = queries.at(-1)!
  expect(sent.get('action')).toBe('patient.view')
  expect(new Date(sent.get('start')!).getTime()).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).getTime())
  expect(new Date(sent.get('end')!).getTime()).toBe(new Date(2026, 9, 4, 23, 59, 59, 999).getTime())
})

test('explains an empty result and clears the filters', async () => {
  server([])
  const user = userEvent.setup()
  renderPage('/audit?action=patient')

  expect(await screen.findByText('No entry matches')).toBeInTheDocument()
  expect(screen.getByText(/typed exactly as it is recorded/)).toBeInTheDocument()

  await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!)

  expect(screen.getByTestId('address')).toHaveTextContent(/\/audit$/)
})
