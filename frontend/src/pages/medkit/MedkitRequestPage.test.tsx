// One kit loan: issuing the kit from stock, taking it back, a lost kit and a withdrawn request.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, Medicine, MedkitRequest } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { MedkitRequestPage } from '@/pages/medkit/MedkitRequestPage'
import { doctor, nurse } from '@/test/fixtures'
import { contents, kit, medkitRequest } from '@/test/medkitFixture'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const gauze: Medicine = {
  id: 20,
  name: 'Gauze',
  strength: '',
  display_name: 'Gauze',
  form: 'pack',
  unit: 'pack',
  quantity_on_hand: 10,
  low_stock_threshold: 5,
  is_low_stock: false,
  expiry_date: null,
  is_active: true,
  updated_at: '2026-10-01T00:00:00+00:00',
}

const issued: MedkitRequest = medkitRequest({
  status: 'issued',
  medkit: { id: 3, kit_number: 3, label: 'Grey box' },
  issued_at: '2026-10-04T01:00:00+00:00',
  issued_by_name: 'Reyes, Ana',
  items: [
    {
      id: 31,
      medicine_id: 11,
      medicine_name: 'Loperamide 2 mg',
      unit: 'capsule',
      quantity_issued: 10,
      quantity_returned: null,
      quantity_used: null,
    },
    {
      id: 32,
      medicine_id: 20,
      medicine_name: 'Gauze',
      unit: 'pack',
      quantity_issued: 2,
      quantity_returned: null,
      quantity_used: null,
    },
  ],
})

function clinic(request: MedkitRequest) {
  return fakeServer({
    'GET /medkit-requests/2': request,
    'GET /medkits': [kit(), kit({ id: 4, kit_number: 4, label: null, status: 'out' })],
    'GET /medkits/template': contents,
    'GET /inventory/medicines': [gauze],
  })
}

function renderRequest(user: CurrentUser) {
  return renderApp(
    <>
      <Routes>
        <Route path="/medkit/requests/:requestId" element={<MedkitRequestPage />} />
      </Routes>
      <Toaster />
    </>,
    { user, route: '/medkit/requests/2' },
  )
}

function body(init: RequestInit) {
  return JSON.parse(String(init.body)) as unknown
}

test('shows the request as the clinic form records it', async () => {
  clinic(medkitRequest())
  renderRequest(nurse)

  expect(await screen.findByRole('heading', { name: 'Intramurals 2026' })).toBeInTheDocument()
  const details = within(screen.getByRole('region', { name: 'Request' }))
  expect(details.getByText('Junior Philippine Computer Society')).toBeInTheDocument()
  expect(details.getByText('Dela Cruz, Juan')).toBeInTheDocument()
  expect(details.getByText('0917 555 0100')).toBeInTheDocument()
  expect(screen.getByText('Requested')).toBeInTheDocument()
})

test('issues a kit from its standard contents plus another item', async () => {
  const server = clinic(medkitRequest())
  let sent: unknown
  server.on('POST /medkit-requests/2/issue', ({ init }: { init: RequestInit }) => {
    sent = body(init)
    return issued
  })
  const user = userEvent.setup()
  renderRequest(nurse)

  await user.click(await screen.findByRole('button', { name: 'Issue kit' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Issue a medical kit' }))
  // Only an available kit can be chosen.
  const kits = dialog.getByLabelText('Kit')
  expect(within(kits).queryByRole('option', { name: /Kit #4/ })).not.toBeInTheDocument()
  expect(dialog.getByLabelText('Quantity of Loperamide 2 mg')).toHaveValue('10')

  await user.clear(dialog.getByLabelText('Quantity of Loperamide 2 mg'))
  await user.type(dialog.getByLabelText('Quantity of Loperamide 2 mg'), '12')
  await user.click(dialog.getByRole('checkbox', { name: 'Put Paracetamol 500 mg in the kit' }))
  await user.selectOptions(dialog.getByLabelText('Other item'), 'Gauze')
  await user.click(dialog.getByRole('button', { name: 'Add item' }))
  await user.clear(dialog.getByLabelText('Quantity of Gauze'))
  await user.type(dialog.getByLabelText('Quantity of Gauze'), '2')
  await user.click(dialog.getByRole('button', { name: 'Issue kit' }))

  expect(await screen.findByText('Kit #3 issued for Intramurals 2026')).toBeInTheDocument()
  expect(sent).toEqual({
    medkit_id: 3,
    items: [
      { medicine_id: 11, quantity: 12 },
      { medicine_id: 20, quantity: 2 },
    ],
  })
})

test('will not issue more than is on hand', async () => {
  const server = clinic(medkitRequest())
  const user = userEvent.setup()
  renderRequest(nurse)

  await user.click(await screen.findByRole('button', { name: 'Issue kit' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Issue a medical kit' }))
  await user.clear(dialog.getByLabelText('Quantity of Loperamide 2 mg'))
  await user.type(dialog.getByLabelText('Quantity of Loperamide 2 mg'), '41')
  await user.click(dialog.getByRole('button', { name: 'Issue kit' }))

  expect(dialog.getByText('Only 40 capsule on hand.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /medkit-requests/2/issue')
})

test('takes a kit back, counting each item, and shows what was used', async () => {
  const server = clinic(issued)
  let sent: unknown
  server.on('POST /medkit-requests/2/return', ({ init }: { init: RequestInit }) => {
    sent = body(init)
    return { ...issued, status: 'returned' }
  })
  const user = userEvent.setup()
  renderRequest(nurse)

  const contentsCard = within(await screen.findByRole('region', { name: 'Kit contents' }))
  expect(contentsCard.getByRole('row', { name: /Loperamide 2 mg 10/ })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Take back kit' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Take back Kit #3' }))
  await user.click(dialog.getByRole('button', { name: 'Returned complete' }))
  expect(dialog.getByLabelText('Loperamide 2 mg returned')).toHaveValue('10')
  await user.clear(dialog.getByLabelText('Loperamide 2 mg returned'))
  await user.type(dialog.getByLabelText('Loperamide 2 mg returned'), '6')
  expect(dialog.getByText('4 used')).toBeInTheDocument()
  await user.click(dialog.getByRole('button', { name: 'Return to stock' }))

  expect(await screen.findByText('Kit #3 is back')).toBeInTheDocument()
  expect(sent).toEqual({
    items: [
      { item_id: 31, quantity_returned: 6 },
      { item_id: 32, quantity_returned: 2 },
    ],
    notes: null,
  })
})

test('marks a kit lost after confirmation', async () => {
  const server = clinic(issued)
  let sent: unknown
  server.on('POST /medkit-requests/2/lost', ({ init }: { init: RequestInit }) => {
    sent = body(init)
    return { ...issued, status: 'lost' }
  })
  const user = userEvent.setup()
  renderRequest(nurse)

  await user.click(await screen.findByRole('button', { name: 'Mark lost' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Mark Kit #3 lost?' }))
  expect(dialog.getByText(/replaced by the person responsible/)).toBeInTheDocument()
  await user.type(dialog.getByLabelText('What happened (optional)'), 'Left at the venue')
  await user.click(dialog.getByRole('button', { name: 'Mark lost' }))

  await waitFor(() => expect(sent).toEqual({ notes: 'Left at the venue' }))
})

test('withdraws a request that was not issued', async () => {
  const server = clinic(medkitRequest())
  server.on('POST /medkit-requests/2/cancel', medkitRequest({ status: 'cancelled' }))
  const user = userEvent.setup()
  renderRequest(nurse)

  await user.click(await screen.findByRole('button', { name: 'Cancel request' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Cancel this request?' }))
  await user.click(dialog.getByRole('button', { name: 'Cancel request' }))

  await waitFor(() => expect(server.calls).toContain('POST /medkit-requests/2/cancel'))
})

test('an issued kit can be printed on the dispensary form', async () => {
  clinic(issued)
  renderRequest(nurse)

  expect(await screen.findByRole('link', { name: 'Print form' })).toHaveAttribute(
    'href',
    '/print/medkit/2',
  )
})

test('the doctor reads the loan but cannot act on it', async () => {
  clinic(issued)
  renderRequest(doctor)

  await screen.findByRole('region', { name: 'Kit contents' })
  expect(screen.queryByRole('button', { name: 'Take back kit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Mark lost' })).not.toBeInTheDocument()
})
