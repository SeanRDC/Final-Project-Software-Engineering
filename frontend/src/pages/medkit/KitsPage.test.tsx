// The numbered medical kits: where each one is, and the coordinator's upkeep of them.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { KitsPage } from '@/pages/medkit/KitsPage'
import { nurse } from '@/test/fixtures'
import { kit } from '@/test/medkitFixture'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const coordinator: CurrentUser = {
  ...nurse,
  id: 1,
  role: 'coordinator',
  permissions: [...nurse.permissions, 'medkits:manage'],
}

const kits = [
  kit({ id: 1, kit_number: 1, label: 'Red bag' }),
  kit({
    id: 2,
    kit_number: 2,
    label: 'Blue bag',
    status: 'out',
    current_request: {
      id: 7,
      organization: 'Junior Philippine Computer Society',
      activity: 'Intramurals 2026',
      activity_date: '2026-10-05',
      person_responsible: 'Dela Cruz, Juan',
      issued_at: '2026-10-04T01:00:00+00:00',
      is_overdue: true,
    },
  }),
  kit({ id: 3, kit_number: 3, label: null, status: 'lost' }),
]

function renderKits(user: CurrentUser) {
  return renderApp(
    <>
      <Routes>
        <Route path="/medkit/kits" element={<KitsPage />} />
      </Routes>
      <Toaster />
    </>,
    { user, route: '/medkit/kits' },
  )
}

test('shows each kit, where it is and who has it', async () => {
  fakeServer({ 'GET /medkits': kits })
  renderKits(nurse)

  const list = within(await screen.findByRole('region', { name: 'Medical kits' }))
  expect(list.getByRole('row', { name: /Kit #1/ })).toHaveTextContent('Available')
  const out = list.getByRole('row', { name: /Kit #2/ })
  expect(out).toHaveTextContent('Overdue')
  expect(out).toHaveTextContent('Dela Cruz, Juan')
  expect(within(out).getByRole('link', { name: 'Intramurals 2026' })).toHaveAttribute(
    'href',
    '/medkit/requests/7',
  )
  expect(list.getByRole('row', { name: /Kit #3/ })).toHaveTextContent('Lost')
  // Only the coordinator looks after the kits themselves.
  expect(screen.queryByRole('button', { name: 'Add kit' })).not.toBeInTheDocument()
})

test('the coordinator adds a kit', async () => {
  const server = fakeServer({ 'GET /medkits': kits })
  let sent: unknown
  server.on(
    'POST /medkits',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return kit({ id: 4, kit_number: 4, label: 'Grey box' })
    },
    201,
  )
  const user = userEvent.setup()
  renderKits(coordinator)

  await user.click(await screen.findByRole('button', { name: 'Add kit' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Add a medical kit' }))
  expect(dialog.getByLabelText('Kit number')).toHaveValue('4')
  await user.type(dialog.getByLabelText('Label (optional)'), 'Grey box')
  await user.click(dialog.getByRole('button', { name: 'Add kit' }))

  expect(await screen.findByText('Kit #4 added')).toBeInTheDocument()
  expect(sent).toEqual({ kit_number: 4, label: 'Grey box' })
})

test('the coordinator puts a replaced lost kit back in service', async () => {
  const server = fakeServer({ 'GET /medkits': kits })
  let sent: unknown
  server.on('PATCH /medkits/3', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return kit({ id: 3, kit_number: 3, label: null })
  })
  const user = userEvent.setup()
  renderKits(coordinator)

  const list = within(await screen.findByRole('region', { name: 'Medical kits' }))
  await user.click(list.getByRole('button', { name: 'Kit #3 replaced' }))
  const dialog = within(
    await screen.findByRole('alertdialog', { name: 'Put Kit #3 back in service?' }),
  )
  await user.click(dialog.getByRole('button', { name: 'Back in service' }))

  await waitFor(() => expect(sent).toEqual({ status: 'available' }))
})

test('the coordinator retires an available kit', async () => {
  const server = fakeServer({ 'GET /medkits': kits })
  let sent: unknown
  server.on('PATCH /medkits/1', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return kit({ id: 1, kit_number: 1, is_active: false })
  })
  const user = userEvent.setup()
  renderKits(coordinator)

  const list = within(await screen.findByRole('region', { name: 'Medical kits' }))
  await user.click(list.getByRole('button', { name: 'Retire Kit #1' }))
  await waitFor(() => expect(sent).toEqual({ is_active: false }))
})
