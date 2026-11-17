import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ArrowDownLeft from 'lucide-react/icons/arrow-down-left'
import ArrowRight from 'lucide-react/icons/arrow-right'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import ArrowLeftRight from 'lucide-react/icons/arrow-left-right'
import CalendarDays from 'lucide-react/icons/calendar-days'
import ChevronRight from 'lucide-react/icons/chevron-right'
import Download from 'lucide-react/icons/download'
import Plus from 'lucide-react/icons/plus'
import UsersRound from 'lucide-react/icons/users-round'
import Wallet from 'lucide-react/icons/wallet'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QueryState } from '@/components/query-state'
import { useTransactions, useRates } from '@/services/queries'
import { formatDate, formatMoney, initials } from '@/lib/utils'
import { TypeBadge } from '@/features/transactions/columns'
import { ReceiptDialog } from '@/features/transactions/receipt'
import type { Transaction } from '@/domain/models'
import { downloadTransactions } from '@/features/reports/export'
import { bangkokDate, sumAmounts } from '@/domain/money'

const colors = ['#176649', '#f0bf52', '#a0bdaa']
export default function DashboardPage() {
  const transactions = useTransactions()
  const rates = useRates()
  const navigate = useNavigate()
  const [date, setDate] = useState(bangkokDate(new Date()))
  const [currency, setCurrency] = useState('THB')
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const rows = useMemo(() => transactions.data || [], [transactions.data])
  const daily = rows.filter((t) => bangkokDate(new Date(t.createdAt)) === date)
  const scoped = daily.filter((t) => t.fromCurrency === currency)
  const total = sumAmounts(scoped.map((t) => t.amount))
  const buy = daily.filter((t) => t.exchangeType === 'Buy').length
  const sell = daily.filter((t) => t.exchangeType === 'Sell').length
  const chart = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(`${date}T12:00:00+07:00`)
        day.setUTCDate(day.getUTCDate() - 6 + index)
        const key = bangkokDate(day)
        const items = rows.filter(
          (t) => bangkokDate(new Date(t.createdAt)) === key && t.fromCurrency === currency,
        )
        return {
          day: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Bangkok' }).format(
            day,
          ),
          Buy: Number(
            sumAmounts(items.filter((t) => t.exchangeType === 'Buy').map((t) => t.amount)),
          ),
          Sell: Number(
            sumAmounts(items.filter((t) => t.exchangeType === 'Sell').map((t) => t.amount)),
          ),
        }
      }),
    [rows, date, currency],
  )
  const methods = [...new Set(daily.map((t) => t.transferMethod))].map((name, index) => ({
    name,
    value: daily.filter((t) => t.transferMethod === name).length,
    color: colors[index % colors.length],
  }))
  return (
    <div className="page-enter">
      <PageHeader
        title="Overview"
        description="Welcome back, Alex. Here’s what’s happening at Mergui Boss."
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarDays />
              {formatDate(`${date}T12:00:00+07:00`)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <label htmlFor="overview-date" className="text-xs font-semibold block mb-2">
              Overview date
            </label>
            <Input
              id="overview-date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </PopoverContent>
        </Popover>
        <Button size="sm" onClick={() => navigate('/transactions/new')}>
          <Plus />
          New transaction
        </Button>
      </PageHeader>
      <QueryState
        loading={transactions.isPending || rates.isPending}
        error={transactions.error || rates.error}
        retry={() => {
          transactions.refetch()
          rates.refetch()
        }}
      >
        <div className="welcome-note">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            <strong>Good to see you.</strong> Your daily operations, all in one place.
          </span>
          <span className="flex items-center gap-1">
            Bangkok, Thailand <span className="opacity-40 px-1">/</span> ICT · UTC+7
          </span>
        </div>
        <div className="metric-grid">
          <Metric
            label={`Exchanged volume · ${currency}`}
            value={formatMoney(total)}
            icon={Wallet}
            featured
            caption="Source amounts · selected date"
            tag={currency}
          />
          <Metric
            label="Total transactions"
            value={daily.length.toLocaleString()}
            icon={ArrowLeftRight}
            caption="Across all currencies"
            tag="Selected date"
          />
          <Metric
            label="Buy transactions"
            value={buy.toLocaleString()}
            icon={ArrowDownLeft}
            caption="Customer buys · selected date"
            tag={`${daily.length ? Math.round((buy / daily.length) * 100) : 0}% of total`}
          />
          <Metric
            label="Sell transactions"
            value={sell.toLocaleString()}
            icon={ArrowUpRight}
            caption="Customer sells · selected date"
            tag={`${daily.length ? Math.round((sell / daily.length) * 100) : 0}% of total`}
          />
        </div>
        <div className="dashboard-charts">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Exchange activity</h2>
                <p className="panel-subtitle">Your exchange volume over the last 7 days</p>
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-7 w-20 text-xs" aria-label="Chart currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['THB', 'MMK', 'USD', 'SGD'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="chart-summary">
              <strong>
                {formatMoney(
                  sumAmounts(
                    rows
                      .filter(
                        (t) =>
                          t.fromCurrency === currency &&
                          bangkokDate(new Date(t.createdAt)) <= date &&
                          bangkokDate(new Date(t.createdAt)) >=
                            bangkokDate(
                              new Date(new Date(`${date}T12:00:00+07:00`).getTime() - 6 * 86400000),
                            ),
                      )
                      .map((t) => t.amount),
                  ),
                )}
              </strong>
              <span className="currency-chip">{currency}</span>
              <div className="ml-auto chart-legend">
                <span>
                  <i className="legend-dot bg-[#176649]" />
                  Buy
                </span>
                <span>
                  <i className="legend-dot bg-[#e8b746]" />
                  Sell
                </span>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="buyArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#176649" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#176649" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sellArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8b746" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#e8b746" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 4" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                    }
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v) => formatMoney(Number(v), currency)}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="Buy"
                    stroke="#176649"
                    fill="url(#buyArea)"
                    strokeWidth={2.3}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="Sell"
                    stroke="#e8b746"
                    fill="url(#sellArea)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Transfer methods</h2>
                <p className="panel-subtitle">How your customers exchange</p>
              </div>
              <span className="currency-chip">{daily.length} total</span>
            </div>
            <div className="donut-body">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={methods}
                    dataKey="value"
                    innerRadius={64}
                    outerRadius={81}
                    paddingAngle={4}
                    cornerRadius={4}
                    stroke="none"
                  >
                    {methods.map((m) => (
                      <Cell key={m.name} fill={m.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{daily.length}</strong>
                <span>Transactions</span>
              </div>
            </div>
            <div className="method-list">
              {methods.map((m) => (
                <div className="method-item" key={m.name}>
                  <span>
                    <i className="legend-dot" style={{ background: m.color }} />
                    {m.name}
                  </span>
                  <span className="font-semibold">
                    {m.value}{' '}
                    <span className="text-muted-foreground font-normal ml-2">
                      {daily.length ? Math.round((m.value / daily.length) * 100) : 0}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
        <section className="panel">
          <div className="panel-heading pb-0">
            <div>
              <h2>Exchange rates</h2>
              <p className="panel-subtitle">Indicative sample rates · quoted in MMK per 1 unit</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-[10px]"
              onClick={() => navigate('/rates')}
            >
              Manage rates
              <ArrowRight />
            </Button>
          </div>
          <div className="rate-strip">
            {rates.data?.slice(0, 4).map((rate) => (
              <div className="rate-item" key={rate.id}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="flag">{rate.flag}</span>
                  <div className="flex-1">
                    <strong className="text-[11px]">
                      {rate.currency}
                      <span className="text-muted-foreground font-normal"> / MMK</span>
                    </strong>
                    <p className="muted-small">{rate.country}</p>
                  </div>
                  <span className="text-primary text-[9px]">Sample</span>
                </div>
                <div className="flex justify-between gap-4">
                  <div>
                    <span className="muted-small">Buy</span>
                    <p className="rate-number">{formatMoney(rate.buy)}</p>
                  </div>
                  <div className="text-right">
                    <span className="muted-small">Sell</span>
                    <p className="rate-number">{formatMoney(rate.sell)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel section-gap overflow-hidden">
          <div className="panel-heading">
            <div>
              <h2>Recent transactions</h2>
              <p className="panel-subtitle">The latest activity from your workspace</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => downloadTransactions(rows.slice(0, 5))}
              >
                <Download />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/transactions')}>
                View all
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Exchanged</th>
                  <th>Method</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button className="font-semibold text-primary" onClick={() => setReceipt(t)}>
                        {t.id}
                      </button>
                    </td>
                    <td>
                      <div className="person-cell">
                        <span className="person-avatar">{initials(t.customerName)}</span>
                        <div>
                          <strong>{t.customerName}</strong>
                          <small>{formatDate(t.createdAt, true)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <TypeBadge type={t.exchangeType} />
                    </td>
                    <td className="font-semibold mono">
                      {formatMoney(t.amount)} <span className="muted-small">{t.fromCurrency}</span>
                    </td>
                    <td className="mono">
                      {formatMoney(t.total)} <span className="muted-small">{t.toCurrency}</span>
                    </td>
                    <td className="text-muted-foreground">{t.transferMethod}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setReceipt(t)}
                        aria-label={`View ${t.id}`}
                      >
                        <ArrowUpRight />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UsersRound size={12} />
              {new Set(rows.map((t) => t.customerName)).size} customers in your ledger
            </span>
            <span>
              Showing {Math.min(rows.length, 5)} of {rows.length.toLocaleString()} transactions
            </span>
          </div>
        </section>
      </QueryState>
      <ReceiptDialog transaction={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
function Metric({
  label,
  value,
  icon: Icon,
  caption,
  tag,
  featured,
}: {
  label: string
  value: string
  icon: typeof Wallet
  caption: string
  tag: string
  featured?: boolean
}) {
  return (
    <section className={`panel metric-card ${featured ? 'metric-featured' : ''}`}>
      <div className="metric-label">
        {label}
        <span className="metric-icon">
          <Icon size={15} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-caption">
        <span className="metric-tag">{tag}</span>
        <span>{caption}</span>
      </div>
    </section>
  )
}
