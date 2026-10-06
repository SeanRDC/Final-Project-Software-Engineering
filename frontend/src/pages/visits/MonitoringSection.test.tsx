import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { VitalReading } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { VisitPanel } from '@/pages/visits/VisitPanel'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'
import { visitRecord } from '@/test/visitFixture'

const earlier: VitalReading = {
  id: 7,
  taken_at: '2026-10-04T02:30:00+00:00',
  temperature_c: 38.6,
  bp_systolic: null,
  bp_diastolic: null,
  pulse_rate: 104,
  respiratory_rate: null,
  oxygen_saturation: null,
  note: 'Resting in the ward',
  recorded_by_name: 'Reyes, Ana',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPanel(user: typeof nurse) {
  return renderApp(
    <>
      <Routes>
        <Route path="/visits/:visitId" element={<VisitPanel />} />
      </Routes>
      <Toaster />
    </>,
    { user, route: '/visits/14' },
  )
}

test('the nurse adds a reading with only the values that were taken', async () => {
  const start = visitRecord()
  let sent: unknown
  const server = fakeServer({ 'GET /visits/14': start, 'GET /inventory/medicines': [] })
  server.on(
    'POST /visits/14/vitals',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return { ...start, vital_readings: [{ ...earlier, note: null, pulse_rate: null }] }
    },
    201,
  )
  const user = userEvent.setup()
  renderPanel(nurse)

  await user.click(await screen.findByRole('button', { name: 'Add reading' }))
  const form = within(screen.getByRole('form', { name: 'Add reading' }))

  // Nothing entered is refused before anything is sent.
  await user.click(form.getByRole('button', { name: 'Save reading' }))
  expect(form.getByText('Enter at least one vital sign.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /visits/14/vitals')

  await user.type(form.getByLabelText('Temperature'), '38.6')
  await user.click(form.getByRole('button', { name: 'Save reading' }))

  expect(await screen.findByText('Reading added for Santos, Maria')).toBeInTheDocument()
  expect(sent).toEqual({ temperature_c: 38.6, note: null })
  expect(screen.getByText('38.6 °C')).toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Add reading' })).not.toBeInTheDocument()
})

test('a reading recorded by mistake can be removed after confirming', async () => {
  const start = visitRecord({ vital_readings: [earlier] })
  const server = fakeServer({ 'GET /visits/14': start, 'GET /inventory/medicines': [] })
  server.on('DELETE /visits/14/vitals/7', { ...start, vital_readings: [] })
  const user = userEvent.setup()
  renderPanel(nurse)

  expect(await screen.findByText('38.6 °C · 104 bpm')).toBeInTheDocument()
  expect(screen.getByText('Resting in the ward')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /Remove the reading taken at/ }))
  await user.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove reading' }),
  )

  expect(await screen.findByText('Reading removed')).toBeInTheDocument()
  expect(screen.getByText('No readings after the first vital signs.')).toBeInTheDocument()
})

test('the doctor reads the readings but cannot add or remove them', async () => {
  fakeServer({ 'GET /visits/14': visitRecord({ vital_readings: [earlier] }) })
  renderPanel(doctor)

  expect(await screen.findByText('38.6 °C · 104 bpm')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add reading' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Remove the reading/ })).not.toBeInTheDocument()
})
