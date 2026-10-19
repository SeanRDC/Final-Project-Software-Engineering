// The Archive page: archived records for everyone, restoring them for the coordinator.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, PatientSummary } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { ArchivePage } from '@/pages/patients/ArchivePage'
import { patient } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { patientRecord } from '@/test/patientFixture'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const coordinator: CurrentUser = {
  ...nurse,
  id: 1,
  username: 'coordinator',
  full_name: 'Salazar, CJ',
  role: 'coordinator',
  permissions: [...nurse.permissions, 'patients:archive'],
}

const archived: PatientSummary = patient({
  id: 7,
  id_number: '20190233',
  last_name: 'Aquino',
  first_name: 'Leo',
  full_name: 'Aquino, Leo',
  is_archived: true,
  archived_at: '2026-10-12T02:30:00+00:00',
  archived_by_name: 'Salazar, CJ',
})

function page(items: PatientSummary[]) {
  return { items, total: items.length, page: 1, page_size: 20 }
}

function renderArchive(user: CurrentUser) {
  return renderApp(
    <>
      <Routes>
        <Route path="/patients/archive" element={<ArchivePage />} />
      </Routes>
      <Toaster />
    </>,
    { user, route: '/patients/archive' },
  )
}

test('lists archived records with who archived them and when', async () => {
  const queries: URLSearchParams[] = []
  fakeServer({
    'GET /patients': ({ url }: { url: URL }) => {
      queries.push(url.searchParams)
      return page([archived])
    },
  })
  renderArchive(nurse)

  const list = within(await screen.findByRole('region', { name: 'Archived patients' }))
  const row = list.getByRole('row', { name: /Aquino, Leo/ })
  expect(row).toHaveTextContent('20190233')
  expect(row).toHaveTextContent('Oct 12, 2026')
  expect(row).toHaveTextContent('Salazar, CJ')
  expect(within(row).getByRole('link', { name: 'Aquino, Leo' })).toHaveAttribute(
    'href',
    '/patients/7',
  )
  expect(queries[0]?.get('archived_only')).toBe('true')
  // Only the coordinator restores records.
  expect(within(row).queryByRole('button', { name: /Restore/ })).not.toBeInTheDocument()
})

test('searches the archive', async () => {
  const queries: URLSearchParams[] = []
  fakeServer({
    'GET /patients': ({ url }: { url: URL }) => {
      queries.push(url.searchParams)
      return page([archived])
    },
  })
  const user = userEvent.setup()
  renderArchive(nurse)

  await screen.findByRole('region', { name: 'Archived patients' })
  await user.type(screen.getByRole('searchbox', { name: 'Search the archive' }), 'aquino{Enter}')

  await waitFor(() => expect(queries.at(-1)?.get('q')).toBe('aquino'))
  expect(queries.at(-1)?.get('archived_only')).toBe('true')
})

test('the coordinator restores a record after confirmation', async () => {
  const server = fakeServer({ 'GET /patients': page([archived]) })
  server.on('POST /patients/7/restore', () => {
    server.on('GET /patients', page([]))
    return patientRecord({ id: 7, full_name: 'Aquino, Leo' })
  })
  const user = userEvent.setup()
  renderArchive(coordinator)

  const list = within(await screen.findByRole('region', { name: 'Archived patients' }))
  await user.click(list.getByRole('button', { name: 'Restore Aquino, Leo' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Restore this record?' }))
  await user.click(dialog.getByRole('button', { name: 'Restore record' }))

  expect(await screen.findByText('Aquino, Leo’s record restored')).toBeInTheDocument()
  expect(server.calls).toContain('POST /patients/7/restore')
  expect(await screen.findByText('No archived patients')).toBeInTheDocument()
})

test('says so when nothing is archived', async () => {
  fakeServer({ 'GET /patients': page([]) })
  renderArchive(nurse)

  expect(await screen.findByText('No archived patients')).toBeInTheDocument()
})
