import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { WalkInForm } from '@/pages/checkin/WalkInForm'
import { patient, visit } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  return <p data-testid="address">{useLocation().pathname}</p>
}

function renderForm() {
  return renderApp(
    <>
      <Routes>
        <Route path="/check-in" element={<WalkInForm />} />
        <Route path="*" element={null} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user: nurse, route: '/check-in' },
  )
}

function serverWithSantos(): FakeServer {
  return fakeServer({
    'GET /patients': { items: [patient()], total: 1, page: 1, page_size: 8 },
  })
}

async function pickSantos(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('searchbox'), 'san')
  await user.click(await screen.findByRole('button', { name: /Santos, Maria/ }))
}

test('checks in the chosen patient and opens the new visit', async () => {
  const server = serverWithSantos()
  let sent: unknown
  server.on(
    'POST /visits',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return { ...visit({ id: 31 }), patient_alerts: {} }
    },
    201,
  )
  const user = userEvent.setup()
  renderForm()

  await pickSantos(user)
  expect(screen.getByLabelText('Complaint')).toHaveFocus()
  await user.type(screen.getByLabelText('Complaint'), '  Headache since morning ')
  await user.selectOptions(screen.getByLabelText('Type of visit'), 'Medicine request')
  await user.click(screen.getByRole('button', { name: 'Check in patient' }))

  expect(await screen.findByText('Santos, Maria checked in')).toBeInTheDocument()
  expect(sent).toEqual({
    patient_id: 1,
    complaint: 'Headache since morning',
    visit_type: 'medicine_request',
  })
  expect(screen.getByTestId('address')).toHaveTextContent('/visits/31')
})

test('asks for the complaint before sending anything', async () => {
  const server = serverWithSantos()
  const user = userEvent.setup()
  renderForm()

  await pickSantos(user)
  await user.click(screen.getByRole('button', { name: 'Check in patient' }))

  expect(screen.getByText('Enter the patient’s complaint.')).toBeInTheDocument()
  expect(screen.getByLabelText('Complaint')).toHaveFocus()
  expect(server.calls).not.toContain('POST /visits')
})

test('links to the visit the patient already has open', async () => {
  const server = serverWithSantos()
  server.on(
    'POST /visits',
    { detail: 'Santos, Maria already has an open visit today', visit_id: 14 },
    409,
  )
  const user = userEvent.setup()
  renderForm()

  await pickSantos(user)
  await user.type(screen.getByLabelText('Complaint'), 'Dizziness')
  await user.click(screen.getByRole('button', { name: 'Check in patient' }))

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Santos, Maria already has an open visit today')
  expect(screen.getByRole('link', { name: 'Open that visit' })).toHaveAttribute(
    'href',
    '/visits/14',
  )
  expect(screen.getByTestId('address')).toHaveTextContent('/check-in')
})

test('lets the wrong patient be changed and forgets what was typed for them', async () => {
  serverWithSantos()
  const user = userEvent.setup()
  renderForm()

  await pickSantos(user)
  await user.type(screen.getByLabelText('Complaint'), 'Dizziness')
  await user.selectOptions(screen.getByLabelText('Type of visit'), 'Treatment')
  await user.click(screen.getByRole('button', { name: 'Change' }))

  expect(screen.getByRole('searchbox', { name: 'Find the patient' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Complaint')).not.toBeInTheDocument()

  await pickSantos(user)

  expect(screen.getByLabelText('Complaint')).toHaveValue('')
  expect(screen.getByLabelText('Type of visit')).toHaveValue('consultation')
})
