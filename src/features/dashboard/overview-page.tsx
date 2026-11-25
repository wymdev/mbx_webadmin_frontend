import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Area,
  AreaChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ArrowDownRight from 'lucide-react/icons/arrow-down-right'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import ChartColumn from 'lucide-react/icons/chart-column'
import Table2 from 'lucide-react/icons/table-2'
import Zap from 'lucide-react/icons/zap'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryState } from '@/components/query-state'
import { bangkokDate } from '@/domain/money'
import { cn, formatDate, formatMoney, formatRate, timeAgo } from '@/lib/utils'
import { useNow } from '@/lib/use-now'
import { useRates } from '@/features/desk/api'
import { useAnalytics, useRateChart, type Analytics, type Breakdown, type Kpis } from './api'
import { Combobox } from '@/components/ui/combobox'
import { DateRangePicker } from '@/components/ui/date-picker'

// ---------- dates & numbers ----------

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('en')
const short = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

type Preset = 'today' | '7d' | '30d' | '90d' | 'month' | 'custom'
const presets: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'month', label: 'This month' },
]
function presetRange(preset: Exclude<Preset, 'custom'>, today: string) {
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case '90d':
      return { from: addDays(today, -89), to: today }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today }
  }
}

// ---------- page ----------

export default function OverviewPage() {
  const today = bangkokDate(new Date())
  const [preset, setPreset] = useState<Preset>('30d')
  const [range, setRange] = useState(() => presetRange('30d', today))
  const analytics = useAnalytics(range.from, range.to)
  const data = analytics.data

  return (
    <div className="page-enter grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business at Mergui Boss · {formatDate(`${range.from}T00:00:00+07:00`)}
            {range.from !== range.to && ` – ${formatDate(`${range.to}T00:00:00+07:00`)}`} (Bangkok)
          </p>
        </div>
        <Button asChild className="bg-[var(--gold)] font-bold text-[#17311f] hover:bg-[var(--gold)] hover:brightness-105">
          <Link to="/desk">
            <Zap /> New deal
          </Link>
        </Button>
      </div>

      {/* One filter row scopes every chart on the page. */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-xs">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => {
                setPreset(p.id)
                setRange(presetRange(p.id, today))
              }}
              className="h-8 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
        <DateRangePicker
          className="w-72 max-w-full"
          aria-label="Custom period"
          value={range}
          max={today}
          onChange={(next) => {
            setPreset('custom')
            setRange(next)
          }}
        />
        {data && (
          <span className="text-xs text-muted-foreground">
            Compared with {short(data.previous_period.from)} – {short(data.previous_period.to)}
          </span>
        )}
      </div>

      <QueryState loading={analytics.isPending} error={analytics.error} retry={analytics.refetch}>
        {data && (
          <div className={cn('grid gap-6 transition-opacity', analytics.isPlaceholderData && 'opacity-60')}>
            <KpiGrid current={data.kpis} previous={data.previous_kpis} days={data.period.days} />

            <div className="grid gap-6 xl:grid-cols-3">
              <DailyChart data={data} className="xl:col-span-2" />
              <RateTrend from={range.from === range.to ? addDays(range.to, -13) : range.from} to={range.to} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <BusyHours rows={data.hourly} className="xl:col-span-2" />
              <Ranked title="Transfer methods" description="How customers pay" rows={data.transfer_methods} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Ranked title="Customer sources" description="Where deals come from" rows={data.customer_sources} />
              <Ranked title="Team performance" description="Deals recorded by each staff member" rows={data.staff} />
              <PairsTable rows={data.pairs} />
            </div>

            <TopCustomers rows={data.top_customers} />
          </div>
        )}
      </QueryState>
    </div>
  )
}

// ---------- KPI tiles ----------

function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}

function KpiGrid({ current, previous, days }: { current: Kpis; previous: Kpis; days: number }) {
  const tiles: { label: string; value: string; unit?: string; now: number; before: number; note?: string }[] = [
    {
      label: 'Deals',
      value: whole.format(current.deals),
      now: current.deals,
      before: previous.deals,
      note: `${whole.format(current.buy)} buy · ${whole.format(current.sell)} sell`,
    },
    { label: 'THB volume', value: compact.format(Number(current.thb_volume)), unit: 'THB', now: Number(current.thb_volume), before: Number(previous.thb_volume) },
    { label: 'MMK volume', value: compact.format(Number(current.mmk_volume)), unit: 'MMK', now: Number(current.mmk_volume), before: Number(previous.mmk_volume) },
    { label: 'Customers served', value: whole.format(current.customers), now: current.customers, before: previous.customers },
    { label: 'New customers', value: whole.format(current.new_customers), now: current.new_customers, before: previous.new_customers },
    { label: 'Average deal', value: compact.format(Number(current.average_thb)), unit: 'THB', now: Number(current.average_thb), before: Number(previous.average_thb) },
  ]
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
      {tiles.map((tile) => {
        const delta = change(tile.now, tile.before)
        const up = delta !== null && delta >= 0
        return (
          <Card key={tile.label}>
            <CardContent className="grid gap-1 p-4 sm:p-5">
              <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
              <p className="text-[26px] leading-tight font-extrabold tracking-tight">
                {tile.value}
                {tile.unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{tile.unit}</span>}
              </p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {delta === null ? (
                  <span className="font-semibold text-[var(--delta-up)]">New</span>
                ) : (
                  <span className={cn('inline-flex items-center font-semibold', up ? 'text-[var(--delta-up)]' : 'text-[var(--delta-down)]')}>
                    {up ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
                    {up ? '+' : ''}
                    {(delta * 100).toFixed(1)}%
                  </span>
                )}
                <span>vs previous {days === 1 ? 'day' : `${days} days`}</span>
              </p>
              {tile.note && <p className="text-xs text-muted-foreground">{tile.note}</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ---------- shared chart pieces ----------

const axis = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false } as const

type TooltipProps = {
  active?: boolean
  label?: unknown
  payload?: readonly { dataKey?: unknown; name?: unknown; value?: unknown; color?: string }[]
  unit?: string
}

function ChartTooltip({ active, payload, label, unit }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-40 rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold">
        {/^\d{4}-\d{2}-\d{2}$/.test(String(label)) ? formatDate(`${String(label)}T00:00:00+07:00`) : String(label ?? '')}
      </p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
            {String(item.name ?? '')}
          </span>
          <span className="font-semibold tabular-nums">
            {typeof item.value === 'number' ? (unit ? formatMoney(item.value, unit) : whole.format(item.value)) : String(item.value ?? '')}
          </span>
        </p>
      ))}
    </div>
  )
}

function ViewToggle({ table, onChange }: { table: boolean; onChange: (table: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="View">
      {[
        { on: false, icon: ChartColumn, label: 'Chart' },
        { on: true, icon: Table2, label: 'Table' },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={table === option.on}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.on)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
        >
          <option.icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function Segment<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className="h-7 rounded-md px-2.5 text-xs font-semibold text-muted-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-xs"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[var(--card-header)] text-xs text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn('px-3 py-2 font-semibold', i === 0 ? 'text-left' : 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, i) => (
                <td key={i} className={cn('px-3 py-1.5 tabular-nums', i === 0 ? 'text-left' : 'text-right')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- deals per day ----------

function DailyChart({ data, className }: { data: Analytics; className?: string }) {
  const [metric, setMetric] = useState<'deals' | 'thb'>('deals')
  const [table, setTable] = useState(false)
  const rows = useMemo(() => data.daily.map((d) => ({ ...d, thb: Number(d.thb_volume) })), [data.daily])
  const total = metric === 'deals' ? whole.format(data.kpis.deals) : formatMoney(data.kpis.thb_volume, 'THB')
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{metric === 'deals' ? 'Deals per day' : 'THB volume per day'}</CardTitle>
          <CardDescription>
            {total} in {data.period.days === 1 ? 'one day' : `${data.period.days} days`}
          </CardDescription>
        </div>
        <CardAction>
          <Segment
            label="Measure"
            value={metric}
            onChange={setMetric}
            options={[
              { id: 'deals', label: 'Deals' },
              { id: 'thb', label: 'THB volume' },
            ]}
          />
          <ViewToggle table={table} onChange={setTable} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {table ? (
          <DataTable
            head={['Date', 'Buy', 'Sell', 'THB volume']}
            rows={[...data.daily].reverse().map((d) => [short(d.date), d.buy, d.sell, formatMoney(d.thb_volume)])}
          />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {metric === 'deals' ? (
                <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tickFormatter={short} {...axis} axisLine={false} minTickGap={16} />
                  <YAxis {...axis} axisLine={false} allowDecimals={false} width={44} />
                  <Tooltip cursor={{ fill: 'var(--muted)' }} content={(props) => <ChartTooltip {...props} />} />
                  <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="buy" name="Buy" stackId="deals" fill="var(--chart-1)" stroke="var(--card)" strokeWidth={1} />
                  <Bar dataKey="sell" name="Sell" stackId="deals" fill="var(--chart-2)" stroke="var(--card)" strokeWidth={1} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="thb-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tickFormatter={short} {...axis} axisLine={false} minTickGap={16} />
                  <YAxis {...axis} axisLine={false} tickFormatter={(v: number) => compact.format(v)} width={52} />
                  <Tooltip content={(props) => <ChartTooltip {...props} unit="THB" />} />
                  <Area type="monotone" dataKey="thb" name="THB volume" stroke="var(--chart-1)" strokeWidth={2} fill="url(#thb-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- rate trend ----------

function RateTrend({ from, to }: { from: string; to: string }) {
  const rates = useRates()
  const now = useNow()
  const [picked, setPicked] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const rate = rates.data?.find((r) => r.id === picked) ?? rates.data?.find((r) => r.currency === 'THB') ?? rates.data?.[0]
  const chart = useRateChart(rate?.id ?? null, from, to)
  const points = useMemo(() => (chart.data ?? []).map((p) => ({ date: p.date, buy: Number(p.buy), sell: Number(p.sell) })), [chart.data])
  const first = points[0]
  const last = points.at(-1)
  const move = first && last && first.buy ? (last.buy - first.buy) / first.buy : null
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Rate trend</CardTitle>
          <CardDescription>MMK per 1 {rate?.currency ?? 'unit'} · daily close</CardDescription>
        </div>
        <CardAction>
          <Combobox
            size="sm"
            aria-label="Currency"
            className="w-28"
            triggerClassName="font-semibold"
            searchPlaceholder="Search currency"
            value={rate ? String(rate.id) : ''}
            onChange={(next) => setPicked(Number(next))}
            options={(rates.data ?? []).map((r) => ({ value: String(r.id), label: r.currency }))}
          />
          <ViewToggle table={table} onChange={setTable} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rate && (
          <div className="grid grid-cols-2 gap-3">
            {(['buy', 'sell'] as const).map((side) => (
              <div key={side} className="rounded-lg border bg-[var(--card-header)] px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  <span className="size-2 rounded-full" style={{ background: side === 'buy' ? 'var(--chart-1)' : 'var(--chart-2)' }} aria-hidden="true" />
                  {side}
                </p>
                <p className="text-xl font-extrabold">{formatRate(rate[side])}</p>
              </div>
            ))}
            <p className="col-span-2 text-xs text-muted-foreground">
              Board updated {timeAgo(rate.updated_at, now)}
              {move !== null && (
                <>
                  {' · '}
                  <span className={cn('font-semibold', move >= 0 ? 'text-[var(--delta-up)]' : 'text-[var(--delta-down)]')}>
                    {move >= 0 ? '+' : ''}
                    {(move * 100).toFixed(2)}%
                  </span>{' '}
                  buy over the period
                </>
              )}
            </p>
          </div>
        )}
        {chart.isPending && rate ? (
          <Skeleton className="h-48" />
        ) : !points.length ? (
          <p className="grid h-48 place-items-center text-sm text-muted-foreground">No rate changes in this period.</p>
        ) : table ? (
          <DataTable head={['Date', 'Buy', 'Sell']} rows={[...points].reverse().map((p) => [short(p.date), formatRate(p.buy), formatRate(p.sell)])} />
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" tickFormatter={short} {...axis} axisLine={false} minTickGap={24} />
                <YAxis {...axis} axisLine={false} domain={['auto', 'auto']} width={48} tickFormatter={(v: number) => compact.format(v)} />
                <Tooltip content={(props) => <ChartTooltip {...props} />} />
                <Legend verticalAlign="top" align="right" height={24} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="buy" name="Buy" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} />
                <Line type="monotone" dataKey="sell" name="Sell" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- busy hours ----------

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function BusyHours({ rows, className }: { rows: Analytics['hourly']; className?: string }) {
  const grid = useMemo(() => {
    const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
    for (const r of rows) cells[r.weekday][r.hour] = r.count
    return cells
  }, [rows])
  const max = Math.max(1, ...rows.map((r) => r.count))
  const peak = rows.reduce<(typeof rows)[number] | null>((best, r) => (!best || r.count > best.count ? r : best), null)
  const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Busy hours</CardTitle>
          <CardDescription>
            Deals by weekday and hour (Bangkok)
            {peak && ` · busiest ${weekdays[peak.weekday]} ${hourLabel(peak.hour)}–${hourLabel((peak.hour + 1) % 24)}`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-[3px] text-[10px]">
            <thead>
              <tr>
                <th scope="col" className="w-9" />
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} scope="col" className="font-medium text-muted-foreground">
                    {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((hours, day) => (
                <tr key={day}>
                  <th scope="row" className="pr-2 text-left text-xs font-medium text-muted-foreground">
                    {weekdays[day]}
                  </th>
                  {hours.map((count, hour) => {
                    const share = count / max
                    return (
                      <td
                        key={hour}
                        title={`${weekdays[day]} ${hourLabel(hour)}: ${count} deals`}
                        aria-label={`${weekdays[day]} ${hourLabel(hour)}: ${count} deals`}
                        className="h-7 rounded-[4px] transition-transform hover:scale-110"
                        style={{
                          background: count
                            ? `color-mix(in oklab, var(--chart-1) ${Math.round(12 + share * 88)}%, var(--card))`
                            : 'var(--muted)',
                        }}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          Fewer
          {[0.12, 0.34, 0.56, 0.78, 1].map((p) => (
            <span
              key={p}
              className="size-3 rounded-[3px]"
              style={{ background: `color-mix(in oklab, var(--chart-1) ${Math.round(p * 100)}%, var(--card))` }}
              aria-hidden="true"
            />
          ))}
          More · peak {whole.format(max)} deals
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- ranked breakdowns ----------

function Ranked({ title, description, rows }: { title: string; description: string; rows: Breakdown }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">No deals in this period.</p>
        ) : (
          <ul className="grid gap-3">
            {rows.slice(0, 8).map((row) => (
              <li key={row.name} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    <strong className="text-sm text-foreground">{whole.format(row.count)}</strong> ·{' '}
                    {total ? Math.round((row.count / total) * 100) : 0}% · {compact.format(Number(row.thb_volume))} THB
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-[var(--chart-1)]" style={{ width: `${(row.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
            {rows.length > 8 && <li className="text-xs text-muted-foreground">+ {rows.length - 8} more</li>}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function PairsTable({ rows }: { rows: Analytics['pairs'] }) {
  return (
    <TableCard title="Currency pairs" description="Each currency summed on its own">
      <table className="w-full text-sm">
        <thead className="bg-[var(--card-header)] text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-2 text-left font-semibold">Pair</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Deals</th>
            <th scope="col" className="px-5 py-2 text-right font-semibold">Sent → received</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.slice(0, 8).map((row) => (
            <tr key={`${row.from_currency}-${row.to_currency}`}>
              <td className="px-5 py-2 font-semibold whitespace-nowrap">
                {row.from_currency} → {row.to_currency}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{whole.format(row.count)}</td>
              <td className="px-5 py-2 text-right text-xs tabular-nums text-muted-foreground">
                {compact.format(Number(row.amount_sum))} {row.from_currency} → {compact.format(Number(row.total_sum))} {row.to_currency}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  )
}

function TopCustomers({ rows }: { rows: Analytics['top_customers'] }) {
  const now = useNow()
  return (
    <TableCard title="Top customers" description="By THB volume in this period">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-[var(--card-header)] text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-10 px-5 py-2 text-left font-semibold">#</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Customer</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Deals</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">THB volume</th>
              <th scope="col" className="px-5 py-2 text-right font-semibold">Last deal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={row.customer_id ?? index} className="hover:bg-muted/50">
                <td className="px-5 py-2.5 text-muted-foreground tabular-nums">{index + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="block font-semibold">{row.name ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">{row.customer_id}</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{whole.format(row.count)}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoney(row.thb_volume)}</td>
                <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">{timeAgo(row.last_at, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="px-5 py-4 text-sm text-muted-foreground">No customers in this period.</p>}
    </TableCard>
  )
}

function TableCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      {children}
    </Card>
  )
}
