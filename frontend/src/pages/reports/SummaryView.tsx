import { Link } from 'react-router'

import type { CountItem, ReportSummary } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { humanize } from '@/lib/format'
import { VisitsByMonthChart } from '@/pages/reports/VisitsByMonthChart'

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-lg border bg-card px-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[28px] leading-tight font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

type CountTableProps = {
  title: string
  /** Heading of the first column. */
  what: string
  items: CountItem[]
  /** Labels that are stored values such as "medicine_request" are made readable. */
  readable?: boolean
  empty?: string
}

/** A breakdown as a two-column table: what, and how many, with a bar under each name. */
function CountTable({
  title,
  what,
  items,
  readable = false,
  empty = 'Nothing in this period.',
}: CountTableProps) {
  // Every bar in a table is measured against its largest count.
  const max = Math.max(1, ...items.map((item) => item.count))

  return (
    <SectionCard title={title}>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <table className="w-full text-[15px]">
          <thead className="sr-only">
            <tr>
              <th scope="col">{what}</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.label}>
                <th scope="row" className="w-full py-2 pl-4 text-left font-normal">
                  {readable ? humanize(item.label) : item.label}
                  <span aria-hidden="true" className="mt-1.5 block h-2">
                    <span
                      className="block h-full rounded-r-sm bg-chart-1"
                      style={{
                        width: `${(item.count / max) * 100}%`,
                        minWidth: item.count > 0 ? 2 : 0,
                      }}
                    />
                  </span>
                </th>
                <td className="px-4 py-2 text-right align-top font-medium tabular-nums">
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

/** The figures of a period, used for live statistics and for a saved report alike. */
export function SummaryView({ summary }: { summary: ReportSummary }) {
  const allowed = useCan()
  const canOpenPatient = allowed('patients:read')

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Visits" value={summary.total_visits} />
        <Tile label="Different patients" value={summary.unique_patients} />
        <Tile label="Referrals" value={summary.referrals} />
        <Tile label="Guardians notified" value={summary.guardian_notifications} />
      </dl>

      <VisitsByMonthChart items={summary.visits_by_month} />

      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        <CountTable title="Visits by type" what="Type" items={summary.visits_by_type} readable />
        <CountTable
          title="Visits by patient type"
          what="Patient type"
          items={summary.visits_by_patient_type}
          readable
        />
        <CountTable
          title="Visits by outcome"
          what="Outcome"
          items={summary.visits_by_disposition}
          readable
        />
        <CountTable
          title="Visits by department"
          what="Department"
          items={summary.visits_by_department}
        />
        <CountTable
          title="Most common complaints"
          what="Complaint"
          items={summary.top_complaints}
        />
        <CountTable
          title="Appointments by status"
          what="Status"
          items={summary.appointments_by_status}
          readable
        />

        <SectionCard title="Medicine released">
          {summary.medicines_released.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nothing in this period.</p>
          ) : (
            <table className="w-full text-[15px]">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Medicine</th>
                  <th scope="col">Quantity released</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.medicines_released.map((medicine) => (
                  <tr key={medicine.medicine_id}>
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      {medicine.medicine_name}
                    </th>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span className="font-medium">{medicine.quantity_released}</span>{' '}
                      <span className="text-[13px] text-muted-foreground">{medicine.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="Most frequent visitors">
          {summary.frequent_visitors.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nothing in this period.</p>
          ) : (
            <table className="w-full text-[15px]">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.frequent_visitors.map((visitor) => (
                  <tr key={visitor.patient_id}>
                    <th scope="row" className="px-4 py-2 text-left font-normal">
                      {canOpenPatient ? (
                        <Link
                          to={`/patients/${visitor.patient_id}`}
                          className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {visitor.full_name}
                        </Link>
                      ) : (
                        <span className="font-medium">{visitor.full_name}</span>
                      )}
                      <div className="text-[13px] text-muted-foreground">
                        <span className="tabular-nums">{visitor.id_number}</span>
                        {visitor.department ? ` · ${visitor.department}` : ''}
                      </div>
                    </th>
                    <td className="px-4 py-2 text-right align-top font-medium tabular-nums">
                      {visitor.visit_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
