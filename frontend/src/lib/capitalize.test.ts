import { expect, test } from 'vitest'

import { capitalizeWords } from '@/lib/capitalize'

test('gives each word of a name its capital letter', () => {
  expect(capitalizeWords('juan dela cruz')).toBe('Juan Dela Cruz')
  expect(capitalizeWords('maria ')).toBe('Maria ')
})

test('leaves the rest of each word as it was typed', () => {
  expect(capitalizeWords('McDonald')).toBe('McDonald')
  expect(capitalizeWords('mcDonald')).toBe('McDonald')
  expect(capitalizeWords('JOSE')).toBe('JOSE')
})

test('capitalises after a hyphen or an apostrophe', () => {
  expect(capitalizeWords("o'neil")).toBe("O'Neil")
  expect(capitalizeWords('ana-marie')).toBe('Ana-Marie')
})

test('handles letters with accents', () => {
  expect(capitalizeWords('ñino')).toBe('Ñino')
})
