// Entries the clinic types many times a day, offered as one-tap choices.
// They come from the interview with the Clinic Coordinator; edit the lists as the clinic asks.

/** The complaints the clinic sees most, in the order the coordinator gave them. */
export const COMMON_COMPLAINTS = [
  'Headache',
  'Dizziness',
  'Colds',
  'Fever',
  'Stomach ache',
  'Wound',
  'Sprain',
]

/** What appointments are usually booked for. */
export const APPOINTMENT_REASONS = [
  'Medical clearance for OJT',
  'Medical clearance for an off-campus activity',
  'Medical clearance for varsity',
  'Consultation',
  'Follow-up',
]

/** Adds a picked complaint to what is already typed, without repeating it. */
export function addComplaint(current: string, pick: string): string {
  const typed = current.trim()
  if (!typed) return pick
  if (typed.toLowerCase().includes(pick.toLowerCase())) return current
  return `${typed}, ${pick.toLowerCase()}`
}
