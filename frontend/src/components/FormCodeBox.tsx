import type { EducationLevel, PatientType } from '@/api/types'
import { FORM_EFFECTIVITY_DATE, FORM_REVISION, formCode } from '@/lib/formCodes'
import { cn } from '@/lib/utils'

type FormCodeBoxProps = {
  patientType: PatientType
  educationLevel: EducationLevel | null
  className?: string
}

/** The document control box of the clinic's ISO forms: code, revision and effectivity date. */
export function FormCodeBox({ patientType, educationLevel, className }: FormCodeBoxProps) {
  const code = formCode({ patient_type: patientType, education_level: educationLevel })
  return (
    <div
      role="group"
      aria-label="Form code"
      className={cn(
        'w-fit shrink-0 border border-foreground px-3 py-2 text-sm leading-snug whitespace-nowrap',
        className,
      )}
    >
      <p className="font-bold tracking-wide">{code}</p>
      <p>Revision: {FORM_REVISION}</p>
      <p>Effectivity Date: {FORM_EFFECTIVITY_DATE}</p>
    </div>
  )
}
