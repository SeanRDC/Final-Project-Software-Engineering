/**
 * The server stores an audit entry's detail as JSON, e.g. {"fields": ["allergies"]}.
 * Shown as "fields: allergies"; anything that is not such an object is shown as written.
 */
export function describeDetail(detail: string | null): string {
  if (!detail) return '—'
  try {
    const parsed: unknown = JSON.parse(detail)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return detail
    return Object.entries(parsed)
      .map(([key, value]) => {
        const shown = Array.isArray(value) ? value.join(', ') : String(value)
        return `${key.replaceAll('_', ' ')}: ${shown}`
      })
      .join(' · ')
  } catch {
    return detail
  }
}
