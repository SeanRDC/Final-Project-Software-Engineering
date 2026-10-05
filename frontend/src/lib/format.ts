// Turns the API's dates, times and enum values into what staff read on screen.

/** "medicine_request" -> "Medicine request". */
export function humanize(value: string): string {
  const words = value.replaceAll('_', ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Parses "2026-10-04" as a local calendar day, not as midnight UTC. */
export function parseDay(day: string): Date {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

/** Formats a local date as "2026-10-04", the form the API uses for days. */
export function toDayString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function clockParts(time: string): { hour: number; minute: string; meridiem: 'AM' | 'PM' } {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return {
    hour: hours % 12 === 0 ? 12 : hours % 12,
    minute: String(minutes).padStart(2, '0'),
    meridiem: hours < 12 ? 'AM' : 'PM',
  }
}

/** "14:00:00" -> "2:00 PM". */
export function formatClock(time: string): string {
  const { hour, minute, meridiem } = clockParts(time)
  return `${hour}:${minute} ${meridiem}`
}

/** "09:00:00", "09:30:00" -> "9:00–9:30 AM". The first AM/PM is dropped when both match. */
export function formatTimeRange(start: string, end: string): string {
  const from = clockParts(start)
  const to = clockParts(end)
  const fromText =
    from.meridiem === to.meridiem
      ? `${from.hour}:${from.minute}`
      : `${from.hour}:${from.minute} ${from.meridiem}`
  return `${fromText}–${to.hour}:${to.minute} ${to.meridiem}`
}

/** Whole minutes from one moment to another, never negative. */
export function minutesBetween(from: string | Date, to: string | Date): number {
  const elapsed = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(0, Math.floor(elapsed / 60_000))
}

/** 6 -> "6 min", 70 -> "1 h 10 min", 120 -> "2 h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** How long ago something happened, kept short for lists: "now", "6m", "2h", "3d". */
export function formatAgo(from: string | Date, now: Date): string {
  const minutes = minutesBetween(from, now)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** A moment as the local time of day: "10:42 AM". */
export function formatTimeOfDay(moment: string | Date): string {
  const date = new Date(moment)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return formatClock(`${hours}:${minutes}`)
}
