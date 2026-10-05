import { useEffect, useState } from 'react'

import { api, ApiError } from '@/api/client'
import type { LockInfo } from '@/api/types'

/** The server drops a lock that is not renewed for a few minutes; renew well inside that. */
const RENEW_EVERY_MS = 60_000

export type RecordLock =
  | { state: 'acquiring' }
  | { state: 'held' }
  /** Someone else is editing, or the lock could not be taken. `message` says why. */
  | { state: 'refused'; message: string }

/**
 * Holds the edit lock on a patient or visit record for as long as the component using
 * it is mounted: takes it, renews it every minute, and releases it on the way out.
 * While it is held, other accounts can read the record but not change it.
 */
export function useRecordLock(resource: 'patient' | 'visit', id: number): RecordLock {
  const [lock, setLock] = useState<RecordLock>({ state: 'acquiring' })

  useEffect(() => {
    const path = `/locks/${resource}/${id}`
    let released = false
    let isHeld = false

    function take() {
      api<LockInfo>(path, { method: 'PUT' })
        .then(() => {
          if (released) {
            // Editing ended while the request was on its way; do not leave the lock behind.
            void api(path, { method: 'DELETE' }).catch(() => {})
            return
          }
          isHeld = true
          setLock({ state: 'held' })
        })
        .catch((error: unknown) => {
          if (released) return
          isHeld = false
          setLock({
            state: 'refused',
            message:
              error instanceof ApiError
                ? error.message
                : 'The record could not be opened for editing.',
          })
        })
    }

    take()
    const timer = setInterval(take, RENEW_EVERY_MS)

    return () => {
      released = true
      clearInterval(timer)
      if (isHeld) void api(path, { method: 'DELETE' }).catch(() => {})
    }
  }, [resource, id])

  return lock
}
