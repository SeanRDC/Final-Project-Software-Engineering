import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import type { Attachment, CurrentUser } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { Attachments } from '@/pages/patients/Attachments'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const coordinator: CurrentUser = {
  ...nurse,
  id: 1,
  role: 'coordinator',
  permissions: [...nurse.permissions, 'attachments:delete'],
}

const lab: Attachment = {
  id: 4,
  patient_id: 1,
  visit_id: null,
  original_filename: 'cbc-result.pdf',
  content_type: 'application/pdf',
  size_bytes: 245_000,
  description: 'CBC result, 3 October',
  uploaded_by_name: 'Reyes, Ana',
  created_at: '2026-10-04T02:00:00+00:00',
}

const OPTIONS = {
  departments: [],
  enums: {},
  lock_timeout_minutes: 5,
  max_upload_mb: 5,
  allowed_upload_types: ['.pdf', '.png', '.jpg'],
}

function clinic(files: Attachment[] = [lab]): FakeServer {
  return fakeServer({ 'GET /patients/1/attachments': files, 'GET /options': OPTIONS })
}

function renderSection(user: CurrentUser = nurse) {
  return renderApp(
    <>
      <Attachments patientId={1} />
      <Toaster />
    </>,
    { user },
  )
}

test('lists the files attached to the record', async () => {
  clinic()
  renderSection()

  const item = await screen.findByRole('listitem')
  expect(item).toHaveTextContent('cbc-result.pdf')
  expect(item).toHaveTextContent('CBC result, 3 October')
  expect(item).toHaveTextContent('239 KB')
  expect(item).toHaveTextContent('Reyes, Ana')
  // Deleting is the coordinator's.
  expect(within(item).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
})

test('uploads a file with its description', async () => {
  const server = clinic([])
  let sent: FormData | undefined
  server.on(
    'POST /patients/1/attachments',
    ({ init }: { init: RequestInit }) => {
      sent = init.body as FormData
      return { ...lab, id: 5, original_filename: 'xray.png' }
    },
    201,
  )
  const user = userEvent.setup()
  renderSection()

  expect(await screen.findByText('No files are attached to this record.')).toBeInTheDocument()
  expect(await screen.findByText('.pdf, .png, .jpg · up to 5 MB')).toBeInTheDocument()

  const form = within(screen.getByRole('form', { name: 'Attach a file' }))
  await user.click(form.getByRole('button', { name: 'Attach file' }))
  expect(form.getByText('Choose a file to attach.')).toBeInTheDocument()

  await user.upload(form.getByLabelText('File'), new File(['x'], 'xray.png', { type: 'image/png' }))
  await user.type(form.getByLabelText('Description (optional)'), 'Chest X-ray')
  await user.click(form.getByRole('button', { name: 'Attach file' }))

  expect(await screen.findByText('xray.png attached')).toBeInTheDocument()
  expect(sent).toBeInstanceOf(FormData)
  expect((sent!.get('file') as File).name).toBe('xray.png')
  expect(sent!.get('description')).toBe('Chest X-ray')
})

test('refuses a kind of file the server does not accept, before uploading', async () => {
  const server = clinic([])
  // applyAccept is off so the test can choose a file the picker would have filtered out.
  const user = userEvent.setup({ applyAccept: false })
  renderSection()

  await screen.findByText('.pdf, .png, .jpg · up to 5 MB')
  const form = within(screen.getByRole('form', { name: 'Attach a file' }))
  await user.upload(form.getByLabelText('File'), new File(['x'], 'notes.exe'))
  await user.click(form.getByRole('button', { name: 'Attach file' }))

  expect(form.getByText(/This kind of file is not accepted/)).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /patients/1/attachments')
})

test('downloads a file through the api', async () => {
  const server = clinic()
  server.on('GET /attachments/4/download', 'pdf-bytes')
  const createObjectURL = vi.fn(() => 'blob:file')
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
  const user = userEvent.setup()
  renderSection()

  await user.click(await screen.findByRole('button', { name: 'Download cbc-result.pdf' }))

  await waitFor(() => expect(server.calls).toContain('GET /attachments/4/download'))
  await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())
})

test('the coordinator deletes a file after confirmation', async () => {
  const server = clinic()
  server.on('DELETE /attachments/4', null, 204)
  const user = userEvent.setup()
  renderSection(coordinator)

  await user.click(await screen.findByRole('button', { name: 'Delete cbc-result.pdf' }))
  const dialog = within(await screen.findByRole('alertdialog', { name: 'Delete this file?' }))
  expect(dialog.getByText(/cannot be undone/)).toBeInTheDocument()
  await user.click(dialog.getByRole('button', { name: 'Delete file' }))

  expect(await screen.findByText('cbc-result.pdf deleted')).toBeInTheDocument()
  expect(server.calls).toContain('DELETE /attachments/4')
})
