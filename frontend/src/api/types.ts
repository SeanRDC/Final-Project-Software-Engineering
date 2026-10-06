// Short names for the backend's request and response shapes.
// schema.d.ts is generated from the API (npm run gen:api); do not edit it by hand.

import type { components } from '@/api/schema'

type Schemas = components['schemas']

export type Token = Schemas['Token']
export type CurrentUser = Schemas['CurrentUser']

export type PatientSummary = Schemas['PatientSummary']
export type Patient = Schemas['PatientDetail']
export type PatientRecord = Schemas['PatientOut']
export type PatientCreate = Schemas['PatientCreate']
export type PatientUpdate = Schemas['PatientUpdate']
export type PatientType = Schemas['PatientType']
export type Sex = Schemas['Sex']
export type PatientAlerts = Schemas['PatientAlerts']
export type PatientPage = Schemas['Page_PatientSummary_']

export type VisitSummary = Schemas['VisitSummary']
export type Visit = Schemas['VisitOut']
export type VisitMedicine = Schemas['VisitMedicineOut']
export type VitalReading = Schemas['VitalReadingOut']
export type VitalReadingCreate = Schemas['VitalReadingCreate']
export type CheckInRequest = Schemas['CheckIn']
export type VisitRecordUpdate = Schemas['VisitRecordUpdate']
export type ConsultationUpdate = Schemas['ConsultationUpdate']
export type DispenseRequest = Schemas['DispenseMedicine']
export type VisitDisposition = Schemas['VisitDisposition']
export type LockInfo = Schemas['LockInfo']
export type VisitListItem = Schemas['VisitListItem']
export type VisitPage = Schemas['Page_VisitListItem_']
export type VisitStatus = Schemas['VisitStatus']
export type VisitType = Schemas['VisitType']

export type Appointment = Schemas['AppointmentOut']
export type AppointmentCreate = Schemas['AppointmentCreate']
export type AppointmentUpdate = Schemas['AppointmentUpdate']
export type AppointmentPage = Schemas['Page_AppointmentOut_']
export type AppointmentStatus = Schemas['AppointmentStatus']
export type CalendarDay = Schemas['CalendarDay']

export type Medicine = Schemas['MedicineOut']
export type MedicineCreate = Schemas['MedicineCreate']
export type MedicineUpdate = Schemas['MedicineUpdate']
export type StockMovement = Schemas['StockMovementOut']
export type StockMovementPage = Schemas['Page_StockMovementOut_']
export type StockMovementType = Schemas['StockMovementType']

export type Notification = Schemas['NotificationOut']
export type NotificationList = Schemas['NotificationList']
export type NotificationType = Schemas['NotificationType']

export type Dashboard = Schemas['Dashboard']
export type DashboardStats = Schemas['DashboardStats']

export type Options = Schemas['Options']

export type User = Schemas['UserOut']
export type UserCreate = Schemas['UserCreate']
export type UserUpdate = Schemas['UserUpdate']
export type Role = Schemas['Role']

export type ReportSummary = Schemas['ReportSummary']
export type SavedReport = Schemas['ReportOut']
export type SavedReportDetail = Schemas['ReportDetail']
export type ReportCreate = Schemas['ReportCreate']
export type CountItem = Schemas['CountItem']
export type TypeByPatientType = Schemas['TypeByPatientType']

export type AuditEntry = Schemas['AuditLogOut']
export type AuditPage = Schemas['Page_AuditLogOut_']

export type Attachment = Schemas['AttachmentOut']
