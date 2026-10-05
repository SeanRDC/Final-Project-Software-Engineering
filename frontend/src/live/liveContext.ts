import { createContext, useContext } from 'react'

import type { LiveStatus } from '@/live/liveSocket'

export type LiveState = {
  status: LiveStatus
  /** Round trip to the clinic server in milliseconds, once measured. */
  latencyMs: number | null
}

export const LiveContext = createContext<LiveState>({ status: 'connecting', latencyMs: null })

export function useLive(): LiveState {
  return useContext(LiveContext)
}
