import { useState } from 'react'
import Eye from 'lucide-react/icons/eye'
import UsersRound from 'lucide-react/icons/users-round'
import { PageHeader } from '@/components/page-header'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCustomers, useTransactions } from '@/services/queries'
import { QueryState } from '@/components/query-state'
import type { Customer } from '@/domain/models'
import { initials, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function CustomersPage() {
  const query = useCustomers()
  const transactions = useTransactions()
  const [selected, setSelected] = useState<Customer | null>(null)
  const navigate = useNavigate()
  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="person-cell">
          <span className="person-avatar">{initials(row.original.name)}</span>
          <div>
            <strong>{row.original.name}</strong>
            <small>{row.original.id}</small>
          </div>
        </div>
      ),
    },
    { accessorKey: 'phone', header: 'Phone number' },
    {
      accessorKey: 'identityType',
      header: 'Identity',
      cell: ({ row }) => <span className="type-badge uppercase">{row.original.identityType}</span>,
    },
    { accessorKey: 'nationality', header: 'Nationality' },
    { accessorKey: 'source', header: 'Source' },
    {
      id: 'exchanges',
      header: 'Transactions',
      cell: ({ row }) =>
        transactions.data?.filter((t) => t.customerName === row.original.name).length || 0,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>
          <Eye />
          View
        </Button>
      ),
    },
  ]
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="WORKSPACE / CUSTOMERS"
        title="Customers"
        count={query.data?.length}
        description="The people behind every exchange. All your customer details, together."
      >
        <Button onClick={() => navigate('/transactions/new')}>
          <UsersRound />
          Add via transaction
        </Button>
      </PageHeader>
      <QueryState loading={query.isPending} error={query.error}>
        <DataTable
          data={query.data || []}
          columns={columns}
          searchPlaceholder="Search name, phone or source…"
        />
      </QueryState>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer details</DialogTitle>
            <DialogDescription>Fictional customer record · {selected?.id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="person-cell mb-3">
                <span className="person-avatar size-12 text-sm">{initials(selected.name)}</span>
                <div>
                  <h2>{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                </div>
              </div>
              {[
                ['Nationality', selected.nationality],
                ['Identity type', selected.identityType.toUpperCase()],
                [
                  'Identity number',
                  selected.identityType === 'passport' ? selected.passport : selected.nrc,
                ],
                ['Customer source', selected.source],
                ['Customer since', formatDate(selected.createdAt)],
              ].map(([k, v]) => (
                <div className="summary-row" key={k}>
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <Button className="mt-4" onClick={() => navigate('/transactions/new')}>
                Create an exchange
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
