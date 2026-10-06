import { expect, test } from 'vitest'

import { fileProblem } from '@/pages/patients/attachmentRules'

const limits = { allowed_upload_types: ['.pdf', '.png', '.jpg'], max_upload_mb: 5 }

test('accepts an allowed file within the size limit, whatever the case of its extension', () => {
  expect(fileProblem({ name: 'CBC result.PDF', size: 300_000 }, limits)).toBeUndefined()
})

test('refuses a kind of file the server does not accept', () => {
  expect(fileProblem({ name: 'notes.exe', size: 10 }, limits)).toBe(
    'This kind of file is not accepted. Use .pdf, .png, .jpg.',
  )
  expect(fileProblem({ name: 'no-extension', size: 10 }, limits)).toMatch(/not accepted/)
})

test('refuses a file over the size limit', () => {
  expect(fileProblem({ name: 'scan.png', size: 5 * 1024 * 1024 + 1 }, limits)).toBe(
    'The file is larger than 5 MB.',
  )
})

test('leaves the decision to the server until the limits are known', () => {
  expect(fileProblem({ name: 'notes.exe', size: 10 }, undefined)).toBeUndefined()
})
