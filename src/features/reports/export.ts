import type { Transaction } from '@/domain/models'

export function csvCell(value: unknown) {
  const text = String(value ?? '')
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
export function transactionCsv(rows: Transaction[]) {
  const header = [
    'Transaction',
    'Customer',
    'Type',
    'From currency',
    'Amount',
    'Rate',
    'Operation',
    'To currency',
    'Total',
    'Transfer method',
    'Date',
  ]
  return [
    header,
    ...rows.map((t) => [
      t.id,
      t.customerName,
      t.exchangeType,
      t.fromCurrency,
      t.amount,
      t.rate,
      t.operation,
      t.toCurrency,
      t.total,
      t.transferMethod,
      t.createdAt,
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
}
export function downloadTransactions(rows: Transaction[]) {
  const url = URL.createObjectURL(
    new Blob(['\uFEFF', transactionCsv(rows)], { type: 'text/csv;charset=utf-8;' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'mbx-demo-transactions.csv'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
