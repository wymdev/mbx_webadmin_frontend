import { cn, formatMoney, formatRate } from '@/lib/utils'

export type ReceiptLook = {
  business_name: string
  font_color: string
  logo_url: string | null
  background_url: string | null
}

export type ReceiptTransaction = {
  transaction_id: string
  exchange_type: string
  amount: string
  from_currency: string
  exchange_rate: string
  total: string
  to_currency: string
  customer_name?: string | null
  transfer_method?: string | null
  description?: string | null
}

const safeColor = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? color : '#000000')

/**
 * The MBX receipt. The receipt dialog prints it and the receipt designer previews it, so what staff
 * check in the designer is exactly what customers get. `printable` marks the one the Print button prints.
 */
export function ReceiptView({
  look,
  transaction,
  localTime,
  printable = false,
  className,
}: {
  look: ReceiptLook
  transaction: ReceiptTransaction
  localTime?: string | null
  printable?: boolean
  className?: string
}) {
  const lines: [string, string | null | undefined][] = [
    ['Type', transaction.exchange_type],
    ['Customer', transaction.customer_name],
    ['Amount', formatMoney(transaction.amount, transaction.from_currency)],
    ['Exchange rate', formatRate(transaction.exchange_rate)],
    ['Transfer method', transaction.transfer_method],
    ['Total', formatMoney(transaction.total, transaction.to_currency)],
  ]
  return (
    <article
      className={cn('relative isolate grid gap-3 overflow-hidden rounded-md border bg-white p-5 tabular-nums', printable && 'transaction-print', className)}
      style={{ color: safeColor(look.font_color) }}
    >
      {look.background_url && <img alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" src={look.background_url} />}
      <header className="border-b border-current/20 pb-3">
        {look.logo_url && <img className="mb-2 max-h-12 max-w-36 object-contain" src={look.logo_url} alt="" />}
        <strong className="text-lg">{look.business_name}</strong>
        <p>Exchange receipt #{transaction.transaction_id}</p>
        {localTime && <p>{localTime} (Bangkok)</p>}
      </header>
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        {lines.map(([label, value]) =>
          value ? (
            <div key={label} className="col-span-2 grid grid-cols-subgrid">
              <dt>{label}</dt>
              <dd className={cn('wrap-anywhere text-right font-semibold', label === 'Total' && 'text-base')}>{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {transaction.description && <p className="wrap-anywhere whitespace-pre-wrap border-t border-current/20 pt-3 text-sm">{transaction.description}</p>}
    </article>
  )
}

/** Example invoices for the designer, so the look can be checked against realistic text. */
export const SAMPLE_INVOICES: { id: string; label: string; time: string; transaction: ReceiptTransaction }[] = [
  {
    id: 'sell',
    label: 'Sell · MMK → THB',
    time: '2026-11-25 14:32',
    transaction: {
      transaction_id: '20261125143201',
      exchange_type: 'Sell',
      amount: '1000000.00',
      from_currency: 'MMK',
      exchange_rate: '156.00',
      total: '6410.26',
      to_currency: 'THB',
      customer_name: 'Ko Aung Min',
      transfer_method: 'KBZ Pay',
      description: 'Sent to Bangkok Bank 123-4-56789-0',
    },
  },
  {
    id: 'buy',
    label: 'Buy · THB → MMK',
    time: '2026-11-25 09:05',
    transaction: {
      transaction_id: '20261125090512',
      exchange_type: 'Buy',
      amount: '25000.00',
      from_currency: 'THB',
      exchange_rate: '150.50',
      total: '3762500.00',
      to_currency: 'MMK',
      customer_name: 'Ma Hnin Wai',
      transfer_method: 'Wave Money',
      description: null,
    },
  },
  {
    id: 'long',
    label: 'Long names and note',
    time: '2026-11-25 18:47',
    transaction: {
      transaction_id: '20261125184733',
      exchange_type: 'Sell',
      amount: '125750000.00',
      from_currency: 'MMK',
      exchange_rate: '155.75',
      total: '807383.63',
      to_currency: 'THB',
      customer_name: 'Daw Khin Myat Noe Thandar Aung (Mergui Seafood Trading Co.)',
      transfer_method: 'Kasikorn Bank transfer',
      description: 'Split into two transfers: 500,000 THB today and the rest tomorrow morning. Customer confirmed by Viber call.',
    },
  },
]
