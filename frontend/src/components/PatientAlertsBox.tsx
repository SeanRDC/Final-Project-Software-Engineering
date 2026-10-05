import { TriangleAlertIcon } from 'lucide-react'

import type { PatientAlerts } from '@/api/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const ALERT_LABELS: [keyof PatientAlerts, string][] = [
  ['allergies', 'Allergies'],
  ['medical_conditions', 'Medical conditions'],
  ['medication_restrictions', 'Medication restrictions'],
  ['activity_restrictions', 'Activity restrictions'],
]

/**
 * A patient's allergies, conditions and restrictions, drawn to be noticed. Shown before
 * anything else on a visit or a patient record; renders nothing when there are none.
 */
export function PatientAlertsBox({ alerts }: { alerts: PatientAlerts }) {
  const present = ALERT_LABELS.filter(([key]) => alerts[key])
  if (present.length === 0) return null

  return (
    <Alert className="border-warning/40 bg-warning-subtle text-foreground">
      <TriangleAlertIcon className="text-warning" />
      <AlertTitle>Patient alerts</AlertTitle>
      <AlertDescription className="text-foreground">
        <dl className="mt-1 flex flex-col gap-1.5">
          {present.map(([key, label]) => (
            <div key={key}>
              <dt className="inline font-medium">{label}: </dt>
              <dd className="inline">{alerts[key]}</dd>
            </div>
          ))}
        </dl>
      </AlertDescription>
    </Alert>
  )
}
