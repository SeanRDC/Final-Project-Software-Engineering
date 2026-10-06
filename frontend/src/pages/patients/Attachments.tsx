import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DownloadIcon, PaperclipIcon, UploadIcon } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { api, apiDownload, ApiError, saveDownload } from '@/api/client'
import type { Attachment, Options } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatTimeOfDay } from '@/lib/format'
import { fileProblem } from '@/pages/patients/attachmentRules'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function when(moment: string): string {
  const date = new Date(moment).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${date}, ${formatTimeOfDay(moment)}`
}

function UploadForm({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [problem, setProblem] = useState<string | undefined>()

  const limits = useQuery({
    queryKey: ['options'],
    queryFn: ({ signal }) => api<Options>('/options', { signal }),
    staleTime: 5 * 60_000,
  })

  const upload = useMutation({
    mutationFn: (chosen: File) => {
      const formData = new FormData()
      formData.append('file', chosen)
      if (description.trim()) formData.append('description', description.trim())
      return api<Attachment>(`/patients/${patientId}/attachments`, { method: 'POST', formData })
    },
    onSuccess: (saved) => {
      toast.success(`${saved.original_filename} attached`)
      setFile(null)
      setDescription('')
      if (fileRef.current) fileRef.current.value = ''
      void queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'attachments'] })
    },
  })

  function choose(chosen: File | null) {
    setFile(chosen)
    setProblem(chosen ? fileProblem(chosen, limits.data) : undefined)
    upload.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setProblem('Choose a file to attach.')
      fileRef.current?.focus()
      return
    }
    const found = fileProblem(file, limits.data)
    setProblem(found)
    if (found) return
    upload.mutate(file)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Attach a file"
      className="border-t bg-muted/40 p-4"
    >
      <FieldGroup className="gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={problem ? true : undefined}>
            <FieldLabel htmlFor="attachment-file">File</FieldLabel>
            <Input
              ref={fileRef}
              id="attachment-file"
              name="file"
              type="file"
              className="bg-card"
              accept={limits.data?.allowed_upload_types.join(',')}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? 'attachment-file-error' : 'attachment-file-hint'}
              onChange={(event) => choose(event.target.files?.[0] ?? null)}
            />
            {problem ? (
              <FieldError id="attachment-file-error">{problem}</FieldError>
            ) : (
              <FieldDescription id="attachment-file-hint">
                {limits.data
                  ? `${limits.data.allowed_upload_types.join(', ')} · up to ${limits.data.max_upload_mb} MB`
                  : 'Lab results, scanned forms and similar documents.'}
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="attachment-description">Description (optional)</FieldLabel>
            <Input
              id="attachment-description"
              name="description"
              className="bg-card"
              autoComplete="off"
              maxLength={255}
              placeholder="e.g. CBC result, 3 October…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>

        {upload.error ? (
          <p role="alert" className="text-sm text-danger">
            {upload.error instanceof ApiError
              ? upload.error.message
              : 'The file could not be attached. Please try again.'}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="outline"
          className="self-start bg-card"
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <UploadIcon data-icon="inline-start" />
          )}
          {upload.isPending ? 'Attaching…' : 'Attach file'}
        </Button>
      </FieldGroup>
    </form>
  )
}

/** Files attached to a patient record: lab results, scanned forms and the like. */
export function Attachments({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient()
  const allowed = useCan()
  const [toDelete, setToDelete] = useState<Attachment | null>(null)

  const { data, error, isPending } = useQuery({
    queryKey: ['patients', patientId, 'attachments'],
    queryFn: ({ signal }) => api<Attachment[]>(`/patients/${patientId}/attachments`, { signal }),
  })

  const download = useMutation({
    mutationFn: async (attachment: Attachment) => {
      saveDownload(
        await apiDownload(`/attachments/${attachment.id}/download`, attachment.original_filename),
      )
    },
    onError: (failure, attachment) =>
      toast.error(`${attachment.original_filename} could not be downloaded`, {
        description: failure instanceof ApiError ? failure.message : 'Please try again.',
      }),
  })

  const remove = useMutation({
    mutationFn: (attachment: Attachment) =>
      api(`/attachments/${attachment.id}`, { method: 'DELETE' }),
    onSuccess: (_, attachment) => {
      toast.success(`${attachment.original_filename} deleted`)
      setToDelete(null)
      void queryClient.invalidateQueries({ queryKey: ['patients', patientId, 'attachments'] })
    },
  })

  function closeDelete() {
    setToDelete(null)
    remove.reset()
  }

  return (
    <SectionCard title="Attachments">
      {isPending ? (
        <div role="status" aria-label="Loading attachments" className="p-4">
          <Skeleton className="h-12" />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="px-4 py-5 text-sm text-danger">
          {error instanceof ApiError ? error.message : 'The attachments could not be loaded.'}
        </p>
      ) : null}

      {data && data.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          No files are attached to this record.
        </p>
      ) : null}

      {data && data.length > 0 ? (
        <ul className="divide-y">
          {data.map((attachment) => (
            <li
              key={attachment.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <PaperclipIcon
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                  <p className="text-[15px] font-medium break-all">
                    {attachment.original_filename}
                  </p>
                  {attachment.description ? (
                    <p className="text-sm">{attachment.description}</p>
                  ) : null}
                  <p className="text-[13px] text-muted-foreground">
                    {formatSize(attachment.size_bytes)} · {when(attachment.created_at)}
                    {attachment.uploaded_by_name ? ` · ${attachment.uploaded_by_name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card"
                  disabled={download.isPending && download.variables?.id === attachment.id}
                  aria-label={`Download ${attachment.original_filename}`}
                  onClick={() => download.mutate(attachment)}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Download
                </Button>
                {allowed('attachments:delete') ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    aria-label={`Delete ${attachment.original_filename}`}
                    onClick={() => setToDelete(attachment)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {allowed('attachments:write') ? <UploadForm patientId={patientId} /> : null}

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && closeDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `“${toDelete.original_filename}” will be removed from the record for good. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error ? (
            <p role="alert" className="text-sm text-danger">
              {remove.error instanceof ApiError
                ? remove.error.message
                : 'The file could not be deleted. Please try again.'}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Keep file</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete)}
            >
              {remove.isPending ? <Spinner data-icon="inline-start" /> : null}
              Delete file
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}
