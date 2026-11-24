import type { Receipt } from '@/features/desk/api'
import { formatMoney } from '@/lib/utils'

const safeColor = (value: string) => (/^#[0-9a-f]{6}$/i.test(value) ? value : '#1b2e27')

/** The printable MBX receipt. Printing shows only `.transaction-print` (see index.css). */
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const { transaction: t, look } = receipt
  const rows: [string, string | null][] = [
    ['Customer', t.customer_name],
    ['Type', t.exchange_type],
    ['Amount', formatMoney(t.amount, t.from_currency)],
    ['Rate', t.exchange_rate],
    ['Transfer method', t.transfer_method],
  ]
  return (
    <article
      className="transaction-print relative isolate mx-auto grid w-full max-w-sm gap-4 overflow-hidden rounded-xl border bg-white p-6 text-sm tabular-nums shadow-sm"
      style={{ color: safeColor(look.font_color) }}
    >
      {look.background_url && (
        <img alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-90" src={look.background_url} />
      )}
      <header className="grid justify-items-center gap-1 text-center">
        {look.logo_url && <img className="mb-1 max-h-14 max-w-40 object-contain" src={look.logo_url} alt="" />}
        <strong className="text-base">{look.business_name}</strong>
        <span className="text-xs opacity-80">Exchange receipt · #{t.transaction_id}</span>
        {receipt.local_time && <span className="text-xs opacity-80">{receipt.local_time} (Bangkok)</span>}
      </header>
      <dl className="grid gap-2 border-y border-current/15 py-3">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label} className="flex justify-between gap-4">
              <dt className="opacity-75">{label}</dt>
              <dd className="text-right font-semibold [overflow-wrap:anywhere]">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <div className="grid justify-items-center gap-0.5 text-center">
        <span className="text-xs tracking-wide uppercase opacity-75">Total</span>
        <strong className="text-2xl">{formatMoney(t.total, t.to_currency)}</strong>
      </div>
      {t.description && <p className="border-t border-current/15 pt-3 text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">{t.description}</p>}
      {look.qr_url && <p className="text-center text-[10px] opacity-70">{look.qr_url.replace(/^https?:\/\//, '')}</p>}
    </article>
  )
}

/** Plain-text receipt to paste into Viber, Line or Messenger. */
export function receiptText(receipt: Receipt) {
  const { transaction: t, look } = receipt
  return [
    look.business_name,
    `Receipt #${t.transaction_id}`,
    receipt.local_time ? `${receipt.local_time} (Bangkok)` : null,
    '',
    t.customer_name ? `Customer: ${t.customer_name}` : null,
    `Amount: ${formatMoney(t.amount, t.from_currency)}`,
    `Rate: ${t.exchange_rate}`,
    `Total: ${formatMoney(t.total, t.to_currency)}`,
    t.transfer_method ? `Via: ${t.transfer_method}` : null,
    '',
    'Thank you!',
  ]
    .filter((line) => line !== null)
    .join('\n')
}
