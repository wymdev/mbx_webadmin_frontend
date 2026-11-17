import { compareDecimals } from '@/domain/money'
import { lazy, Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import History from 'lucide-react/icons/rotate-ccw-clock'
import Pencil from 'lucide-react/icons/pencil'
import RefreshCw from 'lucide-react/icons/refresh-cw'
import ArrowUp from 'lucide-react/icons/arrow-up'
import ArrowDown from 'lucide-react/icons/arrow-down'
import GripVertical from 'lucide-react/icons/grip-vertical'
import { useRates, useDemoMutation } from '@/services/queries'
import { repository } from '@/services/demo'
import { PageHeader } from '@/components/page-header'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/form-field'
import { QueryState } from '@/components/query-state'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Rate } from '@/domain/models'
import { toast } from 'sonner'

const RateChart = lazy(() => import('./rate-chart'))
const schema = z.object({
  buy: z
    .string()
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter a positive buy rate'),
  sell: z
    .string()
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter a positive sell rate'),
})
export default function RatesPage() {
  const query = useRates()
  const [editing, setEditing] = useState<Rate | null>(null)
  const [history, setHistory] = useState<Rate | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const save = useDemoMutation((input: { id: string; buy: string; sell: string }) =>
    repository.saveRate(input),
  )
  const reorder = useDemoMutation((input: { activeId: string; targetId: string }) =>
    repository.reorderRates(input.activeId, input.targetId),
  )
  function moveRate(activeId: string, targetId: string) {
    reorder.mutate(
      { activeId, targetId },
      {
        onSuccess: () => toast.success('Rate order updated for this session'),
        onError: (error) => toast.error(error.message),
      },
    )
  }
  const columns: ColumnDef<Rate>[] = [
    {
      id: 'position',
      header: '#',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground mono">{String(row.index + 1).padStart(2, '0')}</span>
      ),
    },
    {
      id: 'currency',
      accessorFn: (row) => `${row.currency} ${row.country}`,
      header: 'Currency',
      cell: ({ row }) => (
        <div className="person-cell">
          <span className="flag">{row.original.flag}</span>
          <div>
            <strong>{row.original.currency} / MMK</strong>
            <small>{row.original.country}</small>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'buy',
      header: 'Buy rate',
      sortFn: (a, b) => compareDecimals(a.original.buy, b.original.buy),
      cell: ({ row }) => (
        <strong className="mono text-primary">{formatMoney(row.original.buy)}</strong>
      ),
    },
    {
      accessorKey: 'sell',
      header: 'Sell rate',
      sortFn: (a, b) => compareDecimals(a.original.sell, b.original.sell),
      cell: ({ row }) => <strong className="mono">{formatMoney(row.original.sell)}</strong>,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last updated',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.updatedAt, true)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row, table }) => (
        <div className="flex gap-2">
          <div className="flex items-center mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Move ${row.original.currency} up`}
              disabled={
                reorder.isPending ||
                !!table.store.state.sorting.length ||
                !!table.store.state.globalFilter ||
                row.index === 0
              }
              onClick={() => {
                const target = query.data?.[row.index - 1]
                if (target) moveRate(row.original.id, target.id)
              }}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Move ${row.original.currency} down`}
              disabled={
                reorder.isPending ||
                !!table.store.state.sorting.length ||
                !!table.store.state.globalFilter ||
                row.index === (query.data?.length || 0) - 1
              }
              onClick={() => {
                const target = query.data?.[row.index + 1]
                if (target) moveRate(row.original.id, target.id)
              }}
            >
              <ArrowDown className="size-3.5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setHistory(row.original)}>
            <History />
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(row.original)
              form.reset({ buy: row.original.buy, sell: row.original.sell })
            }}
          >
            <Pencil />
            Edit
          </Button>
        </div>
      ),
    },
  ]
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="OPERATIONS / EXCHANGE RATES"
        title="Exchange rates"
        description="A clear view of your buy and sell rates, with history at your fingertips."
      >
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw />
          Refresh
        </Button>
      </PageHeader>
      <div className="welcome-note">
        <strong>Rate convention</strong>
        <span>All sample rates are MMK per 1 unit of the listed currency.</span>
        <span>Demo changes reset on refresh</span>
      </div>
      <QueryState loading={query.isPending} error={query.error}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <GripVertical className="size-4" />
          Drag the handle to reorder rates. You can also use the arrow buttons or focus a handle and
          press ↑ / ↓.
        </div>
        <DataTable
          data={query.data || []}
          columns={columns}
          searchPlaceholder="Search currency or country…"
          onReorder={moveRate}
          reorderPending={reorder.isPending}
        />
      </QueryState>
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.currency} / MMK</DialogTitle>
            <DialogDescription>Update the sample rate for this session.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(
              (data) =>
                editing &&
                save.mutate(
                  { id: editing.id, ...data },
                  {
                    onSuccess: () => {
                      setEditing(null)
                      toast.success('Demo rate updated')
                    },
                    onError: (e) => toast.error(e.message),
                  },
                ),
            )}
            className="space-y-5"
          >
            <div className="field-grid">
              <Field id="buy" label="Buy rate" error={form.formState.errors.buy?.message}>
                <Input id="buy" {...form.register('buy')} type="number" step="any" />
              </Field>
              <Field id="sell" label="Sell rate" error={form.formState.errors.sell?.message}>
                <Input id="sell" {...form.register('sell')} type="number" step="any" />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button disabled={save.isPending}>Save rate</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!history}
        onOpenChange={(v) => {
          if (!v) setHistory(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{history?.currency} / MMK · Rate history</DialogTitle>
            <DialogDescription>
              Illustrative sample history · MMK per 1 {history?.currency}
            </DialogDescription>
          </DialogHeader>
          {history && (
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Loading chart…
                </div>
              }
            >
              <RateChart rate={history} />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
