import type { Options } from '@/api/types'

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

/**
 * Why a chosen file cannot be uploaded, by the limits the server reports, or undefined
 * when it can. The server checks again; this only spares the wait for a refusal.
 */
export function fileProblem(
  file: Pick<File, 'name' | 'size'>,
  limits: Pick<Options, 'allowed_upload_types' | 'max_upload_mb'> | undefined,
): string | undefined {
  if (!limits) return undefined
  if (!limits.allowed_upload_types.includes(extensionOf(file.name))) {
    return `This kind of file is not accepted. Use ${limits.allowed_upload_types.join(', ')}.`
  }
  if (file.size > limits.max_upload_mb * 1024 * 1024) {
    return `The file is larger than ${limits.max_upload_mb} MB.`
  }
  return undefined
}
