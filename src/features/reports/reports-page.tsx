import { useState } from 'react'
import Download from 'lucide-react/icons/download'
import FileBarChart2 from 'lucide-react/icons/file-chart-column'
import RotateCcw from 'lucide-react/icons/rotate-ccw'
import Decimal from 'decimal.js'
import { PageHeader } from '@/components/page-header'
import { Field, SelectField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { QueryState } from '@/components/query-state'
import { transactionColumns } from '@/features/transactions/columns'
import { ReceiptDialog } from '@/features/transactions/receipt'
import { useTransactions, useSettings } from '@/services/queries'
import type { Transaction } from '@/domain/models'
import { bangkokDate } from '@/domain/money'
import { formatMoney } from '@/lib/utils'
import { downloadTransactions } from './export'
import { useNavigate } from 'react-router-dom'

export default function ReportsPage() {
  const query = useTransactions()
  const navigate = useNavigate()
  const methods = useSettings('methods')
  const methodOptions = [
    'All methods',
    ...new Set([
      ...(methods.data || []).filter((m) => m.active).map((m) => m.name),
      ...(query.data || []).map((t) => t.transferMethod),
    ]),
  ]
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [method, setMethod] = useState('All methods')
  const [type, setType] = useState('All types')
  const [customer, setCustomer] = useState('')
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const invalidRange = !!from && !!to && from > to
  const rows = (query.data || []).filter((t) => {
    const day = bangkokDate(new Date(t.createdAt))
    return (
      !invalidRange &&
      (!from || day >= from) &&
      (!to || day <= to) &&
      (method === 'All methods' || t.transferMethod === method) &&
      (type === 'All types' || t.exchangeType === type) &&
      t.customerName.toLowerCase().includes(customer.toLowerCase())
    )
  })
  const totals = ['THB', 'MMK', 'USD', 'SGD'].map((currency) => ({
    currency,
    count: rows.filter((t) => t.fromCurrency === currency).length,
    total: rows
      .filter((t) => t.fromCurrency === currency)
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))
      .toFixed(2),
  }))
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="OPERATIONS / REPORTS"
        title="Reports"
        description="Turn your transaction ledger into a clear, currency-by-currency view."
      >
        <Button onClick={() => downloadTransactions(rows)} disabled={invalidRange}>
          <Download />
          Export report
        </Button>
      </PageHeader>
      <section className="panel p-5 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <FileBarChart2 size={17} className="text-primary" />
          <h2>Build your report</h2>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setFrom('')
              setTo('')
              setMethod('All methods')
              setType('All types')
              setCustomer('')
            }}
          >
            <RotateCcw />
            Reset
          </Button>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <Field id="report-from" label="From date">
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field
            id="report-to"
            label="To date"
            error={invalidRange ? 'End date must follow start date' : undefined}
          >
            <Input
              id="report-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field id="report-method" label="Transfer method">
            <SelectField
              id="report-method"
              value={method}
              onChange={setMethod}
              options={methodOptions}
            />
          </Field>
          <Field id="report-type" label="Exchange type">
            <SelectField
              id="report-type"
              value={type}
              onChange={setType}
              options={['All types', 'Buy', 'Sell']}
            />
          </Field>
          <Field id="report-customer" label="Customer">
            <Input
              id="report-customer"
              placeholder="Customer name…"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </Field>
        </div>
      </section>
      <QueryState loading={query.isPending} error={query.error}>
        <div className="metric-grid">
          {totals.map((total) => (
            <section className="panel metric-card" key={total.currency}>
              <div className="metric-label">
                Source volume · {total.currency}
                <span className="currency-chip">{total.currency}</span>
              </div>
              <div className="metric-value">{formatMoney(total.total)}</div>
              <p className="metric-caption">{total.count} matching transactions</p>
            </section>
          ))}
        </div>
        <DataTable
          hideSearch
          data={rows}
          searchPlaceholder="Search report records…"
          columns={transactionColumns({
            details: setReceipt,
            edit: (t) => navigate(`/transactions/${t.id}/edit`),
          })}
        />
        <p className="text-[10px] text-muted-foreground mt-3">
          Totals sum source amounts separately by currency. This report does not calculate profit or
          combine different currencies.
        </p>
      </QueryState>
      <ReceiptDialog transaction={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
