// The patient screens end to end: the list, a record, registering, correcting, archiving.

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { EditPatientPage } from '@/pages/patients/EditPatientPage'
import { PatientPage } from '@/pages/patients/PatientPage'
import { PatientsPage } from '@/pages/patients/PatientsPage'
import { RegisterPatientPage } from '@/pages/patients/RegisterPatientPage'
import { patient } from '@/test/dashboardFixture'
import { doctor, nurse } from '@/test/fixtures'
import { patientRecord } from '@/test/patientFixture'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'
import { visitRecord } from '@/test/visitFixture'

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
  permissions: [...nurse.permissions, 'patients:archive', 'visits:consult'],
}

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderPatients(user: CurrentUser, route: string) {
  return renderApp(
    <>
      <Routes>
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/new" element={<RegisterPatientPage />} />
        <Route path="/patients/:patientId" element={<PatientPage />} />
        <Route path="/patients/:patientId/edit" element={<EditPatientPage />} />
        <Route path="*" element={null} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user, route },
  )
}

const page = (items: unknown[], total = items.length) => ({
  items,
  total,
  page: 1,
  page_size: 20,
})

const lim = patient({
  id: 3,
  full_name: 'Lim, Joseph',
  id_number: 'EMP-0031',
  patient_type: 'employee',
  age: 42,
  sex: 'male',
  department: 'Registrar',
})

// ---------- The list ----------

test('lists patients and sends the search and filters to the server', async () => {
  const queries: string[] = []
  fakeServer({
    'GET /patients': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return url.searchParams.get('patient_type') === 'employee'
        ? page([lim])
        : page([patient(), lim])
    },
  })
  const user = userEvent.setup()
  renderPatients(nurse, '/patients?q=a')

  const list = await screen.findByRole('region', { name: 'Patients' })
  expect(
    within(list)
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['Santos, Maria', 'Lim, Joseph'])
  expect(screen.getByRole('searchbox')).toHaveValue('a')
  expect(screen.getByRole('link', { name: 'Lim, Joseph' })).toHaveAttribute('href', '/patients/3')
  expect(queries[0]).toBe('?q=a&page=1&page_size=20')

  await user.click(screen.getByRole('radio', { name: 'Employees' }))

  await waitFor(() => expect(screen.queryByRole('link', { name: 'Santos, Maria' })).toBeNull())
  expect(screen.getByTestId('address')).toHaveTextContent('/patients?q=a&type=employee')
  expect(queries.at(-1)).toBe('?q=a&patient_type=employee&page=1&page_size=20')
})

test('a new search starts from the first page', async () => {
  fakeServer({ 'GET /patients': page([patient()], 45) })
  const user = userEvent.setup()
  renderPatients(nurse, '/patients?page=2')

  await screen.findByText('Showing 21–40 of 45 patients')
  await user.type(screen.getByRole('searchbox'), 'santos{Enter}')

  expect(screen.getByTestId('address')).toHaveTextContent('/patients?q=santos')
  expect(await screen.findByText('Showing 1–20 of 45 patients')).toBeInTheDocument()
})

test('moves between pages and marks archived records', async () => {
  fakeServer({ 'GET /patients': page([patient({ is_archived: true })], 45) })
  const user = userEvent.setup()
  renderPatients(nurse, '/patients?archived=1')

  expect(await screen.findByText('Archived')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Include archived records' })).toBeChecked()

  await user.click(screen.getByRole('button', { name: 'Next' }))

  expect(screen.getByTestId('address')).toHaveTextContent('/patients?archived=1&page=2')
})

test('explains an empty result and clears the filters', async () => {
  fakeServer({ 'GET /patients': page([]) })
  const user = userEvent.setup()
  renderPatients(nurse, '/patients?q=zzz&type=student')

  expect(await screen.findByText('No patient matches')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))

  expect(screen.getByTestId('address')).toHaveTextContent(/\/patients$/)
})

// ---------- A record ----------

test('shows the record with its alerts and visit history', async () => {
  fakeServer({
    'GET /patients/1': patientRecord(),
    'GET /patients/1/visits': {
      ...page([
        visitRecord({
          status: 'completed',
          diagnosis: 'Mild asthma attack',
          disposition: 'sent_home',
        }),
      ]),
      page_size: 10,
    },
  })
  renderPatients(nurse, '/patients/1')

  expect(await screen.findByRole('heading', { name: 'Santos, Maria' })).toBeInTheDocument()
  expect(screen.getByText('3 visits · last on October 4, 2026')).toBeInTheDocument()
  expect(screen.getByText('Patient alerts').closest('[role="alert"]')).toHaveTextContent(
    'Allergies: Penicillin',
  )
  expect(screen.getByText('March 14, 2006')).toBeInTheDocument()
  expect(screen.getByText('Santos, Elena')).toBeInTheDocument()
  expect(screen.getByText('Signed form on file')).toBeInTheDocument()

  const history = within(await screen.findByRole('region', { name: 'Visit history' }))
  expect(await history.findByRole('link', { name: 'Oct 4, 2026' })).toHaveAttribute(
    'href',
    '/visits/14',
  )
  expect(history.getByText('Mild asthma attack')).toBeInTheDocument()
  expect(history.getByText('Sent home')).toBeInTheDocument()

  expect(screen.getByRole('link', { name: 'Check in' })).toHaveAttribute(
    'href',
    '/check-in?patient=1',
  )
  expect(screen.getByRole('link', { name: 'Edit record' })).toHaveAttribute(
    'href',
    '/patients/1/edit',
  )
  expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
})

test('the doctor can read and edit a record but not check in', async () => {
  fakeServer({ 'GET /patients/1': patientRecord(), 'GET /patients/1/visits': page([]) })
  renderPatients(doctor, '/patients/1')

  expect(await screen.findByRole('heading', { name: 'Santos, Maria' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Edit record' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Check in' })).not.toBeInTheDocument()
  expect(
    await screen.findByText('This patient has not visited the clinic yet.'),
  ).toBeInTheDocument()
})

test('the coordinator archives a record after confirmation and can restore it', async () => {
  const server = fakeServer({
    'GET /patients/1': patientRecord(),
    'GET /patients/1/visits': page([]),
  })
  server.on('POST /patients/1/archive', () => {
    server.on('GET /patients/1', patientRecord({ is_archived: true }))
    return patientRecord({ is_archived: true })
  })
  server.on('POST /patients/1/restore', () => {
    server.on('GET /patients/1', patientRecord())
    return patientRecord()
  })
  const user = userEvent.setup()
  renderPatients(coordinator, '/patients/1')

  await user.click(await screen.findByRole('button', { name: 'Archive' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Archive this record?' }))
  expect(dialog.getByText(/Nothing is\s+deleted/)).toBeInTheDocument()
  await user.click(dialog.getByRole('button', { name: 'Archive record' }))

  expect(await screen.findByText('Santos, Maria’s record archived')).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Restore record' })).toBeInTheDocument()
  // An archived patient cannot be checked in.
  expect(screen.queryByRole('link', { name: 'Check in' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Restore record' }))

  expect(await screen.findByText('Santos, Maria’s record restored')).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Archive' })).toBeInTheDocument()
})

test('explains a record number that does not exist', async () => {
  const server = fakeServer()
  server.on('GET /patients/999', { detail: 'Patient not found' }, 404)
  renderPatients(nurse, '/patients/999')

  expect(await screen.findByText('Patient not found')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Back to patients' })).toHaveAttribute(
    'href',
    '/patients',
  )
})

// ---------- Registering ----------

test('registers a patient and opens the new record', async () => {
  const server = fakeServer({ 'GET /options': { departments: ['School of Computing'] } })
  let sent: Record<string, unknown> = {}
  server.on(
    'POST /patients',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body)) as Record<string, unknown>
      return patientRecord({ id: 12, full_name: 'Dela Cruz, Juan' })
    },
    201,
  )
  const user = userEvent.setup()
  renderPatients(nurse, '/patients/new')

  const form = within(screen.getByRole('form', { name: 'Patient record' }))
  await user.click(form.getByRole('button', { name: 'Register patient' }))
  expect(form.getByText('Enter the student number.')).toBeInTheDocument()
  expect(form.getByLabelText('Student number')).toHaveFocus()
  expect(server.calls).not.toContain('POST /patients')

  await user.type(form.getByLabelText('Student number'), '20261234')
  await user.type(form.getByLabelText('Last name'), 'Dela Cruz')
  await user.type(form.getByLabelText('First name'), 'Juan')
  await user.selectOptions(form.getByLabelText('Sex'), 'Male')
  await user.type(form.getByLabelText('Allergies'), 'Peanuts')
  await user.click(form.getByLabelText('The signed data privacy consent form is on file'))
  await user.click(form.getByRole('button', { name: 'Register patient' }))

  expect(await screen.findByText('Dela Cruz, Juan registered')).toBeInTheDocument()
  expect(sent).toMatchObject({
    patient_type: 'student',
    id_number: '20261234',
    last_name: 'Dela Cruz',
    first_name: 'Juan',
    sex: 'male',
    allergies: 'Peanuts',
    consent_on_file: true,
    middle_name: null,
  })
  expect(screen.getByTestId('address')).toHaveTextContent('/patients/12')
})

test('shows why the server refused a registration and keeps what was typed', async () => {
  const server = fakeServer({ 'GET /options': { departments: [] } })
  server.on('POST /patients', { detail: "A patient with ID number '20261234' already exists" }, 409)
  const user = userEvent.setup()
  renderPatients(nurse, '/patients/new')

  const form = within(screen.getByRole('form', { name: 'Patient record' }))
  await user.selectOptions(form.getByLabelText('Patient type'), 'Employee')
  await user.type(form.getByLabelText('Employee number'), '20261234')
  await user.type(form.getByLabelText('Last name'), 'Dela Cruz')
  await user.type(form.getByLabelText('First name'), 'Juan')
  await user.click(form.getByRole('button', { name: 'Register patient' }))

  expect(await form.findByRole('alert')).toHaveTextContent(
    "A patient with ID number '20261234' already exists",
  )
  expect(form.getByLabelText('Last name')).toHaveValue('Dela Cruz')
})

// ---------- Correcting ----------

test('corrects a record under the edit lock and sends only what changed', async () => {
  const server = fakeServer({
    'GET /options': { departments: [] },
    'GET /patients/1': patientRecord(),
    'PUT /locks/patient/1': { locked_by_name: 'Reyes, Ana' },
  })
  server.on('DELETE /locks/patient/1', null, 204)
  let sent: unknown
  server.on('PATCH /patients/1', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return patientRecord({ contact_number: '0917 555 0000' })
  })
  const user = userEvent.setup()
  renderPatients(nurse, '/patients/1/edit')

  const form = within(await screen.findByRole('form', { name: 'Patient record' }))
  expect(form.getByLabelText('Last name')).toHaveValue('Santos')
  expect(form.getByLabelText('Blood type')).toHaveValue('O+')

  await user.clear(form.getByLabelText('Contact number', { selector: '#contact_number' }))
  await user.type(
    form.getByLabelText('Contact number', { selector: '#contact_number' }),
    '0917 555 0000',
  )
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('Record saved for Santos, Maria')).toBeInTheDocument()
  expect(sent).toEqual({ contact_number: '0917 555 0000' })
  await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent(/\/patients\/1$/))
  expect(server.calls.indexOf('PUT /locks/patient/1')).toBeLessThan(
    server.calls.indexOf('PATCH /patients/1'),
  )
  await waitFor(() => expect(server.calls).toContain('DELETE /locks/patient/1'))
})

test('does not open the form while someone else is editing the record', async () => {
  const server = fakeServer({
    'GET /options': { departments: [] },
    'GET /patients/1': patientRecord(),
  })
  server.on(
    'PUT /locks/patient/1',
    { detail: 'This record is being edited by Dr. Villareal. Try again shortly.' },
    423,
  )
  renderPatients(nurse, '/patients/1/edit')

  expect(
    await screen.findByText('This record is being edited by Dr. Villareal. Try again shortly.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('form')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Back to the record' })).toHaveAttribute(
    'href',
    '/patients/1',
  )
})
