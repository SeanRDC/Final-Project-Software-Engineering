import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'

import type { Permission } from '@/auth/permissions'
import { AppShell } from '@/layout/AppShell'
import {
  APPOINTMENTS,
  CHECK_IN,
  NEW_APPOINTMENT,
  PATIENTS,
  REGISTER_PATIENT,
  UPCOMING_PAGES,
  VISITS,
} from '@/layout/pages'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { EditAppointmentPage } from '@/pages/appointments/EditAppointmentPage'
import { NewAppointmentPage } from '@/pages/appointments/NewAppointmentPage'
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

/** A screen shown only to accounts with the permission, also when its address is typed by hand. */
function guarded(permission: Permission | undefined, screen: ReactNode) {
  return <RequirePermission permission={permission}>{screen}</RequirePermission>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path={CHECK_IN.path} element={guarded(CHECK_IN.permission, <CheckInPage />)} />

          <Route path={VISITS.path} element={guarded(VISITS.permission, <VisitsPage />)}>
            <Route path=":visitId" element={<VisitPanel />} />
          </Route>

          <Route path={PATIENTS.path} element={guarded(PATIENTS.permission, <PatientsPage />)} />
          <Route
            path={REGISTER_PATIENT.path}
            element={guarded(REGISTER_PATIENT.permission, <RegisterPatientPage />)}
          />
          <Route
            path="/patients/:patientId"
            element={guarded(PATIENTS.permission, <PatientPage />)}
          />
          <Route
            path="/patients/:patientId/edit"
            element={guarded(REGISTER_PATIENT.permission, <EditPatientPage />)}
          />

          <Route
            path={APPOINTMENTS.path}
            element={guarded(APPOINTMENTS.permission, <AppointmentsPage />)}
          />
          <Route
            path={NEW_APPOINTMENT.path}
            element={guarded(NEW_APPOINTMENT.permission, <NewAppointmentPage />)}
          />
          <Route
            path="/appointments/:appointmentId/edit"
            element={guarded(NEW_APPOINTMENT.permission, <EditAppointmentPage />)}
          />

          {UPCOMING_PAGES.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={guarded(page.permission, <PlaceholderPage title={page.title} />)}
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
