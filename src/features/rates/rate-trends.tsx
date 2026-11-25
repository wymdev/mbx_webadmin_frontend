import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Decimal from 'decimal.js'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ArrowDownRight from 'lucide-react/icons/arrow-down-right'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import Minus from 'lucide-react/icons/minus'
import { z } from 'zod'
import { get } from '@/services/api'
import { bangkokDate } from '@/domain/money'
import { cn, formatDate, formatRate } from '@/lib/utils'
import { QueryState } from '@/components/query-state'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/* ---------- data ---------- */

const closes = z.array(z.object({ date: z.string(), buy: z.string(), sell: z.string() }))
const changes = z.array(z.object({ id: z.number(), created_at: z.string().nullable(), buy: z.string(), sell: z.string() }))

const DAY = 86_400_000
const since = (days: number) => bangkokDate(new Date(Date.now() - (days - 1) * DAY))

/** Daily closing buy / sell for the last `days` Bangkok business days. */
function useCloses(rateId: number, days: number) {
  const from = since(days)
  return useQuery({
    queryKey: ['live', 'rate-closes', rateId, from],
    queryFn: ({ signal }) => get(`rates/${rateId}/chart`, closes, { signal, params: { from } }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/** Signed difference and percentage between two decimal strings. */
export function change(from: string, to: string) {
  try {
    const start = new Decimal(from)
    const diff = new Decimal(to).minus(start)
    return { diff, percent: start.isZero() ? null : diff.div(start).times(100) }
  } catch {
    return null
  }
}

/* ---------- table pieces ---------- */

/** Rate value with the direction of its last change. */
export function RateWithTrend({ value, trend }: { value: unknown; trend: unknown }) {
  if (typeof value !== 'string') return <span className="text-muted-foreground">–</span>
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      {formatRate(value)}
      <TrendIcon direction={trend === 'up' ? 1 : trend === 'down' ? -1 : 0} />
    </span>
  )
}

function TrendIcon({ direction, className }: { direction: number; className?: string }) {
  if (direction > 0) return <ArrowUpRight className={cn('size-3.5 text-emerald-600 dark:text-emerald-400', className)} aria-label="went up" />
  if (direction < 0) return <ArrowDownRight className={cn('size-3.5 text-red-600 dark:text-red-400', className)} aria-label="went down" />
  return <Minus className={cn('size-3.5 text-muted-foreground', className)} aria-label="no change" />
}

/** "+0.30 (+0.23%)" in green / red, or "No change". */
export function ChangeText({ from, to, className }: { from?: string; to?: string; className?: string }) {
  const result = from && to ? change(from, to) : null
  if (!result) return <span className={cn('text-muted-foreground', className)}>–</span>
  const direction = result.diff.comparedTo(0)
  if (direction === 0) return <span className={cn('text-muted-foreground', className)}>No change</span>
  const sign = direction > 0 ? '+' : '−'
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', direction > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400', className)}>
      <TrendIcon direction={direction} className="size-3" />
      {sign}
      {formatRate(result.diff.abs().toFixed())}
      {result.percent && ` (${sign}${result.percent.abs().toFixed(2)}%)`}
    </span>
  )
}

/** Small 30-day line of the sell rate, with the period change underneath. */
export function RateSparkline({ rateId, days = 30 }: { rateId: number; days?: number }) {
  const query = useCloses(rateId, days)
  const points = query.data ?? []
  if (query.isPending) return <span className="inline-block h-8 w-28 animate-pulse rounded bg-muted" aria-hidden="true" />
  if (points.length < 2) return <span className="text-xs text-muted-foreground">Not enough history</span>
  const first = points[0]
  const last = points[points.length - 1]
  return (
    <span className="inline-flex items-center gap-3">
      <Spark values={points.map((point) => Number(point.sell))} />
      <span className="grid text-left text-[11px] leading-tight">
        <span>
          <span className="text-muted-foreground">Buy </span>
          <ChangeText from={first.buy} to={last.buy} />
        </span>
        <span>
          <span className="text-muted-foreground">Sell </span>
          <ChangeText from={first.sell} to={last.sell} />
        </span>
      </span>
    </span>
  )
}

function Spark({ values }: { values: number[] }) {
  const width = 96
  const height = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const path = values.map((value, index) => `${((index / (values.length - 1)) * width).toFixed(1)},${(height - 2 - ((value - min) / span) * (height - 4)).toFixed(1)}`).join(' ')
  const rising = values[values.length - 1] >= values[0]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={path} fill="none" stroke={rising ? 'var(--chart-1)' : 'var(--destructive)'} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ---------- history dialog ---------- */

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
] as const

export function RateHistoryDialog({ rate, close }: { rate: { id: number; currency: string; country?: string; buy?: string; sell?: string }; close: () => void }) {
  const [days, setDays] = useState<number>(30)
  const chart = useCloses(rate.id, days)
  const from = since(days)
  const log = useQuery({
    queryKey: ['live', 'rate-changes', rate.id, from],
    queryFn: ({ signal }) => get(`rates/${rate.id}/history`, changes, { signal, params: { from } }),
    placeholderData: keepPreviousData,
  })
  const points = (chart.data ?? []).map((point) => ({ date: point.date, buy: Number(point.buy), sell: Number(point.sell) }))
  const first = chart.data?.[0]
  const last = chart.data?.[chart.data.length - 1]
  // Newest first, each change compared with the one before it.
  const entries = (log.data ?? []).map((entry, index, all) => ({ ...entry, previous: all[index - 1] })).reverse()

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle>
          {rate.currency} rate history{rate.country ? ` · ${rate.country}` : ''}
        </DialogTitle>
        <DialogDescription>Daily closing rates (Bangkok time) and every change in the period.</DialogDescription>

        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Period">
          {RANGES.map((range) => (
            <Button key={range.days} size="sm" variant={days === range.days ? 'default' : 'outline'} role="radio" aria-checked={days === range.days} onClick={() => setDays(range.days)}>
              {range.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(['buy', 'sell'] as const).map((side) => (
            <div key={side} className="rounded-lg border p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
                <span className="size-2 rounded-full" style={{ background: side === 'buy' ? 'var(--chart-1)' : 'var(--chart-2)' }} aria-hidden="true" />
                {side} now
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{rate[side] ? formatRate(rate[side]) : last ? formatRate(last[side]) : '–'}</p>
              <p className="text-xs">
                <ChangeText from={first?.[side]} to={last?.[side]} /> <span className="text-muted-foreground">over {RANGES.find((range) => range.days === days)?.label}</span>
              </p>
            </div>
          ))}
        </div>

        <QueryState loading={chart.isPending} error={chart.error} retry={chart.refetch}>
          {points.length < 2 ? (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Not enough rate changes in this period to draw a chart.</p>
          ) : (
            <div className={cn('h-64 transition-opacity', chart.isPlaceholderData && 'opacity-60')}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value).slice(0, 6)} stroke="var(--chart-axis)" fontSize={11} tickLine={false} minTickGap={24} />
                  <YAxis domain={['auto', 'auto']} stroke="var(--chart-axis)" fontSize={11} tickLine={false} width={64} tickFormatter={(value: number) => formatRate(String(value))} />
                  <Tooltip
                    formatter={(value) => formatRate(String(value))}
                    labelFormatter={(label) => formatDate(String(label))}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="buy" name="Buy" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="sell" name="Sell" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </QueryState>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Changes ({entries.length})</h3>
          <QueryState loading={log.isPending} error={log.error} retry={log.refetch}>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes in this period.</p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--card-header)] text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left font-semibold">Bangkok time</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Buy</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Sell</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-3 py-2 whitespace-nowrap">{entry.created_at ? formatDate(entry.created_at, true) : '–'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <div>{formatRate(entry.buy)}</div>
                          {entry.previous && <ChangeText className="text-[11px]" from={entry.previous.buy} to={entry.buy} />}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <div>{formatRate(entry.sell)}</div>
                          {entry.previous && <ChangeText className="text-[11px]" from={entry.previous.sell} to={entry.sell} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryState>
        </section>
      </DialogContent>
    </Dialog>
  )
}
