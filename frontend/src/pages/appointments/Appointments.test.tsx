// The appointment screens end to end: the schedule, deciding, booking and rescheduling.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { EditAppointmentPage } from '@/pages/appointments/EditAppointmentPage'
import { NewAppointmentPage } from '@/pages/appointments/NewAppointmentPage'
import { appointment, dashboard, patient } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const coordinator: CurrentUser = {
  ...nurse,
  id: 1,
  username: 'coordinator',
  full_name: 'Salazar, CJ',
  role: 'coordinator',
  job_title: 'Clinic Coordinator',
  permissions: [...nurse.permissions, 'appointments:decide'],
}

// The fixture's "today" is 4 October 2026; the clinic's day comes from the dashboard.
const TODAY = '2026-10-04'
const [completed, confirmed, pending] = dashboard.todays_appointments
const laterPending = appointment({
  id: 9,
  scheduled_date: '2026-10-12',
  start_time: '09:00:00',
  end_time: '09:30:00',
  reason: 'Dental check',
  status: 'pending',
  decided_by_name: null,
  patient: patient({ id: 5, full_name: 'Tan, Bea', id_number: '20230077' }),
})

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderAppointments(user: CurrentUser, route: string) {
  return renderApp(
    <>
      <Routes>
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/new" element={<NewAppointmentPage />} />
        <Route path="/appointments/:appointmentId/edit" element={<EditAppointmentPage />} />
        <Route path="*" element={null} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user, route },
  )
}

function clinic(): FakeServer {
  return fakeServer({
    'GET /dashboard': dashboard,
    'GET /appointments/calendar': dashboard.calendar,
    'GET /appointments/today': ({ url }: { url: URL }) =>
      url.searchParams.get('day') === TODAY ? [completed, confirmed, pending] : [],
    'GET /appointments': { items: [pending, laterPending], total: 2, page: 1, page_size: 50 },
  })
}

function row(name: string): HTMLElement {
  return screen.getByRole('link', { name }).closest('tr')!
}

// ---------- The schedule ----------

test('shows the clinic’s today with each appointment and what is pending on other days', async () => {
  clinic()
  renderAppointments(nurse, '/appointments')

  expect(
    await screen.findByRole('heading', { name: 'Sunday, October 4, 2026 · Today' }),
  ).toBeInTheDocument()
  const schedule = within(screen.getByRole('region', { name: 'Schedule' }))
  expect(await schedule.findByText('10:30–11:00 AM')).toBeInTheDocument()
  expect(schedule.getAllByRole('row')).toHaveLength(4)

  const waiting = within(screen.getByRole('region', { name: 'Waiting for the coordinator' }))
  expect(waiting.getByRole('link', { name: 'Tan, Bea' })).toBeInTheDocument()
  expect(waiting.getByRole('link', { name: 'Mon, Oct 12' })).toHaveAttribute(
    'href',
    '/appointments?date=2026-10-12',
  )
  // Today's own pending appointment is in the schedule, not repeated below.
  expect(waiting.queryByRole('link', { name: 'Miranda, Gil' })).not.toBeInTheDocument()
})

test('steps through days and keeps the day in the address', async () => {
  clinic()
  const user = userEvent.setup()
  renderAppointments(nurse, '/appointments')

  await screen.findByRole('heading', { name: /October 4, 2026/ })
  await user.click(screen.getByRole('button', { name: 'Next day' }))

  expect(screen.getByTestId('address')).toHaveTextContent('/appointments?date=2026-10-05')
  expect(await screen.findByText('No appointments on this day')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Book an appointment' })).toHaveAttribute(
    'href',
    '/appointments/new?date=2026-10-05',
  )

  await user.click(screen.getByRole('button', { name: 'Go to today' }))

  expect(screen.getByTestId('address')).toHaveTextContent(/\/appointments$/)
})

test('the front desk can check in a confirmed appointment but cannot decide', async () => {
  clinic()
  renderAppointments(nurse, '/appointments')

  await screen.findByRole('link', { name: 'Panergo, Mark' })
  expect(
    within(row('Panergo, Mark')).getByRole('button', { name: 'Check in Panergo, Mark' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Confirm appointment/ })).not.toBeInTheDocument()
  // A completed appointment offers nothing.
  expect(within(row('Villanueva, Rosa')).queryByRole('button')).not.toBeInTheDocument()
})

test('the doctor sees the schedule without any actions', async () => {
  clinic()
  renderAppointments(doctor, '/appointments')

  await screen.findByRole('link', { name: 'Panergo, Mark' })
  expect(
    within(screen.getByRole('region', { name: 'Schedule' })).queryByRole('button', {
      name: /Check in|Confirm|More/,
    }),
  ).toBeNull()
  expect(screen.queryByRole('link', { name: 'New appointment' })).not.toBeInTheDocument()
})

// ---------- Deciding ----------

test('the coordinator confirms a pending appointment', async () => {
  const server = clinic()
  server.on('POST /appointments/4/confirm', { ...pending, status: 'confirmed' })
  const user = userEvent.setup()
  renderAppointments(coordinator, '/appointments')

  await user.click(
    await screen.findByRole('button', { name: 'Confirm appointment for Miranda, Gil' }),
  )

  expect(await screen.findByText('Appointment confirmed for Miranda, Gil')).toBeInTheDocument()
  expect(server.calls).toContain('POST /appointments/4/confirm')
})

test('the coordinator cancels an appointment with a reason, after confirmation', async () => {
  const server = clinic()
  let sent: unknown
  server.on('POST /appointments/3/cancel', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return { ...confirmed, status: 'cancelled' }
  })
  const user = userEvent.setup()
  renderAppointments(coordinator, '/appointments')

  await user.click(await screen.findByRole('button', { name: 'More actions for Panergo, Mark' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Cancel appointment' }))
  const dialog = within(
    await screen.findByRole('alertdialog', { name: 'Cancel this appointment?' }),
  )
  expect(dialog.getByText(/appointment at 10:30 AM will be cancelled/)).toBeInTheDocument()
  await user.type(dialog.getByLabelText('Reason (optional)'), 'Patient asked to cancel')
  await user.click(dialog.getByRole('button', { name: 'Cancel appointment' }))

  expect(await screen.findByText('Appointment cancelled for Panergo, Mark')).toBeInTheDocument()
  expect(sent).toEqual({ reason: 'Patient asked to cancel' })
})

test('marks a confirmed appointment as a no-show and reports a refusal', async () => {
  const server = clinic()
  server.on(
    'POST /appointments/3/no-show',
    { detail: 'Only a confirmed appointment can be marked as a no-show' },
    409,
  )
  const user = userEvent.setup()
  renderAppointments(nurse, '/appointments')

  await user.click(await screen.findByRole('button', { name: 'More actions for Panergo, Mark' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Mark as no-show' }))

  expect(
    await screen.findByText('Only a confirmed appointment can be marked as a no-show'),
  ).toBeInTheDocument()
})

// ---------- Booking ----------

test('books an appointment for a chosen patient on the day in the address', async () => {
  const server = clinic()
  server.on('GET /patients', { items: [patient()], total: 1, page: 1, page_size: 8 })
  let sent: unknown
  server.on(
    'POST /appointments',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return appointment({
        id: 20,
        scheduled_date: '2026-10-12',
        status: 'pending',
        patient: patient(),
      })
    },
    201,
  )
  const user = userEvent.setup()
  renderAppointments(nurse, '/appointments/new?date=2026-10-12')

  const form = within(await screen.findByRole('form', { name: 'Appointment' }))
  await waitFor(() => expect(form.getByLabelText('Date')).toHaveValue('2026-10-12'))

  await user.click(form.getByRole('button', { name: 'Book appointment' }))
  expect(form.getByText('Choose the patient.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /appointments')

  await user.type(form.getByRole('searchbox'), 'san')
  await user.click(await form.findByRole('button', { name: /Santos, Maria/ }))
  await user.type(form.getByLabelText('Starts'), '14:00')
  expect(form.getByLabelText('Ends')).toHaveValue('14:30')
  await user.type(form.getByLabelText('Reason'), 'BP monitoring')
  await user.click(form.getByRole('button', { name: 'Book appointment' }))

  expect(await screen.findByText('Appointment booked for Santos, Maria')).toBeInTheDocument()
  expect(sent).toEqual({
    patient_id: 1,
    scheduled_date: '2026-10-12',
    start_time: '14:00',
    end_time: '14:30',
    reason: 'BP monitoring',
    notes: null,
  })
  await waitFor(() =>
    expect(screen.getByTestId('address')).toHaveTextContent('/appointments?date=2026-10-12'),
  )
})

test('starts with the patient named in the address', async () => {
  const server = clinic()
  server.on('GET /patients/1', patient())
  renderAppointments(nurse, '/appointments/new?patient=1')

  expect(await screen.findByText('Santos, Maria')).toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
})

// ---------- Rescheduling ----------

test('reschedules an appointment, warning that a confirmed one goes back for approval', async () => {
  const server = clinic()
  let sent: unknown
  server.on('PATCH /appointments/3', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return { ...confirmed, start_time: '11:00:00', end_time: '11:30:00', status: 'pending' }
  })
  const user = userEvent.setup()
  renderAppointments(nurse, `/appointments/3/edit?date=${TODAY}`)

  const form = within(await screen.findByRole('form', { name: 'Appointment' }))
  expect(form.getByText('Panergo, Mark')).toBeInTheDocument()
  expect(form.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
  expect(form.getByText(/sends it back to the Clinic Coordinator/)).toBeInTheDocument()
  expect(form.getByLabelText('Starts')).toHaveValue('10:30')

  await user.clear(form.getByLabelText('Starts'))
  await user.type(form.getByLabelText('Starts'), '11:00')
  await user.clear(form.getByLabelText('Ends'))
  await user.type(form.getByLabelText('Ends'), '11:30')
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('Appointment rescheduled for Panergo, Mark')).toBeInTheDocument()
  expect(screen.getByText(/pending again until the coordinator confirms/)).toBeInTheDocument()
  expect(sent).toEqual({ start_time: '11:00', end_time: '11:30' })
})

test('does not offer to change an appointment that is already completed', async () => {
  clinic()
  renderAppointments(nurse, `/appointments/2/edit?date=${TODAY}`)

  expect(
    await screen.findByText('This appointment is completed and can no longer be changed.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('form')).not.toBeInTheDocument()
})
