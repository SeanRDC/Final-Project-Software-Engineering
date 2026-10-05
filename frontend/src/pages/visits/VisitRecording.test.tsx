// The editing side of the visit panel: recording, consultation, medicine and completion.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { VisitPanel } from '@/pages/visits/VisitPanel'
import { medicine } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'
import { visitRecord } from '@/test/visitFixture'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  return <p data-testid="address">{useLocation().pathname}</p>
}

function renderPanel(user: typeof nurse) {
  return renderApp(
    <>
      <Routes>
        <Route path="/visits" element={null} />
        <Route path="/visits/:visitId" element={<VisitPanel />} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user, route: '/visits/14' },
  )
}

const paracetamol = medicine({
  id: 3,
  name: 'Paracetamol',
  strength: '500 mg',
  display_name: 'Paracetamol 500 mg',
  unit: 'tablet',
  quantity_on_hand: 30,
  is_low_stock: false,
})

type Sent = { body: unknown }

/** A server that holds one visit, grants the edit lock and records what is sent to it. */
function clinicServer(start = visitRecord()): { server: FakeServer; sent: Sent } {
  const sent: Sent = { body: undefined }
  const server = fakeServer({
    'GET /visits/14': start,
    'GET /inventory/medicines': [paracetamol, medicine({ quantity_on_hand: 0 })],
    'PUT /locks/visit/14': { locked_by_name: 'Reyes, Ana' },
  })
  server.on('DELETE /locks/visit/14', null, 204)
  const answer =
    (changes: object) =>
    ({ init }: { init: RequestInit }) => {
      sent.body = init.body ? JSON.parse(String(init.body)) : undefined
      const updated = { ...start, ...changes, ...(sent.body as object) }
      server.on('GET /visits/14', updated)
      return updated
    }
  server.on('PATCH /visits/14', answer({}))
  server.on('PATCH /visits/14/consultation', answer({ doctor_id: 4, doctor_name: 'Dr. Villareal' }))
  server.on(
    'POST /visits/14/complete',
    answer({ status: 'completed', completed_at: '2026-10-04T02:10:00+00:00' }),
  )
  return { server, sent }
}

test('the nurse records vital signs and only the changed fields are sent', async () => {
  const { server, sent } = clinicServer()
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Record' }))
  const form = within(await screen.findByRole('form', { name: 'Visit record' }))

  expect(form.getByLabelText('Temperature')).toHaveValue('36.8')
  await user.clear(form.getByLabelText('Temperature'))
  await user.type(form.getByLabelText('Temperature'), '38.2')
  await user.type(form.getByLabelText('Weight'), '52')
  await user.type(form.getByLabelText('Remarks'), 'Advised to rest')
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('Record saved for Santos, Maria')).toBeInTheDocument()
  expect(sent.body).toEqual({ temperature_c: 38.2, weight_kg: 52, remarks: 'Advised to rest' })

  // Back on the record, with the new values, and the lock given back.
  expect(await screen.findByText('38.2 °C')).toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Visit record' })).not.toBeInTheDocument()
  await waitFor(() => expect(server.calls).toContain('DELETE /locks/visit/14'))
  expect(server.calls.indexOf('PUT /locks/visit/14')).toBeLessThan(
    server.calls.indexOf('PATCH /visits/14'),
  )
})

test('flags an impossible vital sign and sends nothing', async () => {
  const { server } = clinicServer()
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Record' }))
  const form = within(await screen.findByRole('form', { name: 'Visit record' }))
  await user.clear(form.getByLabelText('Oxygen saturation'))
  await user.type(form.getByLabelText('Oxygen saturation'), '120')
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(form.getByText('Enter a value from 50 to 100.')).toBeInTheDocument()
  expect(form.getByLabelText('Oxygen saturation')).toHaveFocus()
  expect(server.calls).not.toContain('PATCH /visits/14')
})

test('cancelling the form saves nothing and releases the lock', async () => {
  const { server } = clinicServer()
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Record' }))
  const form = within(await screen.findByRole('form', { name: 'Visit record' }))
  await user.type(form.getByLabelText('Remarks'), 'Never mind')
  await user.click(form.getByRole('button', { name: 'Cancel' }))

  expect(await screen.findByText('Mild wheezing on both lungs')).toBeInTheDocument()
  expect(server.calls).not.toContain('PATCH /visits/14')
  await waitFor(() => expect(server.calls).toContain('DELETE /locks/visit/14'))
})

test('says who is editing when the record is locked, and offers the way back', async () => {
  const { server } = clinicServer()
  server.on(
    'PUT /locks/visit/14',
    { detail: 'This record is being edited by Dr. Villareal. Try again shortly.' },
    423,
  )
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Record' }))

  expect(
    await screen.findByText('This record is being edited by Dr. Villareal. Try again shortly.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('form')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Back to the record' }))

  expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument()
})

test('asks before closing the panel with unsaved changes', async () => {
  clinicServer()
  const confirm = vi.fn(() => false)
  vi.stubGlobal('confirm', confirm)
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Record' }))
  const form = within(await screen.findByRole('form', { name: 'Visit record' }))
  await user.type(form.getByLabelText('Remarks'), 'Half-written note')
  await user.click(screen.getByRole('button', { name: 'Close' }))

  expect(confirm).toHaveBeenCalledOnce()
  expect(screen.getByTestId('address')).toHaveTextContent('/visits/14')

  confirm.mockReturnValue(true)
  await user.click(screen.getByRole('button', { name: 'Close' }))

  expect(screen.getByTestId('address')).toHaveTextContent(/\/visits$/)
})

test('the doctor writes the consultation and cannot edit the nurse’s record', async () => {
  const { sent } = clinicServer()
  const user = userEvent.setup()
  renderPanel(doctor)

  expect(await screen.findByRole('button', { name: 'Consultation' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Record' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancel visit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Release medicine' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Consultation' }))
  const form = within(await screen.findByRole('form', { name: 'Consultation' }))
  await user.type(form.getByLabelText('Diagnosis'), 'Acute asthma exacerbation')
  await user.click(form.getByLabelText('Referred to a hospital or another clinic'))
  await user.type(form.getByLabelText('Referred to'), 'Angeles Medical Center')
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('Consultation saved for Santos, Maria')).toBeInTheDocument()
  expect(sent.body).toEqual({
    diagnosis: 'Acute asthma exacerbation',
    referred: true,
    referral_details: 'Angeles Medical Center',
  })
  expect(await screen.findByText('Acute asthma exacerbation')).toBeInTheDocument()
})

test('releases medicine and refuses more than is in stock', async () => {
  const { server } = clinicServer()
  let sent: unknown
  server.on(
    'POST /visits/14/medicines',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return visitRecord({
        medicines: [
          ...visitRecord().medicines,
          {
            id: 2,
            medicine_id: 3,
            medicine_name: 'Paracetamol 500 mg',
            quantity: 4,
            instructions: 'One every 6 hours',
            dispensed_by_name: 'Reyes, Ana',
            dispensed_at: '2026-10-04T02:01:00+00:00',
          },
        ],
      })
    },
    201,
  )
  const user = userEvent.setup()
  renderPanel(nurse)

  const form = within(await screen.findByRole('form', { name: 'Release medicine' }))
  await screen.findByRole('option', { name: 'Paracetamol 500 mg (30 tablet left)' })
  expect(form.getByRole('option', { name: /Mefenamic Acid 500 mg \(0/ })).toBeDisabled()

  await user.click(form.getByRole('button', { name: 'Release medicine' }))
  expect(form.getByText('Choose the medicine.')).toBeInTheDocument()

  await user.selectOptions(form.getByLabelText('Medicine'), 'Paracetamol 500 mg (30 tablet left)')
  await user.clear(form.getByLabelText('Quantity'))
  await user.type(form.getByLabelText('Quantity'), '31')
  await user.click(form.getByRole('button', { name: 'Release medicine' }))
  expect(form.getByText('Only 30 tablet left in stock.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /visits/14/medicines')

  await user.clear(form.getByLabelText('Quantity'))
  await user.type(form.getByLabelText('Quantity'), '4')
  await user.type(form.getByLabelText('Instructions (optional)'), 'One every 6 hours')
  await user.click(form.getByRole('button', { name: 'Release medicine' }))

  expect(await screen.findByText('4 × Paracetamol 500 mg released')).toBeInTheDocument()
  expect(sent).toEqual({ medicine_id: 3, quantity: 4, instructions: 'One every 6 hours' })
  expect(await screen.findByText('One every 6 hours')).toBeInTheDocument()
  expect(form.getByLabelText('Quantity')).toHaveValue('1')
})

test('undoes a mistaken release after confirmation', async () => {
  const { server } = clinicServer()
  server.on('DELETE /visits/14/medicines/1', visitRecord({ medicines: [] }))
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Undo release of Salbutamol 2 mg' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Undo this release?' }))
  expect(dialog.getByText(/2 × Salbutamol 2 mg will be removed/)).toBeInTheDocument()
  await user.click(dialog.getByRole('button', { name: 'Return to stock' }))

  expect(await screen.findByText('2 × Salbutamol 2 mg returned to stock')).toBeInTheDocument()
  expect(server.calls).toContain('DELETE /visits/14/medicines/1')
  await waitFor(() => expect(screen.queryByText('Salbutamol 2 mg')).not.toBeInTheDocument())
})

test('completes the visit with its outcome, after which it can only be corrected', async () => {
  const { sent } = clinicServer()
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Complete visit' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Complete this visit?' }))
  await user.selectOptions(dialog.getByLabelText('Outcome'), 'Sent home')
  await user.click(dialog.getByRole('button', { name: 'Complete visit' }))

  expect(await screen.findByText('Visit completed for Santos, Maria')).toBeInTheDocument()
  expect(sent.body).toEqual({ disposition: 'sent_home' })

  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  expect(await screen.findByRole('button', { name: 'Correct record' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Complete visit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancel visit' })).not.toBeInTheDocument()
  expect(screen.getByText('Sent home')).toBeInTheDocument()
})

test('a cancelled visit offers no way to change it', async () => {
  clinicServer(visitRecord({ status: 'cancelled', cancelled_reason: 'Wrong patient' }))
  renderPanel(nurse)

  expect(await screen.findByText('Wrong patient')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /Record|Complete|Cancel visit|Undo/ }),
  ).not.toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Release medicine' })).not.toBeInTheDocument()
})
