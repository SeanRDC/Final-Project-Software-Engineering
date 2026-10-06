import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'

import type { Permission } from '@/auth/permissions'
import { AppShell } from '@/layout/AppShell'
import {
  APPOINTMENTS,
  AUDIT_LOG,
  CHANGE_PASSWORD,
  CHECK_IN,
  INVENTORY,
  NEW_APPOINTMENT,
  NOTIFICATIONS,
  PATIENTS,
  REGISTER_PATIENT,
  RELEASE_LOG,
  REPORTS,
  USERS,
  VISITS,
} from '@/layout/pages'
import { ChangePasswordPage } from '@/pages/account/ChangePasswordPage'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { EditAppointmentPage } from '@/pages/appointments/EditAppointmentPage'
import { NewAppointmentPage } from '@/pages/appointments/NewAppointmentPage'
import { AuditLogPage } from '@/pages/audit/AuditLogPage'
import { CheckInPage } from '@/pages/checkin/CheckInPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { ReleaseLogPage } from '@/pages/inventory/ReleaseLogPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { EditPatientPage } from '@/pages/patients/EditPatientPage'
import { PatientPage } from '@/pages/patients/PatientPage'
import { PatientsPage } from '@/pages/patients/PatientsPage'
import { RegisterPatientPage } from '@/pages/patients/RegisterPatientPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SavedReportPage } from '@/pages/reports/SavedReportPage'
import { UsersPage } from '@/pages/users/UsersPage'
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

          <Route path={INVENTORY.path} element={guarded(INVENTORY.permission, <InventoryPage />)} />
          <Route
            path={RELEASE_LOG.path}
            element={guarded(RELEASE_LOG.permission, <ReleaseLogPage />)}
          />
          <Route path={NOTIFICATIONS.path} element={<NotificationsPage />} />

          <Route path={REPORTS.path} element={guarded(REPORTS.permission, <ReportsPage />)} />
          <Route
            path="/reports/:reportId"
            element={guarded(REPORTS.permission, <SavedReportPage />)}
          />
          <Route path={USERS.path} element={guarded(USERS.permission, <UsersPage />)} />
          <Route path={AUDIT_LOG.path} element={guarded(AUDIT_LOG.permission, <AuditLogPage />)} />
          <Route path={CHANGE_PASSWORD.path} element={<ChangePasswordPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
