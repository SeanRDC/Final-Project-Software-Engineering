import { Route, Routes } from 'react-router'

import { AppShell } from '@/layout/AppShell'
import { CHECK_IN, PATIENTS, REGISTER_PATIENT, UPCOMING_PAGES, VISITS } from '@/layout/pages'
import { CheckInPage } from '@/pages/checkin/CheckInPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { EditPatientPage } from '@/pages/patients/EditPatientPage'
import { PatientPage } from '@/pages/patients/PatientPage'
import { PatientsPage } from '@/pages/patients/PatientsPage'
import { RegisterPatientPage } from '@/pages/patients/RegisterPatientPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { VisitPanel } from '@/pages/visits/VisitPanel'
import { VisitsPage } from '@/pages/visits/VisitsPage'
import { LoginRoute } from '@/routes/LoginRoute'
import { RequireAuth } from '@/routes/RequireAuth'
import { RequirePermission } from '@/routes/RequirePermission'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route
            path={CHECK_IN.path}
            element={
              <RequirePermission permission={CHECK_IN.permission}>
                <CheckInPage />
              </RequirePermission>
            }
          />
          <Route
            path={VISITS.path}
            element={
              <RequirePermission permission={VISITS.permission}>
                <VisitsPage />
              </RequirePermission>
            }
          >
            <Route path=":visitId" element={<VisitPanel />} />
          </Route>
          <Route
            path={PATIENTS.path}
            element={
              <RequirePermission permission={PATIENTS.permission}>
                <PatientsPage />
              </RequirePermission>
            }
          />
          <Route
            path={REGISTER_PATIENT.path}
            element={
              <RequirePermission permission={REGISTER_PATIENT.permission}>
                <RegisterPatientPage />
              </RequirePermission>
            }
          />
          <Route
            path="/patients/:patientId"
            element={
              <RequirePermission permission={PATIENTS.permission}>
                <PatientPage />
              </RequirePermission>
            }
          />
          <Route
            path="/patients/:patientId/edit"
            element={
              <RequirePermission permission={REGISTER_PATIENT.permission}>
                <EditPatientPage />
              </RequirePermission>
            }
          />
          {UPCOMING_PAGES.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={
                <RequirePermission permission={page.permission}>
                  <PlaceholderPage title={page.title} />
                </RequirePermission>
              }
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
