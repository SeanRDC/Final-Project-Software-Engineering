import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  connectLive,
  liveUrl,
  type LiveEvent,
  type LiveStatus,
  type SocketLike,
} from '@/live/liveSocket'

class FakeSocket implements SocketLike {
  sent: string[] = []
  closed = false
  onopen: SocketLike['onopen'] = null
  onmessage: SocketLike['onmessage'] = null
  onclose: SocketLike['onclose'] = null

  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.closed = true
  }
  open() {
    this.onopen?.({})
  }
  receive(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) })
  }
  drop(code = 1006) {
    this.onclose?.({ code })
  }
}

function setup() {
  const sockets: FakeSocket[] = []
  const events: LiveEvent[] = []
  const statuses: Array<[LiveStatus, number | null]> = []
  const onReconnect = vi.fn()
  let clock = 0

  const disconnect = connectLive({
    url: 'ws://clinic/api/v1/ws?token=t',
    onEvent: (event) => events.push(event),
    onStatus: (status, latency) => statuses.push([status, latency]),
    onReconnect,
    createSocket: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
    pingIntervalMs: 10_000,
    now: () => clock,
  })

  return {
    sockets,
    events,
    statuses,
    onReconnect,
    disconnect,
    latest: () => sockets.at(-1)!,
    advanceClock: (ms: number) => {
      clock += ms
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('builds the socket address from the page address', () => {
  expect(liveUrl('a b', { protocol: 'http:', host: '192.168.1.10:8000' })).toBe(
    'ws://192.168.1.10:8000/api/v1/ws?token=a%20b',
  )
  expect(liveUrl('t', { protocol: 'https:', host: 'clinic.local' })).toBe(
    'wss://clinic.local/api/v1/ws?token=t',
  )
})

test('reports connecting, then connected once the socket opens', () => {
  const live = setup()
  expect(live.statuses).toEqual([['connecting', null]])

  live.latest().open()

  expect(live.statuses.at(-1)).toEqual(['connected', null])
})

test('measures the round trip of each ping', () => {
  const live = setup()
  live.latest().open()
  expect(live.latest().sent).toEqual(['ping'])

  live.advanceClock(3)
  live.latest().receive({ event: 'pong' })
  expect(live.statuses.at(-1)).toEqual(['connected', 3])

  vi.advanceTimersByTime(10_000)
  expect(live.latest().sent).toEqual(['ping', 'ping'])
})

test('passes change events on and keeps pongs to itself', () => {
  const live = setup()
  live.latest().open()

  live.latest().receive({ event: 'visits.updated', data: { visit_id: 12 } })
  live.latest().receive({ event: 'pong' })
  live.latest().receive('not json')

  expect(live.events).toEqual([{ event: 'visits.updated', data: { visit_id: 12 } }])
})

test('goes offline and reconnects with a growing delay', () => {
  const live = setup()
  live.latest().open()

  live.latest().drop()
  expect(live.statuses.at(-1)).toEqual(['offline', null])
  expect(live.sockets).toHaveLength(1)

  vi.advanceTimersByTime(1_000)
  expect(live.sockets).toHaveLength(2)

  live.latest().drop()
  vi.advanceTimersByTime(1_999)
  expect(live.sockets).toHaveLength(2)
  vi.advanceTimersByTime(1)
  expect(live.sockets).toHaveLength(3)

  live.latest().open()
  expect(live.statuses.at(-1)).toEqual(['connected', null])
  expect(live.onReconnect).toHaveBeenCalledOnce()
})

test('does not retry when the server rejects the token', () => {
  const live = setup()

  live.latest().drop(1008)
  vi.advanceTimersByTime(60_000)

  expect(live.sockets).toHaveLength(1)
  expect(live.statuses.at(-1)).toEqual(['offline', null])
})

test('stops for good when disconnected', () => {
  const live = setup()
  live.latest().open()

  live.disconnect()
  live.latest().drop()
  vi.advanceTimersByTime(60_000)

  expect(live.latest().closed).toBe(true)
  expect(live.sockets).toHaveLength(1)
  expect(live.latest().sent).toEqual(['ping'])
})
