// The one place that talks HTTP to the backend: adds the token, parses JSON and turns
// the backend's {"detail": ...} errors into ApiError.

const API_BASE = '/api/v1'

let accessToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

/** Set by the auth layer after login and cleared on logout. */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Called when the server answers 401 to a request that carried a token. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  readonly status: number
  /** Anything the server sent besides the message, e.g. the id of a conflicting record. */
  readonly data: Record<string, unknown>

  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  /** True when the server could not be reached at all. */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

type QueryValue = string | number | boolean | null | undefined

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  /** Sent as a JSON body. */
  json?: unknown
  /** Sent as application/x-www-form-urlencoded, which the login route expects. */
  form?: Record<string, string>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `${API_BASE}${path}${search ? `?${search}` : ''}`
}

// FastAPI sends a string for our own errors and a list of field problems for 422.
function readDetail(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return fallback
  const { detail } = body
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first: unknown = detail[0]
    if (typeof first === 'object' && first !== null && 'msg' in first) {
      const field = 'loc' in first && Array.isArray(first.loc) ? first.loc.at(-1) : null
      return field ? `${String(field)}: ${String(first.msg)}` : String(first.msg)
    }
  }
  return fallback
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, json, form, signal } = options
  const headers = new Headers({ Accept: 'application/json' })
  const sentToken = accessToken
  if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`)

  let body: BodyInit | undefined
  if (form) {
    body = new URLSearchParams(form)
  } else if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Cannot reach the clinic server. Check the connection and try again.')
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && sentToken) unauthorizedHandler?.()
    throw new ApiError(
      response.status,
      readDetail(payload, `The server returned an error (${response.status}).`),
      typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {},
    )
  }
  return payload as T
}
