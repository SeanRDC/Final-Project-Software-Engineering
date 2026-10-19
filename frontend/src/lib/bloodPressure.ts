// Blood pressure typed as one value, "120/80", and the two numbers the API stores.

export type BloodPressure = { systolic: number; diastolic: number }

// The limits are the ones the API enforces (backend/app/schemas/visit.py).
const SYSTOLIC = { min: 40, max: 300 }
const DIASTOLIC = { min: 20, max: 200 }
const READING = /^(\d+)\/(\d+)$/

/** Turns a space into the slash as it is typed: "120 " -> "120/", "120 / 80" -> "120/80". */
export function tidyBloodPressure(text: string): string {
  const tidy = text
    .trim()
    .replace(/\s*\/\s*|\s+/g, '/')
    .replace(/\/{2,}/g, '/')
  // A space typed after the first number stands for the slash.
  const endsInSpace = text !== text.trimEnd()
  return endsInSpace && tidy && !tidy.includes('/') ? `${tidy}/` : tidy
}

/** The two numbers of a complete reading, or null when the box is empty or unfinished. */
export function parseBloodPressure(text: string): BloodPressure | null {
  const match = READING.exec(tidyBloodPressure(text).replace(/\/$/, ''))
  if (!match) return null
  return { systolic: Number(match[1]), diastolic: Number(match[2]) }
}

/** What is wrong with the typed reading, or undefined when it is fine or left empty. */
export function bloodPressureError(text: string): string | undefined {
  if (!text.trim()) return undefined
  const reading = parseBloodPressure(text)
  if (!reading) return 'Enter both numbers, e.g. 120/80.'
  const { systolic, diastolic } = reading
  if (systolic < SYSTOLIC.min || systolic > SYSTOLIC.max) {
    return `The systolic value goes from ${SYSTOLIC.min} to ${SYSTOLIC.max}.`
  }
  if (diastolic < DIASTOLIC.min || diastolic > DIASTOLIC.max) {
    return `The diastolic value goes from ${DIASTOLIC.min} to ${DIASTOLIC.max}.`
  }
  if (systolic <= diastolic) return 'The first number (systolic) should be higher than the second.'
  return undefined
}

/** "120/80", or empty when either number is missing. */
export function formatBloodPressure(systolic: number | null, diastolic: number | null): string {
  return systolic === null || diastolic === null ? '' : `${systolic}/${diastolic}`
}
