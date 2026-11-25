import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ArrowLeftRight from 'lucide-react/icons/arrow-left-right'
import ArrowRight from 'lucide-react/icons/arrow-right'
import TriangleAlert from 'lucide-react/icons/triangle-alert'
import Maximize from 'lucide-react/icons/maximize'
import Minimize from 'lucide-react/icons/minimize'
import X from 'lucide-react/icons/x'
import Keyboard from 'lucide-react/icons/keyboard'
import TrendingUp from 'lucide-react/icons/trending-up'
import TrendingDown from 'lucide-react/icons/trending-down'
import Minus from 'lucide-react/icons/minus'
import CornerDownLeft from 'lucide-react/icons/corner-down-left'
import Sparkles from 'lucide-react/icons/sparkles'
import List from 'lucide-react/icons/list'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BangkokClock } from '@/components/bangkok-clock'
import { BrandMark } from '@/components/brand-mark'
import { ApiError, send } from '@/services/api'
import { useStaff } from '@/features/auth/session'
import {
  calculateTotal,
  cleanDecimalInput,
  groupDigits,
  relativeDifference,
  reverseAmount,
} from '@/domain/money'
import { cn, formatMoney, formatRate, formatTime, timeAgo, trimRate } from '@/lib/utils'
import { useNow } from '@/lib/use-now'
import {
  useCustomerProfile,
  useLastDeal,
  useRates,
  useReferenceData,
  useTodayDeals,
  type Rate,
  type ReferenceData,
  type Transaction,
} from './api'
import { CustomerPanel, type CustomerChoice } from './customer-panel'
import { SavedDeal } from './saved-deal'

type Operation = 'multiply' | 'divide'
type Deal = {
  exchangeType: 'Buy' | 'Sell'
  from: string
  to: string
  /** Which side staff typed: what the customer sends, or what the recipient gets. */
  entry: 'amount' | 'total'
  amount: string
  total: string
  rate: string
  rateSource: 'last' | 'board' | 'manual' | null
  operation: Operation
  method: string | null
  methodTouched: boolean
  sourceId: number | null
  note: string
  /** Pair whose history-based defaults were applied, so they are applied once per pair. */
  defaultsFor: string | null
}

const freshDeal = (from = 'THB', to = 'MMK'): Deal => ({
  exchangeType: to === 'MMK' ? 'Buy' : 'Sell',
  from,
  to,
  entry: 'amount',
  amount: '',
  total: '',
  rate: '',
  rateSource: null,
  operation: 'multiply',
  method: null,
  methodTouched: false,
  sourceId: null,
  note: '',
  defaultsFor: null,
})

type Warning = { level: 'caution' | 'danger'; text: string }

/**
 * Board rates are MMK per 1 unit of a currency, buy below sell. "We buy what the customer brings":
 * X→MMK is a Buy at X's buy rate (amount × rate); MMK→X is a Sell at X's sell rate (amount ÷ rate).
 * Pairs without MMK (e.g. THB→USD) have no board quote and fall back to the last deal.
 */
export function boardQuote(from: string, to: string, rates?: Rate[]) {
  if (from === 'MMK' && to !== 'MMK') {
    const row = rates?.find((rate) => rate.currency === to)
    return row ? { row, side: 'sell' as const, rate: row.sell, exchangeType: 'Sell' as const, operation: 'divide' as Operation } : null
  }
  if (to === 'MMK' && from !== 'MMK') {
    const row = rates?.find((rate) => rate.currency === from)
    return row ? { row, side: 'buy' as const, rate: row.buy, exchangeType: 'Buy' as const, operation: 'multiply' as Operation } : null
  }
  return null
}

export default function DealDesk() {
  const reference = useReferenceData()
  if (reference.data) return <Desk reference={reference.data} />
  return (
    <DeskFrame>
      {reference.error ? (
        <div className="grid place-items-center p-10 text-center">
          <p className="text-destructive">{reference.error.message}</p>
          <Button className="mt-3" onClick={() => reference.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 p-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <Skeleton className="h-[70vh]" />
          <Skeleton className="h-[70vh]" />
        </div>
      )}
    </DeskFrame>
  )
}

function Desk({ reference }: { reference: ReferenceData }) {
  const client = useQueryClient()
  const [deal, setDeal] = useState<Deal>(() => freshDeal())
  const [customer, setCustomer] = useState<CustomerChoice>(null)
  const [savedId, setSavedId] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const rateRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const rates = useRates()
  const today = useTodayDeals()
  const pairKey = `${deal.from}>${deal.to}`
  const lastDeal = useLastDeal(deal.from, deal.to)
  const customerId = customer?.mode === 'existing' ? customer.customerId : null
  const profile = useCustomerProfile(customerId)

  const quote = useMemo(() => boardQuote(deal.from, deal.to, rates.data), [deal.from, deal.to, rates.data])

  // Defaults for a newly chosen pair, applied once per pair (adjusting state while rendering):
  // the published board rate when the pair is against MMK, otherwise the last deal on the pair.
  const defaultsReady = rates.isFetched && (quote !== null || (lastDeal.isFetched && !lastDeal.isFetching))
  if (deal.defaultsFor !== pairKey && defaultsReady) {
    const last = lastDeal.data
    setDeal((d) => ({
      ...d,
      defaultsFor: pairKey,
      ...(quote
        ? {
            exchangeType: quote.exchangeType,
            operation: quote.operation,
            ...(d.rateSource === 'manual' ? {} : { rate: trimRate(quote.rate), rateSource: 'board' as const }),
          }
        : last
          ? {
              exchangeType: last.exchange_type === 'Sell' ? 'Sell' : 'Buy',
              operation: last.operation,
              ...(d.rateSource === 'manual' ? {} : { rate: trimRate(last.exchange_rate), rateSource: 'last' as const }),
            }
          : {}),
    }))
  }

  const update = useCallback((patch: Partial<Deal>) => {
    setConfirming(false)
    setDeal((d) => ({ ...d, ...patch }))
  }, [])

  /** A new pair gets its own rate: never carry the previous pair's rate over. */
  const changePair = useCallback(
    (from: string, to: string) =>
      update({ from, to, defaultsFor: null, rate: '', rateSource: null, entry: 'amount', total: '' }),
    [update],
  )

  const favouriteMethod = profile.data?.transfer_methods[0]?.method ?? null
  const method = deal.methodTouched ? deal.method : (favouriteMethod ?? deal.method)

  // Both sides of the calculator: one typed, the other computed exactly like the server does.
  const { amount, total } = useMemo(() => {
    try {
      if (deal.entry === 'total') {
        const a = reverseAmount(deal.total, deal.rate, deal.operation)
        return { amount: a, total: calculateTotal(a, deal.rate, deal.operation) }
      }
      return { amount: deal.amount, total: calculateTotal(deal.amount, deal.rate, deal.operation) }
    } catch {
      return { amount: deal.entry === 'amount' ? deal.amount : '', total: deal.entry === 'total' ? deal.total : '' }
    }
  }, [deal.entry, deal.amount, deal.total, deal.rate, deal.operation])

  const now = useNow()
  const warnings = useMemo(() => {
    const list: Warning[] = []
    const last = lastDeal.data
    const reference = quote
      ? { rate: quote.rate, name: `the board ${quote.side} rate` }
      : last
        ? { rate: last.exchange_rate, name: 'the last deal' }
        : null
    if (reference && deal.rate) {
      const diff = relativeDifference(deal.rate, reference.rate)
      if (diff !== null && diff > 0.5)
        list.push({ level: 'danger', text: `Rate ${deal.rate} is far from ${reference.name} (${reference.rate}). Check for a typo.` })
      else if (diff !== null && diff > 0.02)
        list.push({ level: 'caution', text: `Rate differs ${(diff * 100).toFixed(1)}% from ${reference.name} (${reference.rate}).` })
    }
    // Rates refresh every minute: flag a board rate that moved after it was put on this deal.
    if (
      quote &&
      deal.rateSource === 'board' &&
      deal.rate &&
      ![quote.row.buy, quote.row.sell].some((value) => relativeDifference(deal.rate, value) === 0)
    )
      list.push({ level: 'caution', text: `The board ${quote.side} rate is now ${quote.rate}. Tap it to update this deal.` })
    if (deal.rateSource === 'last' && last?.created_at && now - new Date(last.created_at).getTime() > 60 * 60_000)
      list.push({ level: 'caution', text: `Rate comes from a deal ${timeAgo(last.created_at, now)}. Confirm today’s rate with the customer.` })
    if (customerId && amount) {
      const duplicate = today.data?.rows.find(
        (row) =>
          row.customer_id === customerId &&
          row.from_currency === deal.from &&
          relativeDifference(row.amount, amount) === 0 &&
          row.created_at &&
          now - new Date(row.created_at).getTime() < 15 * 60_000,
      )
      if (duplicate)
        list.push({ level: 'danger', text: `Same customer and amount ${timeAgo(duplicate.created_at, now)} (#${duplicate.transaction_id}). Possible duplicate.` })
      const usual = profile.data?.totals.find((row) => row.from_currency === deal.from && row.to_currency === deal.to)
      if (usual && usual.count >= 3) {
        const average = Number(usual.amount_sum) / usual.count
        if (average > 0 && Number(amount) > average * 5)
          list.push({ level: 'caution', text: `About ${Math.round(Number(amount) / average)}× this customer’s usual amount.` })
      }
    }
    return list
  }, [lastDeal.data, quote, deal.rate, deal.rateSource, deal.from, deal.to, customerId, amount, today.data, profile.data, now])

  const save = useMutation({
    mutationFn: () => {
      const value = (text: string) => text.trim() || null
      const customerPayload =
        customer?.mode === 'existing'
          ? { customer_id: customer.customerId }
          : customer?.mode === 'new'
            ? {
                name: value(customer.draft.name),
                country_code: value(customer.draft.country_code),
                phone: value(customer.draft.phone),
                id_type: customer.draft.id_type,
                ...(customer.draft.id_type === 'passport'
                  ? { passport: value(customer.draft.passport), nationality: value(customer.draft.nationality) }
                  : {
                      nrc_code: value(customer.draft.nrc_code),
                      nrc_township: value(customer.draft.nrc_township),
                      nrc_type: value(customer.draft.nrc_type),
                      nrc_number: value(customer.draft.nrc_number),
                    }),
              }
            : {}
      return send<Transaction>('post', 'transactions', {
        exchange_type: deal.exchangeType,
        from_currency: deal.from,
        to_currency: deal.to,
        amount,
        exchange_rate: deal.rate,
        operation: deal.operation,
        transfer_method: method,
        customer_source_id: deal.sourceId,
        description: value(deal.note),
        customer: customerPayload,
      })
    },
    onSuccess: ({ data }) => {
      setSavedId(data.id)
      setConfirming(false)
      void client.invalidateQueries()
    },
    meta: { success: 'Deal saved' },
  })

  const fieldErrors = useMemo(() => {
    const errors: Record<string, string | undefined> = {}
    if (save.error instanceof ApiError) for (const [key, messages] of Object.entries(save.error.fields)) errors[key] = messages[0]
    return errors
  }, [save.error])

  const missing: string[] = []
  if (!customer) missing.push('customer')
  if (!(Number(amount) > 0)) missing.push('amount')
  if (!(Number(deal.rate) > 0)) missing.push('rate')
  if (deal.from === deal.to) missing.push('different currencies')
  const ready = missing.length === 0

  const submit = useCallback(() => {
    if (!ready || save.isPending) return
    if (warnings.some((w) => w.level === 'danger') && !confirming) {
      setConfirming(true)
      return
    }
    save.mutate()
  }, [ready, save, warnings, confirming])

  const nextDeal = useCallback(
    (keepCustomer: boolean) => {
      setSavedId(null)
      save.reset()
      setDeal((d) => ({ ...d, amount: '', total: '', entry: 'amount', note: '', methodTouched: keepCustomer && d.methodTouched }))
      if (!keepCustomer) setCustomer(null)
      window.setTimeout(() => (keepCustomer ? amountRef : searchRef).current?.focus(), 50)
    },
    [save],
  )

  // Desk shortcuts.
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (savedId !== null) return
      if (event.key === 'F4') {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (event.key === 'F6') {
        event.preventDefault()
        amountRef.current?.focus()
        amountRef.current?.select()
      } else if (event.key === 'F7') {
        event.preventDefault()
        rateRef.current?.focus()
        rateRef.current?.select()
      } else if (event.altKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        update({ exchangeType: 'Buy' })
      } else if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        update({ exchangeType: 'Sell' })
      } else if (event.altKey && event.key.toLowerCase() === 'x') {
        event.preventDefault()
        changePair(deal.to, deal.from)
      } else if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [savedId, submit, update, changePair, deal.from, deal.to])

  useEffect(() => searchRef.current?.focus(), [])

  const staff = useStaff()
  const mine = useTodayDeals(staff.user.id)

  return (
    <DeskFrame
      stats={
        <>
          <Stat label="Today" value={today.data?.pagination.total} />
          <Stat label="Mine" value={mine.data?.pagination.total} />
        </>
      }
    >
      {/* 1 Customer → 2 Deal → 3 Complete. The left column (customer + complete) stays on screen while
          the deal scrolls; on phones the blocks stack in step order. */}
      <div className="grid flex-1 items-start gap-4 p-3 sm:p-4 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-5 lg:p-5 2xl:grid-cols-[26rem_minmax(0,1fr)]">
        <div className="contents lg:sticky lg:top-[5.25rem] lg:col-start-1 lg:row-start-1 lg:grid lg:max-h-[calc(100dvh-6.5rem)] lg:content-start lg:gap-4 lg:overflow-y-auto lg:pb-1">
        <Section step={1} title="Customer" hint="F4">
          <CustomerPanel
            choice={customer}
            onChange={(choice) => {
              setConfirming(false)
              setCustomer(choice)
              if (choice?.mode === 'existing') window.setTimeout(() => amountRef.current?.focus(), 50)
            }}
            reference={reference}
            searchRef={searchRef}
            errors={fieldErrors}
          />
        </Section>
        <aside
          aria-label="Complete deal"
          className="order-last lg:order-none"
        >
          <div className="grid gap-4 rounded-xl bg-[var(--sidebar)] p-5 text-white shadow-sm dark:bg-[#0c241c]">
            <div className="flex items-center gap-3">
              <StepBadge step={3} inverted />
              <h2 className="text-[15px] font-semibold">Complete</h2>
              <span className="ml-auto text-xs text-[#a9c6b5] tabular-nums">
                {deal.exchangeType} · {deal.from} → {deal.to}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-xs text-[#a9c6b5]">Customer sends</p>
              <p className="text-lg font-bold tabular-nums">{amount ? formatMoney(amount, deal.from) : '—'}</p>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-[#a9c6b5]">Rate</p>
              <p className="text-sm font-semibold tabular-nums">
                {deal.rate ? `${deal.operation === 'multiply' ? '×' : '÷'} ${formatRate(deal.rate)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#a9c6b5]">Recipient gets</p>
              <p className="text-3xl font-extrabold tracking-tight text-[var(--gold)] tabular-nums [overflow-wrap:anywhere]">
                {total ? formatMoney(total, deal.to) : '—'}
              </p>
            </div>
            {warnings.length > 0 && (
              <ul className="grid gap-2">
                {warnings.map((warning) => (
                  <li
                    key={warning.text}
                    className={cn(
                      'flex gap-2 rounded-lg px-3 py-2 text-xs',
                      warning.level === 'danger' ? 'bg-[#c0443e]/25 text-[#ffd9d6]' : 'bg-[#fdb600]/15 text-[#fde7a8]',
                    )}
                  >
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {warning.text}
                  </li>
                ))}
              </ul>
            )}
            {save.error && (
              <p role="alert" className="rounded-lg bg-[#c0443e]/25 px-3 py-2 text-xs text-[#ffd9d6]">
                {save.error.message}
                {Object.keys(fieldErrors).length > 0 && ' Check the highlighted fields.'}
              </p>
            )}
            <Button
              size="lg"
              className={cn(
                'h-14 justify-between rounded-xl bg-[var(--gold)] px-5 text-base font-extrabold text-[#17311f] hover:bg-[var(--gold)] hover:brightness-105 disabled:opacity-40',
                confirming && 'bg-[#e8695f] text-white hover:bg-[#e8695f]',
              )}
              disabled={!ready || save.isPending}
              onClick={submit}
            >
              {save.isPending ? 'Saving…' : confirming ? 'Save anyway' : 'Complete deal'}
              <span className="flex items-center gap-1 text-xs font-semibold opacity-70">
                Ctrl <CornerDownLeft className="size-3.5" aria-hidden="true" />
              </span>
            </Button>
            {!ready && <p className="text-center text-xs text-[#a9c6b5]">Needs: {missing.join(', ')}</p>}
          </div>
        </aside>
        </div>

        <section aria-label="Deal" className="grid content-start gap-4 lg:col-start-2 lg:row-start-1">
          <Section
            step={2}
            title="Deal"
            action={
              (quote || lastDeal.data) && (
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <Sparkles className="size-3.5 text-[var(--gold)]" aria-hidden="true" />
                  {quote
                    ? `Board ${quote.row.currency} ${quote.side} rate · ${timeAgo(quote.row.updated_at, now)}`
                    : `From the last ${deal.from}→${deal.to} deal · ${timeAgo(lastDeal.data!.created_at, now)}`}
                </span>
              )
            }
          >
            <div className="grid gap-5">
              <Segmented
                label="Exchange type"
                value={deal.exchangeType}
                options={[
                  { value: 'Buy', label: 'Buy', hint: 'Alt B' },
                  { value: 'Sell', label: 'Sell', hint: 'Alt S' },
                ]}
                onChange={(exchangeType) => update({ exchangeType: exchangeType as Deal['exchangeType'] })}
                size="lg"
              />

              <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <CurrencyPicker
                  label="Customer sends"
                  value={deal.from}
                  order={reference.currency_usage.from}
                  exclude={deal.to}
                  onChange={(from) => changePair(from, deal.to)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="mx-auto mb-0.5 rounded-full"
                  aria-label="Swap currencies (Alt X)"
                  title="Swap currencies (Alt X)"
                  onClick={() => changePair(deal.to, deal.from)}
                >
                  <ArrowLeftRight />
                </Button>
                <CurrencyPicker
                  label="Recipient gets"
                  value={deal.to}
                  order={reference.currency_usage.to}
                  exclude={deal.from}
                  onChange={(to) => changePair(deal.from, to)}
                />
              </div>

              <PairRates
                from={deal.from}
                to={deal.to}
                rates={rates.data}
                loading={rates.isPending}
                quote={quote}
                currentRate={deal.rate}
                onPick={(rate) => {
                  update({ rate: trimRate(rate), rateSource: 'board' })
                  amountRef.current?.focus()
                }}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <BigMoneyInput
                  inputRef={amountRef}
                  label="Amount"
                  hint="F6"
                  currency={deal.from}
                  value={deal.entry === 'amount' ? deal.amount : amount}
                  active={deal.entry === 'amount'}
                  error={fieldErrors.amount}
                  onChange={(value) => update({ entry: 'amount', amount: value })}
                />
                <BigMoneyInput
                  label="Total"
                  currency={deal.to}
                  value={deal.entry === 'total' ? deal.total : total}
                  active={deal.entry === 'total'}
                  onChange={(value) => update({ entry: 'total', total: value })}
                  accent
                />
              </div>
              <QuickAmounts
                currency={deal.from}
                onPick={(value) => {
                  update({ entry: 'amount', amount: value })
                  amountRef.current?.focus()
                }}
              />

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="grid content-start gap-1.5">
                  <label htmlFor="desk-rate" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    Exchange rate <kbd className="text-[10px]">F7</kbd>
                  </label>
                  <input
                    id="desk-rate"
                    ref={rateRef}
                    inputMode="decimal"
                    autoComplete="off"
                    value={deal.rate}
                    onChange={(event) => update({ rate: cleanDecimalInput(event.target.value), rateSource: 'manual' })}
                    onFocus={(event) => event.currentTarget.select()}
                    aria-invalid={!!fieldErrors.exchange_rate}
                    className="h-12 rounded-lg border bg-background px-3 text-xl font-bold tabular-nums outline-none focus:ring-[3px] focus:ring-ring/40 aria-[invalid=true]:border-destructive"
                    placeholder="0.00"
                  />
                  {fieldErrors.exchange_rate && <p className="text-xs text-destructive">{fieldErrors.exchange_rate}</p>}
                  {lastDeal.data && (
                    <div>
                      <RateChip
                        active={relativeDifference(deal.rate, lastDeal.data.exchange_rate) === 0}
                        onClick={() =>
                          update({ rate: trimRate(lastDeal.data!.exchange_rate), rateSource: 'last', operation: lastDeal.data!.operation })
                        }
                      >
                        Last deal {formatRate(lastDeal.data.exchange_rate)}
                        <span className="opacity-60">· {timeAgo(lastDeal.data.created_at, now)}</span>
                      </RateChip>
                    </div>
                  )}
                </div>
                <div className="grid content-start gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Calculation</span>
                  <Segmented
                    label="Calculation"
                    value={deal.operation}
                    options={[
                      { value: 'multiply', label: '× Multiply' },
                      { value: 'divide', label: '÷ Divide' },
                    ]}
                    onChange={(operation) => update({ operation: operation as Operation })}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Payment details">
            <div className="grid gap-4">
              <ChipGroup
                label="Transfer method"
                options={reference.transfer_methods.map((m) => ({ value: m.name, label: m.name }))}
                value={method}
                onChange={(value) => update({ method: value, methodTouched: true })}
                note={!deal.methodTouched && favouriteMethod ? 'Customer’s usual method' : undefined}
              />
              <ChipGroup
                label="Customer source"
                options={reference.customer_sources.map((s) => ({ value: String(s.id), label: s.name }))}
                value={deal.sourceId === null ? null : String(deal.sourceId)}
                onChange={(value) => update({ sourceId: value === null ? null : Number(value) })}
              />
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Note
                <textarea
                  value={deal.note}
                  onChange={(event) => update({ note: event.target.value.slice(0, 1000) })}
                  rows={2}
                  placeholder="Recipient account, reference, anything to remember…"
                  className="resize-none rounded-lg border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:ring-[3px] focus:ring-ring/40"
                />
              </label>
            </div>
          </Section>

          <TodayStrip rows={today.data?.rows} loading={today.isPending} />
        </section>

      </div>

      <SavedDeal key={savedId ?? 'none'} id={savedId} onNext={() => nextDeal(false)} onSameCustomer={() => nextDeal(true)} />
    </DeskFrame>
  )
}

function DeskFrame({ children, stats }: { children: ReactNode; stats?: ReactNode }) {
  const navigate = useNavigate()
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement)
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur sm:px-5">
        <BrandMark />
        <div className="grid leading-tight">
          <h1 className="text-[15px] font-extrabold tracking-tight">Deal desk</h1>
          <BangkokClock className="text-[11px] text-muted-foreground tabular-nums" />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          {stats && <div className="hidden items-center gap-4 pr-2 sm:flex">{stats}</div>}
          <ShortcutHelp />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            title={fullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => (fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <X /> <span className="hidden sm:inline">Close desk</span>
          </Button>
        </div>
      </header>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="text-right leading-tight">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-sm font-extrabold tabular-nums">{value === undefined ? '–' : value.toLocaleString()}</p>
    </div>
  )
}

function ShortcutHelp() {
  const keys: [string, string][] = [
    ['F4', 'Find customer'],
    ['F6', 'Amount'],
    ['F7', 'Rate'],
    ['Alt B / Alt S', 'Buy / Sell'],
    ['Alt X', 'Swap currencies'],
    ['Ctrl Enter', 'Complete deal'],
    ['Enter', 'Next deal (after saving)'],
  ]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
          <Keyboard />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="mb-2 text-sm font-bold">Keyboard shortcuts</p>
        <dl className="grid gap-1.5 text-xs">
          {keys.map(([key, action]) => (
            <div key={key} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{action}</dt>
              <dd>
                <kbd>{key}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}

function StepBadge({ step, inverted = false }: { step: number; inverted?: boolean }) {
  return (
    <span
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
        inverted ? 'bg-[var(--gold)] text-[#17311f]' : 'bg-primary text-primary-foreground',
      )}
    >
      {step}
    </span>
  )
}

function Section({
  step,
  title,
  hint,
  action,
  children,
  className,
}: {
  step?: number
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        {step !== undefined && <StepBadge step={step} />}
        <CardTitle>{title}</CardTitle>
        {(action || hint) && (
          <CardAction>
            {action}
            {hint && <kbd className="text-[10px] text-muted-foreground">{hint}</kbd>}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Segmented({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string
  value: string
  options: { value: string; label: string; hint?: string }[]
  onChange: (value: string) => void
  size?: 'md' | 'lg'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-grid w-fit auto-cols-fr grid-flow-col gap-1 justify-self-start rounded-xl bg-muted p-1">
      {options.map((option) => {
        const selected = option.value === value
        const tone = option.value === 'Sell' ? 'data-[on=true]:bg-[#a47728] dark:data-[on=true]:bg-[#c99a43]' : 'data-[on=true]:bg-primary'
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-on={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-4 font-bold text-muted-foreground transition data-[on=true]:text-white data-[on=true]:shadow-sm dark:data-[on=true]:text-[#0b2921]',
              size === 'lg' ? 'h-11 min-w-28 text-base' : 'h-12 text-sm md:h-12',
              tone,
            )}
          >
            {option.label}
            {option.hint && <kbd className="hidden border-current/30 bg-transparent text-[9px] opacity-70 lg:inline">{option.hint}</kbd>}
          </button>
        )
      })}
    </div>
  )
}

function CurrencyPicker({
  label,
  value,
  order,
  exclude,
  onChange,
}: {
  label: string
  value: string
  order: string[]
  exclude: string
  onChange: (currency: string) => void
}) {
  const options = order.filter((c) => c !== exclude)
  const top = options.slice(0, 5)
  const rest = options.slice(5)
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {top.map((currency) => (
          <button
            key={currency}
            type="button"
            aria-pressed={currency === value}
            onClick={() => onChange(currency)}
            className="h-10 min-w-14 rounded-lg border bg-background px-3 text-sm font-bold transition hover:border-primary/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {currency}
          </button>
        ))}
        {rest.length > 0 && (
          <select
            aria-label={`${label}: other currency`}
            value={rest.includes(value) ? value : ''}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            className={cn(
              'h-10 rounded-lg border bg-background px-2 text-sm font-bold',
              rest.includes(value) && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            <option value="">More…</option>
            {rest.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

function BigMoneyInput({
  label,
  hint,
  currency,
  value,
  active,
  onChange,
  error,
  accent = false,
  inputRef,
}: {
  label: string
  hint?: string
  currency: string
  value: string
  active: boolean
  onChange: (value: string) => void
  error?: string
  accent?: boolean
  inputRef?: Ref<HTMLInputElement>
}) {
  const id = `desk-${label.toLowerCase()}`
  return (
    <div
      className={cn(
        'grid gap-1 rounded-xl border-2 px-4 py-3 transition-colors focus-within:border-primary',
        active ? 'border-primary/40 bg-background' : 'border-transparent bg-muted/70',
        accent && !active && 'bg-secondary',
        error && 'border-destructive',
      )}
    >
      <label htmlFor={id} className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {label} {!active && value && <span className="font-normal">(calculated)</span>}
        </span>
        {hint && <kbd className="text-[10px]">{hint}</kbd>}
      </label>
      <div className="flex items-baseline gap-2">
        <input
          id={id}
          ref={inputRef}
          inputMode="decimal"
          autoComplete="off"
          value={groupDigits(value)}
          onChange={(event) => onChange(cleanDecimalInput(event.target.value))}
          placeholder="0"
          aria-invalid={!!error}
          className="w-full min-w-0 bg-transparent text-3xl font-extrabold tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/40 sm:text-4xl"
        />
        <span className="text-base font-bold text-muted-foreground">{currency}</span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function QuickAmounts({ currency, onPick }: { currency: string; onPick: (value: string) => void }) {
  const values = ['MMK', 'WON', 'JPY'].includes(currency)
    ? ['100000', '500000', '1000000', '5000000']
    : ['1000', '5000', '10000', '50000']
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Quick amounts">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onPick(value)}
          className="h-8 rounded-full border bg-background px-3 text-xs font-semibold tabular-nums text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          {groupDigits(value)}
        </button>
      ))}
    </div>
  )
}

function RateChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-semibold tabular-nums transition hover:border-primary/50 aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary"
    >
      {children}
    </button>
  )
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
  note,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onChange: (value: string | null) => void
  note?: string
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 flex w-full items-center justify-between text-xs font-semibold text-muted-foreground">
        {label}
        {note && <span className="font-normal text-primary">{note}</span>}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 && <p className="text-xs text-muted-foreground">None set up yet.</p>}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value === value ? null : option.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm font-medium transition hover:border-primary/50 aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:font-bold aria-pressed:text-primary"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Trend({ trend }: { trend?: string | null }) {
  if (trend === 'up') return <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" aria-label="up" />
  if (trend === 'down') return <TrendingDown className="size-3 text-red-600 dark:text-red-400" aria-label="down" />
  return <Minus className="size-3 opacity-60" aria-label="no change" />
}

function CurrencyBadge({ rate }: { rate: Rate }) {
  const flag = rate.photo_url && !/finish\.png$/.test(rate.photo_url) ? rate.photo_url : null
  return flag ? (
    <img src={flag} alt="" className="size-9 shrink-0 rounded-full border object-cover" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-extrabold tracking-tight text-muted-foreground">
      {rate.currency.slice(0, 3)}
    </span>
  )
}

/**
 * Board rates for this deal only: the currency traded against MMK. Other currencies can't be picked,
 * so a rate from the wrong row never ends up on a deal. Cross pairs (no MMK) show both rows for reference.
 */
function PairRates({
  from,
  to,
  rates,
  loading,
  quote,
  currentRate,
  onPick,
}: {
  from: string
  to: string
  rates?: Rate[]
  loading: boolean
  quote: ReturnType<typeof boardQuote>
  currentRate: string
  onPick: (rate: string) => void
}) {
  const now = useNow()
  if (loading) return <Skeleton className="h-20" />
  const rows = quote
    ? [quote.row]
    : [from, to].filter((c) => c !== 'MMK').flatMap((c) => rates?.filter((rate) => rate.currency === c) ?? [])
  return (
    <div className="overflow-hidden rounded-xl border bg-[var(--card-header)]">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-1.5">
        <p className="text-xs font-semibold text-muted-foreground">
          Board rate <span className="font-normal">· MMK per 1 unit</span>
        </p>
        <AllRates rates={rates} />
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No board rate for this pair. Type the agreed rate.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((rate) => (
            <li key={rate.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
              <CurrencyBadge rate={rate} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-base font-extrabold">{rate.currency}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {rate.country ?? ''}
                  {rate.updated_at ? ` · updated ${timeAgo(rate.updated_at, now)}` : ''}
                </span>
              </span>
              {(['buy', 'sell'] as const).map((side) => {
                const recommended = quote?.side === side
                const inUse = relativeDifference(currentRate, rate[side]) === 0
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={!quote}
                    onClick={() => onPick(rate[side])}
                    aria-pressed={inUse}
                    title={quote ? `Use ${rate.currency} ${side} rate` : 'Cross pair: reference only'}
                    className={cn(
                      'grid min-w-28 justify-items-end rounded-lg border bg-background px-3 py-1.5 text-right transition enabled:hover:border-primary/50 disabled:cursor-default',
                      inUse && 'border-primary ring-2 ring-primary/15',
                      !recommended && quote && 'opacity-70',
                    )}
                  >
                    <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {side}
                      {recommended && <span className="text-primary normal-case">· this deal</span>}
                      <Trend trend={rate[`${side}_trend`]} />
                    </span>
                    <span className="text-lg font-bold tabular-nums">{formatRate(rate[side])}</span>
                  </button>
                )
              })}
            </li>
          ))}
        </ul>
      )}
      {!quote && rows.length > 0 && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Cross pair without MMK: board rates are for reference. Use the last deal or type the agreed rate.
        </p>
      )}
    </div>
  )
}

/** The whole board, read-only, for answering a customer's “what's your rate for…?” */
function AllRates({ rates }: { rates?: Rate[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" disabled={!rates?.length}>
          <List /> All rates
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] border-b px-4 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span>Currency</span>
          <span className="text-right">Buy</span>
          <span className="text-right">Sell</span>
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {rates?.map((rate) => (
            <li key={rate.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center px-4 py-2 text-sm">
              <span className="font-bold">{rate.currency}</span>
              <span className="flex items-center justify-end gap-1 tabular-nums">
                {formatRate(rate.buy)} <Trend trend={rate.buy_trend} />
              </span>
              <span className="flex items-center justify-end gap-1 tabular-nums">
                {formatRate(rate.sell)} <Trend trend={rate.sell_trend} />
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">Reference only. Pick the deal’s currencies to use a rate.</p>
      </PopoverContent>
    </Popover>
  )
}

function TodayStrip({ rows, loading }: { rows?: Transaction[]; loading: boolean }) {
  return (
    <Section title="Today’s latest deals">
      {loading ? (
        <Skeleton className="h-24" />
      ) : !rows?.length ? (
        <p className="text-sm text-muted-foreground">No deals yet today.</p>
      ) : (
        <ul className="-mx-1 grid">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-1 py-2 text-sm odd:bg-muted/50">
              <span className="text-xs text-muted-foreground tabular-nums">{row.created_at ? formatTime(row.created_at) : ''}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{row.customer_name ?? '—'}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.exchange_type} · {row.transfer_method ?? 'No method'}
                  {row.created_by ? ` · ${row.created_by.name}` : ''}
                </span>
              </span>
              <span className="text-right text-xs tabular-nums">
                <span className="block font-semibold">{formatMoney(row.amount, row.from_currency)}</span>
                <span className="flex items-center justify-end gap-1 text-muted-foreground">
                  <ArrowRight className="size-3" aria-hidden="true" /> {formatMoney(row.total, row.to_currency)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
