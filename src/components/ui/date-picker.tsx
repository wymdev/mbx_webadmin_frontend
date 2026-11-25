import { useState } from 'react'
import CalendarDays from 'lucide-react/icons/calendar-days'
import { bangkokDate } from '@/domain/money'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** 'YYYY-MM-DD' → a local Date for the calendar (no time-zone shift). */
export function parseDay(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined
}
/** Local Date from the calendar → 'YYYY-MM-DD'. */
export function formatDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const label = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
/** Business data starts in 2018; leave room for next year's bookings. */
const FIRST_MONTH = new Date(2018, 0, 1)

/**
 * A date field that opens a calendar. Values are Bangkok business days as 'YYYY-MM-DD' ('' = none),
 * the same strings a native date input uses.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
  clearable = true,
  name,
  required,
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  /** Earliest / latest allowed day, 'YYYY-MM-DD'. */
  min?: string
  max?: string
  placeholder?: string
  /** Shows a Clear button. Turn off when a date is always needed. */
  clearable?: boolean
  name?: string
  required?: boolean
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = parseDay(value)
  const today = parseDay(bangkokDate(new Date())) ?? new Date()
  const minDay = min ? parseDay(min) : undefined
  const maxDay = max ? parseDay(max) : undefined
  const lastMonth = new Date(Math.max(today.getFullYear() + 1, (maxDay ?? today).getFullYear()), 11, 31)
  const todayAllowed = (!minDay || today >= minDay) && (!maxDay || today <= maxDay)

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <span className={cn('relative inline-grid min-w-0', className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn(
              'group flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
              'hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:border-primary/60 data-[state=open]:ring-[3px] data-[state=open]:ring-primary/15',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:text-primary" aria-hidden="true" />
            {selected ? (
              <span className="truncate tabular-nums">
                {label.format(selected)} <span className="text-muted-foreground">· {weekday.format(selected)}</span>
              </span>
            ) : (
              <span className="truncate text-muted-foreground">{placeholder}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-hidden p-0 shadow-lg">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? (maxDay && maxDay < today ? maxDay : today)}
            today={today}
            startMonth={minDay && minDay > FIRST_MONTH ? minDay : FIRST_MONTH}
            endMonth={lastMonth}
            disabled={[...(minDay ? [{ before: minDay }] : []), ...(maxDay ? [{ after: maxDay }] : [])]}
            onSelect={(day) => {
              if (day) pick(formatDay(day))
              else if (clearable) pick('')
            }}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 border-t bg-[var(--card-header)] px-3 py-2">
            {clearable ? (
              <button type="button" className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40" disabled={!value} onClick={() => pick('')}>
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
              disabled={!todayAllowed}
              onClick={() => pick(formatDay(today))}
            >
              Today
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {name && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
          name={name}
          value={value}
          required={required}
          onChange={() => undefined}
        />
      )}
    </span>
  )
}

export type DayRange = { from: string; to: string }

/**
 * A from–to field that opens a two-month calendar. Click the first day, then the last; the range is
 * applied when both are picked. Values are 'YYYY-MM-DD' Bangkok business days.
 */
export function DateRangePicker({
  value,
  onChange,
  max,
  className,
  'aria-label': ariaLabel = 'Date range',
}: {
  value: DayRange
  onChange: (value: DayRange) => void
  max?: string
  className?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({})
  const [wide, setWide] = useState(true)
  const today = parseDay(bangkokDate(new Date())) ?? new Date()
  const maxDay = max ? parseDay(max) : undefined
  const from = parseDay(value.from)
  const to = parseDay(value.to)
  const shown = open ? draft : { from, to }

  const toggle = (next: boolean) => {
    if (next) {
      setDraft({ from, to })
      setWide(window.matchMedia('(min-width: 640px)').matches)
    }
    setOpen(next)
  }
  const pickDay = (day: Date) => {
    // Second click finishes the range (either direction); otherwise start a new one.
    if (draft.from && !draft.to) {
      const [start, end] = day < draft.from ? [day, draft.from] : [draft.from, day]
      onChange({ from: formatDay(start), to: formatDay(end) })
      setOpen(false)
    } else {
      setDraft({ from: day, to: undefined })
    }
  }
  const startMonth = shown.to ?? shown.from ?? today
  const firstShown = wide ? new Date(startMonth.getFullYear(), startMonth.getMonth() - 1, 1) : startMonth

  return (
    <span className={cn('relative inline-grid min-w-0', className)}>
      <Popover open={open} onOpenChange={toggle} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              'group flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
              'hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:border-primary/60 data-[state=open]:ring-[3px] data-[state=open]:ring-primary/15',
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:text-primary" aria-hidden="true" />
            <span className="truncate tabular-nums">
              {from ? label.format(from) : 'Start'}
              <span className="px-1.5 text-muted-foreground">→</span>
              {to ? label.format(to) : 'End'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto overflow-hidden p-0 shadow-lg">
          <Calendar
            mode="range"
            numberOfMonths={wide ? 2 : 1}
            captionLayout={wide ? 'label' : 'dropdown'}
            selected={shown.from ? { from: shown.from, to: shown.to } : undefined}
            onSelect={(_range, day) => pickDay(day)}
            defaultMonth={firstShown}
            today={today}
            startMonth={FIRST_MONTH}
            endMonth={new Date(today.getFullYear() + 1, 11, 31)}
            disabled={maxDay ? { after: maxDay } : undefined}
            classNames={{
              months: 'relative flex flex-col gap-4 sm:flex-row sm:gap-6',
              // Until the last day is picked only the first day is marked; after that the range classes draw it.
              selected: shown.to ? '' : '[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground',
              range_start: 'rounded-l-lg bg-primary/12 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold',
              range_end: 'rounded-r-lg bg-primary/12 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold',
              range_middle: 'bg-primary/12 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:font-normal [&>button]:text-foreground [&>button]:shadow-none',
            }}
            autoFocus
          />
          <p className="border-t bg-[var(--card-header)] px-4 py-2 text-xs text-muted-foreground">
            {draft.from && !draft.to ? `From ${label.format(draft.from)}: now pick the last day.` : 'Pick the first day, then the last day.'}
          </p>
        </PopoverContent>
      </Popover>
    </span>
  )
}
