import { expect, test } from 'vitest'

import {
  formatAgo,
  formatClock,
  formatDuration,
  formatTimeRange,
  humanize,
  minutesBetween,
  parseDay,
  toDayString,
} from '@/lib/format'

test('humanize makes an enum value readable', () => {
  expect(humanize('medicine_request')).toBe('Medicine request')
  expect(humanize('no_show')).toBe('No show')
  expect(humanize('student')).toBe('Student')
})

test('a day survives the trip through Date without shifting', () => {
  const day = parseDay('2026-10-04')

  expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 9, 4])
  expect(toDayString(day)).toBe('2026-10-04')
})

test('formatClock uses the twelve-hour clock', () => {
  expect(formatClock('00:05:00')).toBe('12:05 AM')
  expect(formatClock('09:00:00')).toBe('9:00 AM')
  expect(formatClock('12:00:00')).toBe('12:00 PM')
  expect(formatClock('14:30')).toBe('2:30 PM')
})

test('formatTimeRange drops the first AM/PM only when both match', () => {
  expect(formatTimeRange('09:00:00', '09:30:00')).toBe('9:00–9:30 AM')
  expect(formatTimeRange('14:00:00', '14:30:00')).toBe('2:00–2:30 PM')
  expect(formatTimeRange('11:30:00', '12:15:00')).toBe('11:30 AM–12:15 PM')
})

test('minutesBetween counts whole minutes and never goes negative', () => {
  expect(minutesBetween('2026-10-04T01:00:00Z', '2026-10-04T01:06:59Z')).toBe(6)
  expect(minutesBetween('2026-10-04T02:00:00Z', '2026-10-04T01:00:00Z')).toBe(0)
})

test('formatDuration switches to hours after an hour', () => {
  expect(formatDuration(0)).toBe('0 min')
  expect(formatDuration(44)).toBe('44 min')
  expect(formatDuration(70)).toBe('1 h 10 min')
  expect(formatDuration(120)).toBe('2 h')
})

test('formatAgo stays short', () => {
  const now = new Date('2026-10-04T08:00:00Z')

  expect(formatAgo('2026-10-04T07:59:40Z', now)).toBe('now')
  expect(formatAgo('2026-10-04T07:54:00Z', now)).toBe('6m')
  expect(formatAgo('2026-10-04T06:00:00Z', now)).toBe('2h')
  expect(formatAgo('2026-10-01T08:00:00Z', now)).toBe('3d')
})
