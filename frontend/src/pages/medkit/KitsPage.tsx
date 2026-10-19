// The numbered medical kits: which are on the shelf, which are out and with whom, and which were lost.

import { BriefcaseMedicalIcon, CircleAlertIcon, PlusIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Medkit } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { StatusPill } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatShortDay, KIT_STATUS } from '@/pages/medkit/medkitDisplay'
import { useAddKit, useKits, useUpdateKit } from '@/pages/medkit/useMedkits'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

function AddKitDialog({ nextNumber }: { nextNumber: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string>()
  const add = useAddKit()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^\d+$/.test(number.trim()) || Number(number) < 1) {
      setError('Enter the number written on the kit.')
      return
    }
    add.mutate(
      { kit_number: Number(number), label: label.trim() || null },
      {
        onSuccess: (saved) => {
          toast.success(`Kit #${saved.kit_number} added`)
          setIsOpen(false)
        },
      },
    )
  }

  function open() {
    setNumber(String(nextNumber))
    setLabel('')
    setError(undefined)
    add.reset()
    setIsOpen(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button onClick={open}>
        <PlusIcon data-icon="inline-start" />
        Add kit
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a medical kit</DialogTitle>
          <DialogDescription>Use the number written on the kit itself.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate aria-label="Add kit">
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="kit-number">Kit number</FieldLabel>
              <Input
                id="kit-number"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
                value={number}
                onChange={(event) => {
                  setNumber(event.target.value)
                  setError(undefined)
                }}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="kit-label">Label (optional)</FieldLabel>
              <Input
                id="kit-label"
                maxLength={80}
                autoComplete="off"
                placeholder="e.g. Red bag"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </Field>
            {add.error ? (
              <p role="alert" className="text-sm text-danger">
                {add.error instanceof ApiError ? add.error.message : 'Please try again.'}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={add.isPending}>
                {add.isPending ? <Spinner data-icon="inline-start" /> : null}
                Add kit
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** The coordinator's actions on one kit: put a replaced lost kit back, retire or reuse it. */
function KitActions({ kit }: { kit: Medkit }) {
  const update = useUpdateKit(kit.id)
  const name = `Kit #${kit.kit_number}`

  function save(changes: Parameters<typeof update.mutate>[0], done: string) {
    update.mutate(changes, {
      onSuccess: () => toast.success(done),
      onError: (failure) =>
        toast.error(`${name} could not be changed`, {
          description: failure instanceof ApiError ? failure.message : 'Please try again.',
        }),
    })
  }

  if (kit.status === 'lost') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" aria-label={`${name} replaced`}>
            Replaced
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Put {name} back in service?</AlertDialogTitle>
            <AlertDialogDescription>
              Do this once the person responsible has replaced the kit. It can then be issued again;
              restock its contents through the inventory as usual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <Button onClick={() => save({ status: 'available' }, `${name} is back in service`)}>
              Back in service
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }
  if (kit.status === 'out') return null
  return kit.is_active ? (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Retire ${name}`}
      disabled={update.isPending}
      onClick={() => save({ is_active: false }, `${name} retired`)}
    >
      Retire
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Use ${name} again`}
      disabled={update.isPending}
      onClick={() => save({ is_active: true }, `${name} back in use`)}
    >
      Use again
    </Button>
  )
}

export function KitsPage() {
  const { data, error, isPending } = useKits()
  const allowed = useCan()
  const canManage = allowed('medkits:manage')
  const nextNumber = Math.max(0, ...(data ?? []).map((kit) => kit.kit_number)) + 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          A kit goes out when a request is issued and comes back when it is taken back.
        </p>
        {canManage ? <AddKitDialog nextNumber={nextNumber} /> : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The kits could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}
      {isPending ? (
        <div role="status" aria-label="Loading the kits" className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section aria-label="Medical kits" className="overflow-hidden rounded-lg border bg-card">
          {data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BriefcaseMedicalIcon />
                </EmptyMedia>
                <EmptyTitle>No kits yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? 'Add the clinic’s kits by the number written on each one.'
                    : 'The Clinic Coordinator adds the clinic’s kits.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Kit</TableHead>
                    <TableHead className={HEAD_CLASS}>State</TableHead>
                    <TableHead className={HEAD_CLASS}>Out with</TableHead>
                    <TableHead className={cn(HEAD_CLASS, 'pr-4 text-right')}>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((kit) => {
                    const loan = kit.current_request
                    const state = loan?.is_overdue
                      ? { label: 'Overdue', tone: 'danger' as const }
                      : KIT_STATUS[kit.status]
                    return (
                      <TableRow key={kit.id} className={cn(!kit.is_active && 'opacity-60')}>
                        <TableCell className="py-3 pl-4">
                          <span className="text-[15px] font-medium">Kit #{kit.kit_number}</span>
                          {kit.label ? (
                            <span className="ml-2 text-sm text-muted-foreground">{kit.label}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-3">
                          {kit.is_active ? (
                            <StatusPill tone={state.tone}>{state.label}</StatusPill>
                          ) : (
                            <StatusPill>Retired</StatusPill>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-sm whitespace-normal">
                          {loan ? (
                            <>
                              <Link
                                to={`/medkit/requests/${loan.id}`}
                                className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {loan.activity}
                              </Link>
                              <div className="text-[13px] text-muted-foreground">
                                {loan.person_responsible} · {loan.organization} · activity{' '}
                                {formatShortDay(loan.activity_date)}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 pr-4 text-right">
                          {canManage ? <KitActions kit={kit} /> : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
