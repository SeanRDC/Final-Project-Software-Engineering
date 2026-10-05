import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { VisitPanel } from '@/pages/visits/VisitPanel'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'
import { visitRecord } from '@/test/visitFixture'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderPanel(options: Parameters<typeof renderApp>[1]) {
  return renderApp(
    <>
      <Routes>
        <Route path="/visits" element={null} />
        <Route path="/visits/:visitId" element={<VisitPanel />} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    options,
  )
}

test('shows the patient’s alerts and everything recorded on the visit', async () => {
  fakeServer({ 'GET /visits/14': visitRecord() })
  renderPanel({ user: nurse, route: '/visits/14' })

  const panel = within(await screen.findByRole('dialog', { name: /Santos, Maria/ }))

  expect(panel.getByText('Patient alerts').closest('[role="alert"]')).toHaveTextContent(
    'Allergies: Penicillin',
  )
  expect(panel.getByText('Difficulty breathing')).toBeInTheDocument()
  expect(panel.getByText('110/70 mmHg')).toBeInTheDocument()
  expect(panel.getByText('95%')).toBeInTheDocument()
  expect(panel.queryByText('Weight')).not.toBeInTheDocument()
  expect(panel.getByText('Mild wheezing on both lungs')).toBeInTheDocument()
  expect(panel.getByText('The guardian was notified.')).toBeInTheDocument()
  expect(panel.getByText('No consultation on this visit.')).toBeInTheDocument()
  expect(panel.getByText('Salbutamol 2 mg')).toBeInTheDocument()
})

test('says who is editing a locked record', async () => {
  fakeServer({
    'GET /visits/14': visitRecord({
      lock: {
        resource_type: 'visit',
        resource_id: 14,
        locked_by_id: 4,
        locked_by_name: 'Dr. Villareal',
        locked_at: '2026-10-04T01:59:00+00:00',
        expires_at: '2026-10-04T02:04:00+00:00',
      },
    }),
  })
  renderPanel({ user: nurse, route: '/visits/14' })

  expect(await screen.findByText('Being edited by Dr. Villareal')).toBeInTheDocument()
})

test('closing the panel returns to the log with its filter', async () => {
  fakeServer({ 'GET /visits/14': visitRecord() })
  const user = userEvent.setup()
  renderPanel({ user: nurse, route: '/visits/14?status=open' })

  await screen.findByRole('dialog', { name: /Santos, Maria/ })
  await user.click(screen.getByRole('button', { name: 'Close' }))

  expect(screen.getByTestId('address')).toHaveTextContent('/visits?status=open')
})

test('cancels an open visit after confirmation, with the reason', async () => {
  const server = fakeServer({ 'GET /visits/14': visitRecord() })
  let sent: unknown
  server.on('POST /visits/14/cancel', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    const cancelled = visitRecord({ status: 'cancelled', cancelled_reason: 'Wrong patient' })
    // From now on the server reports the visit as cancelled.
    server.on('GET /visits/14', cancelled)
    return cancelled
  })
  const user = userEvent.setup()
  renderPanel({ user: nurse, route: '/visits/14' })

  await user.click(await screen.findByRole('button', { name: 'Cancel visit' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Cancel this visit?' }))
  await user.type(dialog.getByLabelText('Reason (optional)'), 'Wrong patient')
  await user.click(dialog.getByRole('button', { name: 'Cancel visit' }))

  expect(await screen.findByText('Visit cancelled for Santos, Maria')).toBeInTheDocument()
  expect(sent).toEqual({ reason: 'Wrong patient' })
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  expect(screen.getByText('Wrong patient')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancel visit' })).not.toBeInTheDocument()
})

test('keeps the dialog open and explains when the server refuses to cancel', async () => {
  const server = fakeServer({ 'GET /visits/14': visitRecord() })
  server.on(
    'POST /visits/14/cancel',
    {
      detail: 'Medicines were already given during this visit. Complete it instead of cancelling.',
    },
    409,
  )
  const user = userEvent.setup()
  renderPanel({ user: nurse, route: '/visits/14' })

  await user.click(await screen.findByRole('button', { name: 'Cancel visit' }))
  const dialog = within(await screen.findByRole('alertdialog'))
  await user.click(dialog.getByRole('button', { name: 'Cancel visit' }))

  expect(await dialog.findByRole('alert')).toHaveTextContent('Medicines were already given')
})

test('does not offer cancelling to the doctor or on a finished visit', async () => {
  fakeServer({ 'GET /visits/14': visitRecord() })
  renderPanel({ user: doctor, route: '/visits/14' })

  await screen.findByRole('dialog', { name: /Santos, Maria/ })
  expect(screen.queryByRole('button', { name: 'Cancel visit' })).not.toBeInTheDocument()
})

test('explains a visit number that does not exist', async () => {
  const server = fakeServer()
  server.on('GET /visits/999', { detail: 'Visit not found' }, 404)
  renderPanel({ user: nurse, route: '/visits/999' })

  expect(await screen.findByRole('dialog', { name: 'Visit not found' })).toBeInTheDocument()
})
