import type { ChangeEvent, ComponentProps } from 'react'
import { DayPicker, type DropdownProps } from 'react-day-picker'
import ChevronDown from 'lucide-react/icons/chevron-down'
import ChevronLeft from 'lucide-react/icons/chevron-left'
import ChevronRight from 'lucide-react/icons/chevron-right'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/ui/combobox'

/** Month calendar in the MBX style. Month and year are picked from searchable dropdowns. */
export function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      captionLayout="dropdown"
      showOutsideDays
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        nav: 'pointer-events-none absolute inset-x-0 top-0 flex h-8 items-center justify-between',
        button_previous: navButton,
        button_next: navButton,
        month_caption: 'flex h-8 items-center justify-center px-9',
        caption_label: 'text-sm font-semibold',
        dropdowns: 'flex items-center gap-1.5',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase',
        week: 'mt-1 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm',
        day_button:
          'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg tabular-nums transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed',
        selected:
          '[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:shadow-sm [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: 'font-semibold text-primary [&>button]:ring-1 [&>button]:ring-primary/40',
        outside: 'text-muted-foreground/45',
        disabled: 'opacity-35',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClass }) => {
          const Icon = orientation === 'left' ? ChevronLeft : orientation === 'right' ? ChevronRight : ChevronDown
          return <Icon className={cn('size-4', iconClass)} aria-hidden="true" />
        },
        Dropdown: CalendarDropdown,
      }}
      {...props}
    />
  )
}

const navButton =
  'pointer-events-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-input bg-background text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

/** Month / year picker inside the caption, using the MBX combobox instead of a native select. */
function CalendarDropdown({ options = [], value, onChange, 'aria-label': ariaLabel }: DropdownProps) {
  return (
    <Combobox
      size="sm"
      aria-label={ariaLabel}
      className="w-auto"
      contentClassName="min-w-32"
      searchPlaceholder={ariaLabel?.toLowerCase().includes('year') ? 'Type a year' : 'Type a month'}
      options={options.map((option) => ({ value: String(option.value), label: option.label, disabled: option.disabled }))}
      value={value === undefined ? '' : String(value)}
      onChange={(next) => onChange?.({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)}
    />
  )
}
