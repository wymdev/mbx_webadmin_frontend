import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Plus from 'lucide-react/icons/plus'
import ArrowLeftRight from 'lucide-react/icons/arrow-left-right'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDemoMutation, useTransactions } from '@/services/queries'
import { repository } from '@/services/demo'
import type { Transaction } from '@/domain/models'
import { transactionColumns } from './columns'
import { ReceiptDialog } from './receipt'
import { downloadTransactions } from '@/features/reports/export'
import { toast } from 'sonner'

export default function TransactionsPage() {
  const query = useTransactions()
  const [type, setType] = useState('all')
  const [currency, setCurrency] = useState('all')
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const [toTrash, setToTrash] = useState<Transaction | null>(null)
  const navigate = useNavigate()
  const trash = useDemoMutation((id: string) => repository.trashTransaction(id))
  const rows = (query.data || []).filter(
    (t) =>
      (type === 'all' || t.exchangeType === type) &&
      (currency === 'all' || t.fromCurrency === currency),
  )
  const columns = transactionColumns({
    details: setReceipt,
    edit: (t) => navigate(`/transactions/${t.id}/edit`),
    trash: setToTrash,
  })
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="OPERATIONS / TRANSACTION LEDGER"
        title="Transactions"
        count={query.data?.length}
        description="Every exchange, organized. Find, review, and manage your daily transactions."
      >
        <Button onClick={() => navigate('/transactions/new')}>
          <Plus />
          New transaction
        </Button>
      </PageHeader>
      <div className="welcome-note">
        <span className="flex items-center gap-2">
          <ArrowLeftRight size={15} className="text-primary" />
          <strong>Your complete transaction ledger</strong>
          <span className="hidden sm:inline">· Buy and sell across currencies</span>
        </span>
        <span>Session-local demo records</span>
      </div>
      <QueryState loading={query.isPending} error={query.error} retry={() => query.refetch()}>
        <DataTable
          data={rows}
          columns={columns}
          searchPlaceholder="Search customer, ID, currency…"
          virtualAvailable
          exportAction={downloadTransactions}
          filters={
            <>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 w-28" aria-label="Exchange type filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-8 w-32" aria-label="Currency filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {['THB', 'MMK', 'USD', 'SGD'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        />
      </QueryState>
      <ReceiptDialog transaction={receipt} onClose={() => setReceipt(null)} />
      <Dialog
        open={!!toTrash}
        onOpenChange={(v) => {
          if (!v) setToTrash(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move transaction to trash?</DialogTitle>
            <DialogDescription>
              {toTrash?.id} will be removed from the active ledger. You can restore it from Trash
              during this demo session.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setToTrash(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={trash.isPending}
              onClick={() => {
                if (toTrash)
                  trash.mutate(toTrash.id, {
                    onSuccess: () => {
                      setToTrash(null)
                      toast.success('Transaction moved to demo trash')
                    },
                    onError: (e) => toast.error(e.message),
                  })
              }}
            >
              Move to trash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
