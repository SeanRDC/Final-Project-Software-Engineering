// The WebSocket to the clinic server. It delivers "something changed" events, measures
// how quickly the server answers, and reconnects by itself when the connection drops.

export type LiveStatus = 'connecting' | 'connected' | 'offline'

export type LiveEvent = {
  /** e.g. "visits.updated", "inventory.updated". */
  event: string
  data?: Record<string, unknown>
  at?: string
}

/** The part of the browser WebSocket this module uses; tests pass a stand-in. */
export type SocketLike = {
  send: (data: string) => void
  close: () => void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number }) => void) | null
}

export type LiveOptions = {
  url: string
  onEvent: (event: LiveEvent) => void
  /** latencyMs is the last measured round trip, or null when not connected or not yet measured. */
  onStatus: (status: LiveStatus, latencyMs: number | null) => void
  /** Called each time the connection is re-established after a drop. */
  onReconnect?: () => void
  createSocket?: (url: string) => SocketLike
  pingIntervalMs?: number
  now?: () => number
}

// The server closes with this code when it does not accept the token.
const POLICY_VIOLATION = 1008
const FIRST_RETRY_MS = 1_000
const LONGEST_RETRY_MS = 15_000

/** Builds the address of the live-events socket on the server that served the page. */
export function liveUrl(token: string, location: Pick<Location, 'protocol' | 'host'>): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${location.host}/api/v1/ws?token=${encodeURIComponent(token)}`
}

/** Opens the connection and keeps it open. Returns a function that closes it for good. */
export function connectLive(options: LiveOptions): () => void {
  const {
    url,
    onEvent,
    onStatus,
    onReconnect,
    createSocket = (target) => new WebSocket(target) as unknown as SocketLike,
    pingIntervalMs = 10_000,
    now = () => performance.now(),
  } = options

  let socket: SocketLike | null = null
  let stopped = false
  let failures = 0
  let hasConnectedBefore = false
  let pingSentAt: number | null = null
  let pingTimer: ReturnType<typeof setInterval> | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  function sendPing() {
    pingSentAt = now()
    socket?.send('ping')
  }

  function open() {
    const current = createSocket(url)
    socket = current

    current.onopen = () => {
      failures = 0
      onStatus('connected', null)
      if (hasConnectedBefore) onReconnect?.()
      hasConnectedBefore = true
      sendPing()
      pingTimer = setInterval(sendPing, pingIntervalMs)
    }

    current.onmessage = (message) => {
      if (typeof message.data !== 'string') return
      let parsed: LiveEvent
      try {
        parsed = JSON.parse(message.data) as LiveEvent
      } catch {
        return
      }
      if (parsed.event === 'pong') {
        if (pingSentAt !== null) onStatus('connected', Math.max(0, Math.round(now() - pingSentAt)))
        pingSentAt = null
        return
      }
      if (typeof parsed.event === 'string') onEvent(parsed)
    }

    current.onclose = (event) => {
      clearInterval(pingTimer)
      if (stopped || socket !== current) return
      socket = null
      onStatus('offline', null)
      // A rejected token will be rejected again; the next API call ends the session.
      if (event.code === POLICY_VIOLATION) return
      const delay = Math.min(FIRST_RETRY_MS * 2 ** failures, LONGEST_RETRY_MS)
      failures += 1
      retryTimer = setTimeout(open, delay)
    }
  }

  onStatus('connecting', null)
  open()

  return () => {
    stopped = true
    clearInterval(pingTimer)
    clearTimeout(retryTimer)
    socket?.close()
    socket = null
  }
}
