// The inventory and the release log end to end.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, StockMovement } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { ReleaseLogPage } from '@/pages/inventory/ReleaseLogPage'
import { dashboard, medicine } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const mefenamic = medicine()
const paracetamol = medicine({
  id: 3,
  name: 'Paracetamol',
  display_name: 'Paracetamol 500 mg',
  form: 'tablet',
  unit: 'tablet',
  quantity_on_hand: 120,
  is_low_stock: false,
  expiry_date: '2026-10-20',
})
const retired = medicine({
  id: 8,
  name: 'Amoxicillin',
  display_name: 'Amoxicillin 250 mg',
  quantity_on_hand: 0,
  is_active: false,
  is_low_stock: true,
  expiry_date: '2026-09-01',
})

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderInventory(user: CurrentUser, route: string) {
  return renderApp(
    <>
      <Routes>
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/releases" element={<ReleaseLogPage />} />
        <Route path="*" element={null} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user, route },
  )
}

function pharmacy(): { server: FakeServer; queries: string[] } {
  const queries: string[] = []
  const server = fakeServer({
    'GET /dashboard': dashboard,
    'GET /inventory/medicines': ({ url }: { url: URL }) => {
      queries.push(url.search)
      if (url.searchParams.get('low_stock_only')) return [mefenamic]
      return url.searchParams.get('include_inactive')
        ? [retired, mefenamic, paracetamol]
        : [mefenamic, paracetamol]
    },
  })
  return { server, queries }
}

function row(name: string): HTMLElement {
  return screen.getByText(name).closest('tr')!
}

// ---------- The inventory ----------

test('lists medicines with stock, status and expiry warnings', async () => {
  pharmacy()
  renderInventory(nurse, '/inventory?inactive=1')

  await screen.findByText('Mefenamic Acid 500 mg')
  expect(row('Mefenamic Acid 500 mg')).toHaveTextContent('18 capsule')
  expect(row('Mefenamic Acid 500 mg')).toHaveTextContent('Low stock')
  expect(row('Paracetamol 500 mg')).toHaveTextContent('In stock')
  // The clinic's today is 4 October 2026 in the fixture.
  expect(row('Paracetamol 500 mg')).toHaveTextContent('Oct 20, 2026 · 16 days')
  expect(row('Amoxicillin 250 mg')).toHaveTextContent('Not in use')
  expect(row('Amoxicillin 250 mg')).toHaveTextContent('Sep 1, 2026 · expired')
  expect(screen.getByText('1 medicine is at or below the low-stock threshold.')).toBeInTheDocument()
})

test('filters by low stock through the server and keeps the filter in the address', async () => {
  const { queries } = pharmacy()
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory')

  await screen.findByText('Paracetamol 500 mg')
  await user.click(screen.getByRole('checkbox', { name: 'Low stock only' }))

  await waitFor(() => expect(screen.queryByText('Paracetamol 500 mg')).not.toBeInTheDocument())
  expect(screen.getByTestId('address')).toHaveTextContent('/inventory?low=1')
  expect(queries.at(-1)).toBe('?low_stock_only=true')
})

test('the doctor can look but not change anything', async () => {
  pharmacy()
  renderInventory(doctor, '/inventory')

  await screen.findByText('Paracetamol 500 mg')
  expect(screen.queryByRole('button', { name: /Stock in|Adjust|Edit|Add medicine/ })).toBeNull()
  expect(screen.getByRole('link', { name: 'Release log' })).toHaveAttribute(
    'href',
    '/inventory/releases',
  )
})

test('adds a medicine with its opening stock', async () => {
  const { server } = pharmacy()
  let sent: unknown
  server.on(
    'POST /inventory/medicines',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return medicine({ id: 11, display_name: 'Cetirizine 10 mg' })
    },
    201,
  )
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory')

  await user.click(await screen.findByRole('button', { name: 'Add medicine' }))
  const form = within(await screen.findByRole('form', { name: 'Add medicine' }))
  await user.click(form.getByRole('button', { name: 'Add medicine' }))
  expect(form.getByText('Enter the medicine’s name.')).toBeInTheDocument()

  await user.type(form.getByLabelText('Name'), 'Cetirizine')
  await user.type(form.getByLabelText('Strength'), '10 mg')
  await user.clear(form.getByLabelText('Opening stock'))
  await user.type(form.getByLabelText('Opening stock'), '90')
  await user.click(form.getByRole('button', { name: 'Add medicine' }))

  expect(await screen.findByText('Cetirizine 10 mg added to the inventory')).toBeInTheDocument()
  expect(sent).toEqual({
    name: 'Cetirizine',
    strength: '10 mg',
    form: null,
    unit: 'tablet',
    low_stock_threshold: 20,
    expiry_date: null,
    quantity_on_hand: 90,
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('records a delivery and shows what the stock will be', async () => {
  const { server } = pharmacy()
  let sent: unknown
  server.on('POST /inventory/medicines/5/stock-in', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return medicine({ quantity_on_hand: 68, is_low_stock: false })
  })
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory')

  await user.click(await screen.findByRole('button', { name: 'Stock in Mefenamic Acid 500 mg' }))
  const form = within(await screen.findByRole('form', { name: 'Stock in' }))
  await user.click(form.getByRole('button', { name: 'Add stock' }))
  expect(form.getByText('Enter a whole number of 1 or more.')).toBeInTheDocument()

  await user.type(form.getByLabelText('Quantity delivered (capsule)'), '50')
  expect(form.getByText('Stock will be 68 capsule.')).toBeInTheDocument()
  await user.click(form.getByRole('button', { name: 'Add stock' }))

  expect(await screen.findByText('50 capsule added to Mefenamic Acid 500 mg')).toBeInTheDocument()
  expect(sent).toEqual({ quantity: 50, reason: null })
})

test('a count that differs from the records needs a reason', async () => {
  const { server } = pharmacy()
  let sent: unknown
  server.on('POST /inventory/medicines/5/adjust', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return medicine({ quantity_on_hand: 15 })
  })
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory')

  await user.click(
    await screen.findByRole('button', { name: 'Adjust count of Mefenamic Acid 500 mg' }),
  )
  const form = within(await screen.findByRole('form', { name: 'Adjust count' }))
  const quantity = form.getByLabelText('Counted quantity (capsule)')
  expect(quantity).toHaveValue('18')
  await user.clear(quantity)
  await user.type(quantity, '15')
  expect(form.getByText('−3 capsule compared with the records.')).toBeInTheDocument()

  await user.click(form.getByRole('button', { name: 'Save count' }))
  expect(form.getByText('Say why the count differs.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /inventory/medicines/5/adjust')

  await user.type(form.getByLabelText('Reason'), 'Three capsules damaged')
  await user.click(form.getByRole('button', { name: 'Save count' }))

  expect(await screen.findByText('Mefenamic Acid 500 mg set to 15 capsule')).toBeInTheDocument()
  expect(sent).toEqual({ new_quantity: 15, reason: 'Three capsules damaged' })
})

test('edits a medicine and can take it out of use', async () => {
  const { server } = pharmacy()
  let sent: Record<string, unknown> = {}
  server.on('PATCH /inventory/medicines/5', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body)) as Record<string, unknown>
    return medicine({ is_active: false })
  })
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory')

  await user.click(await screen.findByRole('button', { name: 'Edit Mefenamic Acid 500 mg' }))
  const form = within(await screen.findByRole('form', { name: 'Edit medicine' }))
  expect(form.getByLabelText('Name')).toHaveValue('Mefenamic Acid')
  expect(form.queryByLabelText('Opening stock')).not.toBeInTheDocument()

  await user.clear(form.getByLabelText('Low-stock threshold'))
  await user.type(form.getByLabelText('Low-stock threshold'), '30')
  await user.click(form.getByLabelText('In use (can be released to patients)'))
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('Mefenamic Acid 500 mg updated')).toBeInTheDocument()
  expect(sent).toMatchObject({ low_stock_threshold: 30, is_active: false })
  expect(sent).not.toHaveProperty('quantity_on_hand')
})

// ---------- The release log ----------

const release: StockMovement = {
  id: 40,
  medicine_id: 3,
  medicine_name: 'Paracetamol 500 mg',
  movement_type: 'release',
  quantity_change: -4,
  balance_after: 116,
  visit_id: 14,
  patient_name: 'Santos, Maria',
  patient_id_number: '20221187',
  reason: 'Released to Santos, Maria',
  performed_by_name: 'Reyes, Ana',
  created_at: '2026-10-04T02:01:00+00:00',
}
const delivery: StockMovement = {
  ...release,
  id: 41,
  movement_type: 'stock_in',
  quantity_change: 50,
  balance_after: 166,
  visit_id: null,
  patient_name: null,
  patient_id_number: null,
  reason: 'Delivery from the supplier',
}

test('lists releases with the patient and a link to the visit', async () => {
  const queries: string[] = []
  fakeServer({
    'GET /inventory/movements': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return { items: [release], total: 1, page: 1, page_size: 25 }
    },
  })
  renderInventory(nurse, '/inventory/releases')

  const log = within(await screen.findByRole('region', { name: 'Stock movements' }))
  expect(log.getByText('Paracetamol 500 mg')).toBeInTheDocument()
  expect(log.getByText('−4')).toBeInTheDocument()
  expect(log.getByRole('link', { name: 'Santos, Maria' })).toHaveAttribute('href', '/visits/14')
  expect(log.getByText('Showing 1–1 of 1 releases')).toBeInTheDocument()
  expect(queries[0]).toBe('?movement_type=release&page=1&page_size=25')
})

test('switches to every kind of movement and filters by date', async () => {
  const queries: string[] = []
  fakeServer({
    'GET /inventory/movements': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return { items: [delivery, release], total: 2, page: 1, page_size: 25 }
    },
  })
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory/releases?from=2026-10-01')

  await screen.findByRole('region', { name: 'Stock movements' })
  expect(queries[0]).toContain('start=2026-10-01')

  await user.click(screen.getByRole('radio', { name: 'All movements' }))

  expect(await screen.findByText('+50')).toBeInTheDocument()
  expect(screen.getByText('Delivery from the supplier')).toBeInTheDocument()
  expect(screen.getByText('Stock in', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
  expect(screen.getByTestId('address')).toHaveTextContent(
    '/inventory/releases?from=2026-10-01&type=all',
  )
  expect(queries.at(-1)).not.toContain('movement_type')
})

test('says so when nothing was released between the dates', async () => {
  fakeServer({ 'GET /inventory/movements': { items: [], total: 0, page: 1, page_size: 25 } })
  const user = userEvent.setup()
  renderInventory(nurse, '/inventory/releases?from=2026-10-01&to=2026-10-02')

  expect(await screen.findByText('No medicine was released')).toBeInTheDocument()
  expect(screen.getByText('Nothing was recorded between these dates.')).toBeInTheDocument()

  await user.click(screen.getAllByRole('button', { name: 'Clear dates' })[0]!)

  expect(screen.getByTestId('address')).toHaveTextContent(/\/inventory\/releases$/)
})
