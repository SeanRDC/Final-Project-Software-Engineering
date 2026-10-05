import { expect, test } from 'vitest'

import { can } from '@/auth/permissions'
import { doctor, nurse } from '@/test/fixtures'

test('nobody signed in may do nothing', () => {
  expect(can(null, 'patients:read')).toBe(false)
  expect(can(null, undefined)).toBe(false)
})

test('anything without a required permission is open to every account', () => {
  expect(can(doctor, undefined)).toBe(true)
})

test('follows the permissions the server gave the account', () => {
  expect(can(nurse, 'visits:record')).toBe(true)
  expect(can(nurse, 'visits:consult')).toBe(false)

  expect(can(doctor, 'visits:consult')).toBe(true)
  expect(can(doctor, 'visits:record')).toBe(false)
  expect(can(doctor, 'appointments:write')).toBe(false)
})
