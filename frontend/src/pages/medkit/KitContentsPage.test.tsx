// The standard contents of a kit: what is filled in when a kit is issued.

import { focusManager } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, Medicine } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { KitContentsPage } from '@/pages/medkit/KitContentsPage'
import { nurse } from '@/test/fixtures'
import { contents } from '@/test/medkitFixture'
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

const loratadine: Medicine = {
  id: 13,
  name: 'Loratadine',
  strength: '10 mg',
  display_name: 'Loratadine 10 mg',
  form: 'tablet',
  unit: 'tablet',
  quantity_on_hand: 70,
  low_stock_threshold: 15,
  is_low_stock: false,
  expiry_date: null,
  is_active: true,
  updated_at: '2026-10-01T00:00:00+00:00',
}

function renderContents(user: CurrentUser) {
  return renderApp(
    <>
      <Routes>
        <Route path="/medkit/contents" element={<KitContentsPage />} />
      </Routes>
      <Toaster />
    </>,
    { user, route: '/medkit/contents' },
  )
}

test('lists what a kit carries, with what is on hand', async () => {
  fakeServer({ 'GET /medkits/template': contents })
  renderContents(nurse)

  const list = within(await screen.findByRole('region', { name: 'Standard kit contents' }))
  expect(list.getByRole('row', { name: /Loperamide 2 mg/ })).toHaveTextContent('10 capsule')
  expect(list.getByRole('row', { name: /Loperamide 2 mg/ })).toHaveTextContent('40')
  expect(screen.queryByRole('button', { name: 'Save contents' })).not.toBeInTheDocument()
})

test('the coordinator changes, reorders, adds and removes lines, then saves', async () => {
  const server = fakeServer({
    'GET /medkits/template': contents,
    'GET /inventory/medicines': [loratadine],
  })
  let sent: unknown
  server.on('PUT /medkits/template', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return contents
  })
  const user = userEvent.setup()
  renderContents(coordinator)

  const list = within(await screen.findByRole('region', { name: 'Standard kit contents' }))
  await user.clear(list.getByLabelText('How many Paracetamol 500 mg'))
  await user.type(list.getByLabelText('How many Paracetamol 500 mg'), '30')
  await user.click(list.getByRole('button', { name: 'Move Paracetamol 500 mg up' }))
  await user.selectOptions(screen.getByLabelText('Add to the kit'), 'Loratadine 10 mg')
  await user.click(screen.getByRole('button', { name: 'Add' }))
  await user.click(list.getByRole('button', { name: 'Remove Loperamide 2 mg' }))
  await user.click(screen.getByRole('button', { name: 'Save contents' }))

  expect(await screen.findByText('Kit contents saved')).toBeInTheDocument()
  expect(sent).toEqual([
    { medicine_id: 12, default_quantity: 30 },
    { medicine_id: 13, default_quantity: 10 },
  ])
})

test('a quantity must be a whole number of 1 or more', async () => {
  const server = fakeServer({ 'GET /medkits/template': contents, 'GET /inventory/medicines': [] })
  const user = userEvent.setup()
  renderContents(coordinator)

  const list = within(await screen.findByRole('region', { name: 'Standard kit contents' }))
  await user.clear(list.getByLabelText('How many Loperamide 2 mg'))
  await user.click(screen.getByRole('button', { name: 'Save contents' }))

  expect(list.getByText('Enter 1 or more.')).toBeInTheDocument()
  await waitFor(() => expect(server.calls).not.toContain('PUT /medkits/template'))
})

test('a stock change elsewhere does not wipe the coordinator’s unsaved edits', async () => {
  let fetches = 0
  fakeServer({
    'GET /medkits/template': () => {
      fetches += 1
      // A medicine released at the front desk changes what is on hand.
      return fetches === 1 ? contents : contents.map((line) => ({ ...line, quantity_on_hand: 1 }))
    },
    'GET /inventory/medicines': [],
  })
  const user = userEvent.setup()
  renderContents(coordinator)

  const list = within(await screen.findByRole('region', { name: 'Standard kit contents' }))
  await user.clear(list.getByLabelText('How many Paracetamol 500 mg'))
  await user.type(list.getByLabelText('How many Paracetamol 500 mg'), '30')

  // The live update refetches the contents, as a returning window does.
  focusManager.setFocused(false)
  focusManager.setFocused(true)
  await waitFor(() => expect(fetches).toBe(2))

  expect(
    within(screen.getByRole('region', { name: 'Standard kit contents' })).getByLabelText(
      'How many Paracetamol 500 mg',
    ),
  ).toHaveValue('30')
})
