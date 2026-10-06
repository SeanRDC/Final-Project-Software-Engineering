import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, ReportSummary, SavedReport } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SavedReportPage } from '@/pages/reports/SavedReportPage'
import { dashboard } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const coordinator: CurrentUser = {
  ...nurse,
  id: 1,
  username: 'coordinator',
  role: 'coordinator',
  permissions: [...nurse.permissions, 'reports:generate'],
}

const summary: ReportSummary = {
  period_start: '2026-10-01',
  period_end: '2026-10-04',
  total_visits: 12,
  unique_patients: 9,
  visits_by_patient_type: [
    { label: 'student', count: 10 },
    { label: 'employee', count: 2 },
  ],
  visits_by_type: [
    { label: 'consultation', count: 8 },
    { label: 'medicine_request', count: 4 },
  ],
  visits_by_department: [{ label: 'School of Computing', count: 5 }],
  visits_by_type_and_patient_type: [
    { label: 'consultation', students: 6, employees: 2 },
    { label: 'medicine_request', students: 3, employees: 1 },
  ],
  visits_by_month: [{ label: '2026-10', count: 12 }],
  visits_by_disposition: [{ label: 'sent_home', count: 3 }],
  top_complaints: [{ label: 'Headache', count: 4 }],
  referrals: 1,
  guardian_notifications: 2,
  medicines_released: [
    { medicine_id: 3, medicine_name: 'Paracetamol 500 mg', unit: 'tablet', quantity_released: 24 },
  ],
  appointments_by_status: [{ label: 'no_show', count: 1 }],
  frequent_visitors: [
    {
      patient_id: 1,
      id_number: '20221187',
      full_name: 'Santos, Maria',
      department: 'School of Computing',
      visit_count: 3,
    },
  ],
}

const saved: SavedReport = {
  id: 3,
  title: 'First Semester, AY 2026–2027',
  period_start: '2026-08-01',
  period_end: '2026-12-15',
  generated_by_name: 'Salazar, CJ',
  created_at: '2026-10-04T02:00:00+00:00',
}

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderReports(user: CurrentUser, route: string) {
  return renderApp(
    <>
      <Routes>
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportId" element={<SavedReportPage />} />
      </Routes>
      <Address />
      <Toaster />
    </>,
    { user, route },
  )
}

function clinic(): { server: FakeServer; queries: string[] } {
  const queries: string[] = []
  const server = fakeServer({
    'GET /dashboard': dashboard,
    'GET /reports/summary': ({ url }: { url: URL }) => {
      queries.push(url.search)
      return summary
    },
    'GET /reports': [saved],
    'GET /reports/3': { ...saved, summary },
  })
  return { server, queries }
}

test('shows this month’s statistics by default, with readable labels', async () => {
  const { queries } = clinic()
  renderReports(nurse, '/reports')

  expect(await screen.findByText('Different patients')).toBeInTheDocument()
  // The clinic's today is 4 October 2026 in the fixture.
  await waitFor(() => expect(queries.at(-1)).toBe('?start=2026-10-01&end=2026-10-04'))

  const byType = within(screen.getByRole('region', { name: 'Visits by type' }))
  expect(byType.getByRole('row', { name: 'Medicine request 4' })).toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: 'Visits by outcome' })).getByText('Sent home'),
  ).toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: 'Medicine released' })).getByText('24'),
  ).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Santos, Maria' })).toHaveAttribute('href', '/patients/1')
})

test('splits each type of request between students and employees', async () => {
  clinic()
  renderReports(nurse, '/reports')

  const table = within(
    await screen.findByRole('region', { name: 'Requests by students and employees' }),
  )
  expect(table.getByRole('row', { name: 'Consultation 6 2' })).toBeInTheDocument()
  expect(table.getByRole('row', { name: 'Medicine request 3 1' })).toBeInTheDocument()
})

test('changes the period with a preset and keeps it in the address', async () => {
  const { queries } = clinic()
  const user = userEvent.setup()
  renderReports(nurse, '/reports')

  await screen.findByText('Different patients')
  await user.click(screen.getByRole('button', { name: 'Last month' }))

  expect(screen.getByTestId('address')).toHaveTextContent('/reports?from=2026-09-01&to=2026-09-30')
  await waitFor(() => expect(queries.at(-1)).toBe('?start=2026-09-01&end=2026-09-30'))
})

test('offers the semester and summer term as periods', async () => {
  const { queries } = clinic()
  const user = userEvent.setup()
  renderReports(nurse, '/reports')

  await screen.findByText('Different patients')
  await user.click(screen.getByRole('button', { name: 'Summer term' }))

  expect(screen.getByTestId('address')).toHaveTextContent('/reports?from=2026-06-01&to=2026-07-31')
  await waitFor(() => expect(queries.at(-1)).toBe('?start=2026-06-01&end=2026-07-31'))
})

test('lists saved reports; only the coordinator can save one', async () => {
  clinic()
  renderReports(nurse, '/reports')

  const list = within(await screen.findByRole('region', { name: 'Saved reports' }))
  expect(await list.findByRole('link', { name: saved.title })).toHaveAttribute('href', '/reports/3')
  expect(list.getByText(/Aug 1, 2026 – Dec 15, 2026 · saved by Salazar, CJ/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save as report' })).not.toBeInTheDocument()
})

test('the coordinator saves the period as a report and opens it', async () => {
  const { server } = clinic()
  let sent: unknown
  server.on(
    'POST /reports',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return { ...saved, summary }
    },
    201,
  )
  const user = userEvent.setup()
  renderReports(coordinator, '/reports?from=2026-08-01&to=2026-12-15')

  await user.click(await screen.findByRole('button', { name: 'Save as report' }))
  const form = within(await screen.findByRole('form', { name: 'Save report' }))
  await user.click(form.getByRole('button', { name: 'Save report' }))
  expect(form.getByText('Give the report a title.')).toBeInTheDocument()

  await user.type(form.getByLabelText('Title'), 'First Semester')
  await user.click(form.getByRole('button', { name: 'Save report' }))

  expect(await screen.findByText(/Report “First Semester.*saved/)).toBeInTheDocument()
  expect(sent).toEqual({
    title: 'First Semester',
    period_start: '2026-08-01',
    period_end: '2026-12-15',
  })
  await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent('/reports/3'))
})

test('downloads the statistics as a CSV file through the api', async () => {
  const { server } = clinic()
  server.on('GET /reports/summary.csv', 'section,label,count')
  const createObjectURL = vi.fn(() => 'blob:report')
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
  const user = userEvent.setup()
  renderReports(nurse, '/reports')

  await user.click(await screen.findByRole('button', { name: 'Download CSV' }))

  await waitFor(() => expect(server.calls).toContain('GET /reports/summary.csv'))
  await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())
})

test('opens a saved report and lets the coordinator delete it after confirmation', async () => {
  const { server } = clinic()
  server.on('DELETE /reports/3', null, 204)
  const user = userEvent.setup()
  renderReports(coordinator, '/reports/3')

  expect(await screen.findByRole('heading', { name: saved.title })).toBeInTheDocument()
  expect(screen.getByText(/The figures are as\s+they were then/)).toBeInTheDocument()
  expect(screen.getByText('Different patients')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Delete' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Delete this report?' }))
  await user.click(dialog.getByRole('button', { name: 'Delete report' }))

  expect(await screen.findByText(/Report “First Semester.*deleted/)).toBeInTheDocument()
  expect(server.calls).toContain('DELETE /reports/3')
  await waitFor(() => expect(screen.getByTestId('address')).toHaveTextContent(/\/reports$/))
})

test('a saved report offers no delete to other roles', async () => {
  clinic()
  renderReports(nurse, '/reports/3')

  await screen.findByRole('heading', { name: saved.title })
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download CSV' })).toBeInTheDocument()
})
