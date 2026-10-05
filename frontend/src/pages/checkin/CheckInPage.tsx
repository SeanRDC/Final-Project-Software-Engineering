import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { ArrivingByAppointment } from '@/pages/checkin/ArrivingByAppointment'
import { WalkInForm } from '@/pages/checkin/WalkInForm'

/** The front desk's check-in screen: walk-ins on the left, expected appointments on the right. */
export function CheckInPage() {
  const allowed = useCan()

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SectionCard title="Walk-in">
        <div className="max-w-2xl p-4">
          <WalkInForm />
        </div>
      </SectionCard>
      {allowed('appointments:read') ? <ArrivingByAppointment /> : null}
    </div>
  )
}
