// The dispensary form of an issued kit (FM-SSA-MDS-8033), laid out for paper and signatures.

import { CircleAlertIcon, PrinterIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'

import { ApiError } from '@/api/client'
import hauLogo from '@/assets/hau-logo.png'
import { FormCodeBox } from '@/components/FormCodeBox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MEDKIT_DISPENSARY_FORM } from '@/lib/formCodes'
import { formatShortDay } from '@/pages/medkit/medkitDisplay'
import { useMedkitRequest } from '@/pages/medkit/useMedkits'

/** A filled-in line of the paper form: the label, then the answer on a rule. */
function Blank({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex items-end gap-2">
      <span className="shrink-0 font-medium uppercase">{label}:</span>
      <span className="min-w-0 flex-1 border-b border-black px-1">{children}</span>
    </p>
  )
}

function Signature({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="min-h-6 w-full border-b border-black text-center">{children}</span>
      <span className="text-center text-xs">{label}</span>
    </div>
  )
}

export function MedkitPrintPage() {
  const { requestId } = useParams()
  const id = /^\d+$/.test(requestId ?? '') ? Number(requestId) : null
  const { data: request, error, isPending } = useMedkitRequest(id)

  if (error || id === null) {
    return (
      <Alert variant="destructive" className="m-6 max-w-xl">
        <CircleAlertIcon />
        <AlertTitle>The form could not be prepared</AlertTitle>
        <AlertDescription>
          {error instanceof ApiError ? error.message : 'No such kit request.'}
        </AlertDescription>
      </Alert>
    )
  }
  if (isPending || !request) {
    return (
      <div role="status" aria-label="Preparing the form" className="m-6">
        <Skeleton className="h-[80vh] max-w-3xl" />
      </div>
    )
  }

  const issuedOn = request.issued_at ? formatShortDay(request.issued_at.slice(0, 10)) : ''

  return (
    <div className="min-h-screen bg-muted/40 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}>
          <PrinterIcon data-icon="inline-start" />
          Print
        </Button>
      </div>
      <article
        aria-label="Medical kit dispensary"
        className="mx-auto flex max-w-[210mm] flex-col gap-6 bg-white p-10 font-sans text-[13px] text-black shadow-sm print:max-w-none print:p-0 print:shadow-none"
      >
        <FormCodeBox code={MEDKIT_DISPENSARY_FORM} className="self-end border-black" />
        <header className="flex items-center justify-center gap-4">
          <img src={hauLogo} alt="" width={72} height={72} className="size-18 object-contain" />
          <div className="text-center">
            <p className="font-serif text-xl font-bold tracking-wide uppercase">
              Holy Angel University
            </p>
            <h1 className="text-lg font-bold uppercase">Medical Kit Dispensary</h1>
          </div>
        </header>

        <div className="flex justify-end">
          <div className="w-56">
            <Blank label="Medical Kit No.">{request.medkit?.kit_number ?? ''}</Blank>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Blank label="Name of organization / department">{request.organization}</Blank>
          <Blank label="Activity / seminar">{request.activity}</Blank>
          <Blank label="Date of seminar / activity">{formatShortDay(request.activity_date)}</Blank>
        </div>

        <table className="mx-auto w-4/5 border-collapse border border-black">
          <thead>
            <tr>
              <th scope="col" className="border border-black px-3 py-1.5">
                Medicine
              </th>
              <th scope="col" className="w-40 border border-black px-3 py-1.5">
                Total No. Issued
              </th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="border border-black px-3 py-1 text-left font-normal">
                  {item.medicine_name}
                </th>
                <td className="border border-black px-3 py-1 text-center tabular-nums">
                  {item.quantity_issued} {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-3">
          <p className="font-medium">Received by:</p>
          <div className="grid grid-cols-3 gap-6">
            <Signature label="Person Responsible">{request.person_responsible}</Signature>
            <Signature label="Date" />
            <Signature label="Contact No.">{request.contact_number}</Signature>
          </div>
        </div>

        <div>
          <p className="font-bold underline">NOTE:</p>
          <ol className="list-decimal pl-8">
            <li>
              Please return the Medical Kit <strong>IMMEDIATELY</strong> after the day of the
              activity.
            </li>
            <li>
              In case of <strong>LOSS</strong>, the Medical Kit, including the contents, should be
              replaced by the responsible person.
            </li>
          </ol>
        </div>

        <div className="ml-auto flex w-72 flex-col gap-4">
          <Signature label="Signature over Printed Name of Medical Staff">
            {request.issued_by_name}
          </Signature>
          <Signature label="Date">{issuedOn}</Signature>
        </div>
      </article>
    </div>
  )
}
