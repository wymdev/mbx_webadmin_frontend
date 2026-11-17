import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ArchiveRestore from 'lucide-react/icons/archive-arrow-up'
import Trash2 from 'lucide-react/icons/trash'
import { PageHeader } from '@/components/page-header'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QueryState } from '@/components/query-state'
import { repository } from '@/services/demo'
import { useDemoMutation } from '@/services/queries'
import type { Transaction, SettingRecord } from '@/domain/models'
import { formatMoney } from '@/lib/utils'
import { toast } from 'sonner'

export default function TrashPage() {
  const transactions = useQuery({
    queryKey: ['trash', 'transactions'],
    queryFn: () => repository.trashedTransactions(),
  })
  const users = useQuery({ queryKey: ['trash', 'users'], queryFn: () => repository.trashedUsers() })
  const [restoring, setRestoring] = useState<{ id: string; kind: 'transaction' | 'user' } | null>(
    null,
  )
  const restore = useDemoMutation((input: { id: string; kind: 'transaction' | 'user' }) =>
    input.kind === 'transaction'
      ? repository.restoreTransaction(input.id)
      : repository.restoreUser(input.id),
  )
  const transactionCols: ColumnDef<Transaction>[] = [
    { accessorKey: 'id', header: 'Transaction' },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'exchangeType', header: 'Type' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatMoney(row.original.amount, row.original.fromCurrency),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRestoring({ id: row.original.id, kind: 'transaction' })}
        >
          <ArchiveRestore />
          Restore
        </Button>
      ),
    },
  ]
  const userCols: ColumnDef<SettingRecord>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'detail', header: 'Email / description' },
    { accessorKey: 'role', header: 'Role' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRestoring({ id: row.original.id, kind: 'user' })}
        >
          <ArchiveRestore />
          Restore
        </Button>
      ),
    },
  ]
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="PERSONAL / RECOVERY"
        title="Trash"
        description="A second chance for removed records. Restore them to your demo workspace."
      />
      <div className="welcome-note">
        <span className="flex items-center gap-2">
          <Trash2 size={15} />
          Trashed demo records are kept until this page is refreshed.
        </span>
        <span>No permanent delete action</span>
      </div>
      <Tabs defaultValue="transactions">
        <TabsList className="mb-5">
          <TabsTrigger value="transactions">
            Transactions ({transactions.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="users">Users ({users.data?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <QueryState loading={transactions.isPending} error={transactions.error}>
            <DataTable data={transactions.data || []} columns={transactionCols} />
          </QueryState>
        </TabsContent>
        <TabsContent value="users">
          <QueryState loading={users.isPending} error={users.error}>
            <DataTable data={users.data || []} columns={userCols} />
          </QueryState>
        </TabsContent>
      </Tabs>
      <Dialog
        open={!!restoring}
        onOpenChange={(v) => {
          if (!v) setRestoring(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this record?</DialogTitle>
            <DialogDescription>
              It will be returned to the active demo{' '}
              {restoring?.kind === 'user' ? 'team members list' : 'transaction ledger'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRestoring(null)}>
              Cancel
            </Button>
            <Button
              disabled={restore.isPending}
              onClick={() =>
                restoring &&
                restore.mutate(restoring, {
                  onSuccess: () => {
                    setRestoring(null)
                    toast.success('Demo record restored')
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              <ArchiveRestore />
              Restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
