import { compareDecimals } from '@/domain/money'
import type { ColumnDef } from '@/components/data-table'
import type { Transaction } from '@/domain/models'
import { selectionColumn } from '@/components/data-table'
import ArrowDownLeft from 'lucide-react/icons/arrow-down-left'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import Eye from 'lucide-react/icons/eye'
import MoreHorizontal from 'lucide-react/icons/ellipsis'
import Pencil from 'lucide-react/icons/pencil'
import ReceiptText from 'lucide-react/icons/receipt-text'
import Trash2 from 'lucide-react/icons/trash'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatMoney, initials } from '@/lib/utils'

export function transactionColumns({
  details,
  edit,
  trash,
}: {
  details: (t: Transaction) => void
  edit: (t: Transaction) => void
  trash?: (t: Transaction) => void
}): ColumnDef<Transaction>[] {
  return [
    selectionColumn<Transaction>(),
    {
      accessorKey: 'id',
      header: 'Transaction',
      cell: ({ row }) => (
        <button
          onClick={() => details(row.original)}
          className="font-semibold text-primary hover:underline"
        >
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div className="person-cell">
          <span className="person-avatar">{initials(row.original.customerName)}</span>
          <div>
            <strong>{row.original.customerName}</strong>
            <small>{row.original.phone}</small>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'exchangeType',
      header: 'Type',
      cell: ({ row }) => <TypeBadge type={row.original.exchangeType} />,
    },
    {
      id: 'amount',
      accessorFn: (row) => `${row.amount} ${row.fromCurrency}`,
      header: 'Amount',
      sortFn: (a, b) => compareDecimals(a.original.amount, b.original.amount),
      cell: ({ row }) => (
        <div className="font-semibold mono">
          {formatMoney(row.original.amount)}{' '}
          <span className="text-[9px] text-muted-foreground font-medium">
            {row.original.fromCurrency}
          </span>
        </div>
      ),
    },
    {
      id: 'total',
      accessorFn: (row) => `${row.total} ${row.toCurrency}`,
      header: 'Exchanged',
      sortFn: (a, b) => compareDecimals(a.original.total, b.original.total),
      cell: ({ row }) => (
        <div className="mono">
          {formatMoney(row.original.total)}{' '}
          <span className="text-[9px] text-muted-foreground">{row.original.toCurrency}</span>
        </div>
      ),
    },
    {
      accessorKey: 'transferMethod',
      header: 'Method',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.transferMethod}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Actions for ${row.original.id}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => details(row.original)}>
              <Eye />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => edit(row.original)}>
              <Pencil />
              Edit transaction
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => details(row.original)}>
              <ReceiptText />
              Receipt preview
            </DropdownMenuItem>
            {trash && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => trash(row.original)}>
                  <Trash2 />
                  Move to trash
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
export function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`type-badge ${type === 'Sell' ? 'sell' : ''}`}>
      {type === 'Buy' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
      {type}
    </span>
  )
}
