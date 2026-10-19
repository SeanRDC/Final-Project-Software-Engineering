// The two ways to take a report away: a formatted Excel workbook, or plain CSV.

import { DownloadIcon, FileSpreadsheetIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useFileDownload } from '@/pages/reports/useReports'

type DownloadButtonsProps = {
  /** Where each file is served, e.g. { xlsx: '/reports/3/xlsx', csv: '/reports/3/csv' }. */
  paths: { xlsx: string; csv: string }
  query?: Record<string, string>
  /** The file name without its extension. */
  fileStem: string
  disabled?: boolean
  className?: string
}

export function DownloadButtons({
  paths,
  query,
  fileStem,
  disabled,
  className,
}: DownloadButtonsProps) {
  const excel = useFileDownload()
  const csv = useFileDownload()

  function download(kind: 'xlsx' | 'csv') {
    const mutation = kind === 'xlsx' ? excel : csv
    mutation.mutate(
      { path: paths[kind], query, name: `${fileStem}.${kind}` },
      {
        onError: (failure) =>
          toast.error(`The ${kind === 'xlsx' ? 'Excel file' : 'CSV'} could not be downloaded`, {
            description: failure instanceof ApiError ? failure.message : 'Please try again.',
          }),
      },
    )
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn('bg-card', className)}
        disabled={disabled || excel.isPending}
        onClick={() => download('xlsx')}
      >
        {excel.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <FileSpreadsheetIcon data-icon="inline-start" />
        )}
        Download Excel
      </Button>
      <Button
        variant="ghost"
        className={className}
        disabled={disabled || csv.isPending}
        onClick={() => download('csv')}
      >
        {csv.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <DownloadIcon data-icon="inline-start" />
        )}
        Download CSV
      </Button>
    </>
  )
}
