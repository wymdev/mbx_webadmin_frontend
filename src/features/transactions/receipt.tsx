import type { Transaction } from '@/domain/models'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Printer from 'lucide-react/icons/printer'
import ShieldCheck from 'lucide-react/icons/shield-check'
import { formatMoney, formatDate } from '@/lib/utils'
import { TypeBadge } from './columns'

export function ReceiptDialog({
  transaction,
  onClose,
}: {
  transaction: Transaction | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!transaction}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction receipt</DialogTitle>
          <DialogDescription>Sample receipt · {transaction?.id}</DialogDescription>
        </DialogHeader>
        {transaction && (
          <div className="receipt">
            <div className="text-center mb-6">
              <div className="brand-symbol mx-auto mb-2">
                m<span>↗</span>
              </div>
              <h2>Mergui Boss Money Exchange</h2>
              <p className="text-[10px] text-muted-foreground mt-1">MBX Ledger · Demo receipt</p>
            </div>
            <div className="flex items-center justify-between mb-3">
              <strong>{transaction.id}</strong>
              <TypeBadge type={transaction.exchangeType} />
            </div>
            {[
              ['Customer', transaction.customerName],
              ['Phone', transaction.phone],
              [
                'Identity',
                transaction.identityType === 'passport' ? transaction.passport : transaction.nrc,
              ],
              ['Date', formatDate(transaction.createdAt, true)],
              ['Transfer method', transaction.transferMethod],
              ['Amount', formatMoney(transaction.amount, transaction.fromCurrency)],
              [
                'Exchange rate',
                `${transaction.operation === 'multiply' ? '×' : '÷'} ${transaction.rate}`,
              ],
              ['Customer source', transaction.source],
            ].map(([label, value]) => (
              <div className="summary-row" key={label}>
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
            <div className="summary-total text-center">
              <span>Exchanged amount</span>
              <strong>{formatMoney(transaction.total, transaction.toCurrency)}</strong>
            </div>
            {transaction.description && (
              <p className="mt-4 text-xs text-muted-foreground">{transaction.description}</p>
            )}
            <p className="text-[9px] text-muted-foreground mt-5 text-center flex items-center justify-center gap-1">
              <ShieldCheck size={12} />
              Fictional demo data · Not a payment confirmation
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 no-print">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Print receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
