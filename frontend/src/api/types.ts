// Short names for the backend's request and response shapes.
// schema.d.ts is generated from the API (npm run gen:api); do not edit it by hand.

import type { components } from '@/api/schema'

type Schemas = components['schemas']

export type Token = Schemas['Token']
export type CurrentUser = Schemas['CurrentUser']

export type PatientSummary = Schemas['PatientSummary']

export type VisitSummary = Schemas['VisitSummary']
export type VisitStatus = Schemas['VisitStatus']
export type VisitType = Schemas['VisitType']

export type Appointment = Schemas['AppointmentOut']
export type AppointmentStatus = Schemas['AppointmentStatus']
export type CalendarDay = Schemas['CalendarDay']

export type Medicine = Schemas['MedicineOut']

export type Notification = Schemas['NotificationOut']
export type NotificationList = Schemas['NotificationList']
export type NotificationType = Schemas['NotificationType']

export type Dashboard = Schemas['Dashboard']
export type DashboardStats = Schemas['DashboardStats']
