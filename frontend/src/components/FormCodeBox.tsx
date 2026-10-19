import type { EducationLevel, PatientType } from '@/api/types'
import { FORM_EFFECTIVITY_DATE, FORM_REVISION, formCode } from '@/lib/formCodes'
import { cn } from '@/lib/utils'

/** Either the kind of patient, whose record form it is, or the code of another form. */
type FormCodeBoxProps = (
  | { patientType: PatientType; educationLevel: EducationLevel | null; code?: never }
  | { code: string; patientType?: never; educationLevel?: never }
) & { className?: string }

/** The document control box of the clinic's ISO forms: code, revision and effectivity date. */
export function FormCodeBox({ patientType, educationLevel, code, className }: FormCodeBoxProps) {
  const shown =
    code ?? formCode({ patient_type: patientType, education_level: educationLevel ?? null })
  return (
    <div
      role="group"
      aria-label="Form code"
      className={cn(
        'w-fit shrink-0 border border-foreground px-3 py-2 text-sm leading-snug whitespace-nowrap',
        className,
      )}
    >
      <p className="font-bold tracking-wide">{shown}</p>
      <p>Revision: {FORM_REVISION}</p>
      <p>Effectivity Date: {FORM_EFFECTIVITY_DATE}</p>
    </div>
  )
}
