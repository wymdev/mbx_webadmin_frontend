import { useEffect, useState } from 'react'
import CircleCheck from 'lucide-react/icons/circle-check'
import Copy from 'lucide-react/icons/copy'
import Printer from 'lucide-react/icons/printer'
import UserRound from 'lucide-react/icons/user-round'
import Zap from 'lucide-react/icons/zap'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ReceiptCard, receiptText } from '@/features/receipts/receipt-card'
import { useReceipt } from './api'

/** Shown after a deal is saved: the receipt, ready to print or paste into the customer's chat. */
export function SavedDeal({ id, onNext, onSameCustomer }: { id: number | null; onNext: () => void; onSameCustomer: () => void }) {
  const receipt = useReceipt(id)
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!receipt.data) return
    try {
      await navigator.clipboard.writeText(receiptText(receipt.data))
      setCopied(true)
      toast.success('Receipt copied. Paste it into the chat.')
    } catch {
      toast.error('Copy is blocked by the browser. Select the receipt text instead.')
    }
  }

  useEffect(() => {
    if (id === null) return
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'enter' || key === 'n') {
        event.preventDefault()
        onNext()
      } else if (key === 's') {
        event.preventDefault()
        onSameCustomer()
      } else if (key === 'p') {
        event.preventDefault()
        window.print()
      } else if (key === 'c') {
        event.preventDefault()
        void copy()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
    // copy reads the latest receipt through the closure on each keydown registration
  })

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onNext()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-md">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-secondary text-primary">
            <CircleCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <DialogTitle>Deal saved</DialogTitle>
            <DialogDescription>
              {receipt.data ? `Receipt #${receipt.data.transaction.transaction_id}` : 'Preparing receipt…'}
            </DialogDescription>
          </div>
        </div>
        {receipt.isPending ? (
          <Skeleton className="h-80" />
        ) : receipt.data ? (
          <ReceiptCard receipt={receipt.data} />
        ) : (
          <p className="text-sm text-destructive">{receipt.error?.message}</p>
        )}
        <div className="grid grid-cols-2 gap-2 no-print">
          <Button variant="outline" onClick={() => window.print()} disabled={!receipt.data}>
            <Printer /> Print <kbd className="ml-auto text-[10px]">P</kbd>
          </Button>
          <Button variant="outline" onClick={copy} disabled={!receipt.data}>
            <Copy /> {copied ? 'Copied' : 'Copy for chat'} <kbd className="ml-auto text-[10px]">C</kbd>
          </Button>
          <Button variant="secondary" onClick={onSameCustomer}>
            <UserRound /> Same customer <kbd className="ml-auto text-[10px]">S</kbd>
          </Button>
          <Button onClick={onNext} autoFocus>
            <Zap /> Next deal <kbd className="ml-auto border-white/30 bg-transparent text-[10px] text-current">Enter</kbd>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
