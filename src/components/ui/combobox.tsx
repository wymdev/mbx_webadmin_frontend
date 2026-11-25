import { useState, type KeyboardEvent } from 'react'
import Check from 'lucide-react/icons/check'
import ChevronDown from 'lucide-react/icons/chevron-down'
import { cn } from '@/lib/utils'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type ComboOption = {
  value: string
  label: string
  /** Second line under the label (e.g. a code or a count). */
  hint?: string
  disabled?: boolean
}

/** Lists longer than this get a search box. */
const SEARCH_FROM = 6

type ComboboxProps = {
  options: ComboOption[]
  /** Controlled value ('' = nothing chosen). */
  value?: string
  /** Uncontrolled starting value, for forms read with FormData. */
  defaultValue?: string
  onChange?: (value: string) => void
  /** Adds a first choice for '' with this label, e.g. "All" or "None". */
  emptyLabel?: string
  /** Shown in the button when nothing is chosen and there is no emptyLabel. */
  placeholder?: string
  searchPlaceholder?: string
  /** Defaults to on for lists longer than six. */
  searchable?: boolean
  /** Form field name: the value is sent like a native select's. */
  name?: string
  required?: boolean
  disabled?: boolean
  id?: string
  size?: 'sm' | 'default'
  className?: string
  /** Extra classes for the button itself (e.g. a highlighted state). */
  triggerClassName?: string
  contentClassName?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

/** A select with a search box, styled like the rest of MBX. Works controlled or inside a plain form. */
export function Combobox({
  options,
  value,
  defaultValue = '',
  onChange,
  emptyLabel,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  searchable,
  name,
  required,
  disabled,
  id,
  size = 'default',
  className,
  triggerClassName,
  contentClassName,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [own, setOwn] = useState(defaultValue)
  const current = value ?? own
  const choices = emptyLabel === undefined ? options : [{ value: '', label: emptyLabel }, ...options]
  const selected = choices.find((option) => option.value === current)
  const withSearch = searchable ?? options.length > SEARCH_FROM

  const choose = (next: string) => {
    if (value === undefined) setOwn(next)
    if (next !== current) onChange?.(next)
    setOpen(false)
  }
  const openWithArrows = (event: KeyboardEvent) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <span className={cn('relative inline-grid min-w-0', className)}>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            onKeyDown={openWithArrows}
            className={cn(
              'group flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background text-left text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
              'hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:border-primary/60 data-[state=open]:ring-[3px] data-[state=open]:ring-primary/15',
              'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
              size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3',
              triggerClassName,
            )}
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected ? selected.label : placeholder}</span>
            <ChevronDown className="size-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn('w-(--radix-popover-trigger-width) min-w-48 overflow-hidden p-0 shadow-lg', contentClassName)}
          onOpenAutoFocus={(event) => {
            // Without a search box, focus the list so arrow keys work straight away.
            if (!withSearch) {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('[cmdk-root]')?.focus()
            }
          }}
        >
          <Command
            tabIndex={-1}
            className="outline-none"
            defaultValue={current}
            filter={(itemValue, search, keywords) => {
              const haystack = [itemValue, ...(keywords ?? [])].join(' ').toLowerCase()
              return search
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean)
                .every((word) => haystack.includes(word))
                ? 1
                : 0
            }}
          >
            {withSearch && <CommandInput placeholder={searchPlaceholder} className="h-10" />}
            <CommandList className="max-h-72 scroll-py-1">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No match</CommandEmpty>
              <CommandGroup>
                {choices.map((option) => {
                  const active = option.value === current
                  return (
                    <CommandItem
                      key={option.value || '__empty'}
                      value={option.value || '__empty'}
                      keywords={[option.label, option.hint ?? '']}
                      disabled={option.disabled}
                      onSelect={() => choose(option.value)}
                      className={cn('cursor-pointer gap-2 rounded-md py-2 pr-8', active && 'font-semibold text-primary')}
                    >
                      <span className="grid min-w-0">
                        <span className="truncate">{option.label}</span>
                        {option.hint && <span className="truncate text-xs font-normal text-muted-foreground">{option.hint}</span>}
                      </span>
                      {active && <Check className="absolute right-2 size-4 text-primary!" aria-hidden="true" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {name && (
        // Carries the value in forms and lets the browser enforce `required`, with its message under the button.
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
          name={name}
          value={current}
          required={required}
          onChange={() => undefined}
        />
      )}
    </span>
  )
}
