import { useEffect, useState, type ComponentProps, type Ref } from 'react'
import Search from 'lucide-react/icons/search'
import UserPlus from 'lucide-react/icons/user-plus'
import X from 'lucide-react/icons/x'
import Phone from 'lucide-react/icons/phone'
import IdCard from 'lucide-react/icons/id-card'
import History from 'lucide-react/icons/history'
import LoaderCircle from 'lucide-react/icons/loader-circle'
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatDate, formatMoney, initials } from '@/lib/utils'
import { useCustomerLookup, useCustomerProfile, useNrcTownships, type ReferenceData } from './api'
import { Combobox } from '@/components/ui/combobox'

export type NewCustomer = {
  name: string
  country_code: string
  phone: string
  id_type: 'passport' | 'nrc'
  passport: string
  nationality: string
  nrc_code: string
  nrc_township: string
  nrc_type: string
  nrc_number: string
}
export const emptyCustomer: NewCustomer = {
  name: '',
  country_code: '+95',
  phone: '',
  id_type: 'nrc',
  passport: '',
  nationality: 'Myanmar',
  nrc_code: '',
  nrc_township: '',
  nrc_type: 'N',
  nrc_number: '',
}
export type CustomerChoice =
  | { mode: 'existing'; customerId: string; name: string }
  | { mode: 'new'; draft: NewCustomer }
  | null

const NRC_TYPES = ['N', 'E', 'P', 'T', 'Y', 'S']

function useDebounced<T>(value: T, delay = 200) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function CustomerPanel({
  choice,
  onChange,
  reference,
  searchRef,
  errors,
}: {
  choice: CustomerChoice
  onChange: (choice: CustomerChoice) => void
  reference: ReferenceData
  searchRef: Ref<HTMLInputElement>
  errors: Record<string, string | undefined>
}) {
  if (choice?.mode === 'existing')
    return (
      <SelectedCustomer
        customerId={choice.customerId}
        name={choice.name}
        onClear={() => onChange(null)}
      />
    )
  if (choice?.mode === 'new')
    return (
      <NewCustomerForm
        draft={choice.draft}
        reference={reference}
        errors={errors}
        onChange={(draft) => onChange({ mode: 'new', draft })}
        onCancel={() => onChange(null)}
      />
    )
  return <CustomerSearch searchRef={searchRef} onChange={onChange} error={errors.customer} />
}

function CustomerSearch({
  searchRef,
  onChange,
  error,
}: {
  searchRef: Ref<HTMLInputElement>
  onChange: (choice: CustomerChoice) => void
  error?: string
}) {
  const [query, setQuery] = useState('')
  const term = useDebounced(query)
  const lookup = useCustomerLookup(term)
  const results = term.trim().length >= 2 ? (lookup.data ?? []) : []
  const showList = query.trim().length >= 2

  return (
    <div className="grid gap-3">
      <Command shouldFilter={false} className="overflow-visible bg-transparent" loop>
        <div
          className={cn(
            'flex h-11 items-center gap-2 rounded-lg border bg-background px-3 focus-within:ring-[3px] focus-within:ring-ring/40',
            error && 'border-destructive',
          )}
        >
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or phone number…"
            inputMode="search"
            aria-label="Search customer"
            aria-invalid={!!error}
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {lookup.isFetching && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
          <kbd className="text-[10px] text-muted-foreground">F4</kbd>
        </div>
        {showList && (
          <CommandList className="mt-2 max-h-72 rounded-lg border bg-card p-1 shadow-sm">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              {lookup.isFetching ? 'Searching…' : 'No customer found.'}
            </CommandEmpty>
            {results.map((customer, index) => (
              <CommandItem
                key={`${customer.customer_id ?? 'none'}-${index}`}
                value={`${customer.customer_id}-${index}`}
                onSelect={() =>
                  onChange(
                    customer.customer_id
                      ? { mode: 'existing', customerId: customer.customer_id, name: customer.name }
                      : { mode: 'new', draft: { ...emptyCustomer, name: customer.name } },
                  )
                }
                className="gap-3 py-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-primary">
                  {initials(customer.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    <Highlight text={customer.name} term={term} />
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3 shrink-0" aria-hidden="true" />
                    {customer.phone ? (
                      <span className="tabular-nums">
                        {customer.country_code ? `${customer.country_code} ` : ''}
                        {customer.phone}
                      </span>
                    ) : (
                      <span className="italic">No phone</span>
                    )}
                  </span>
                </span>
                {customer.id_type && (
                  <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                    {customer.id_type === 'nrc' ? 'NRC' : 'Passport'}
                  </span>
                )}
              </CommandItem>
            ))}
            <CommandItem
              value="__new"
              onSelect={() => onChange({ mode: 'new', draft: { ...emptyCustomer, name: query.trim() } })}
              className="gap-3 py-2 text-primary"
            >
              <UserPlus /> New customer “{query.trim()}”
            </CommandItem>
          </CommandList>
        )}
      </Command>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!showList && (
        <Button variant="outline" className="h-10 justify-start" onClick={() => onChange({ mode: 'new', draft: emptyCustomer })}>
          <UserPlus /> New customer
        </Button>
      )}
    </div>
  )
}

/** Bold the part of a name that matches the search. */
function Highlight({ text, term }: { text: string; term: string }) {
  const q = term.trim()
  const index = q && !/^[+\d\s()-]+$/.test(q) ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (index < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-[var(--gold)]/30 px-0.5 text-inherit">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  )
}

function SelectedCustomer({
  customerId,
  name,
  onClear,
}: {
  customerId: string
  name: string
  onClear: () => void
}) {
  const profile = useCustomerProfile(customerId)
  const data = profile.data
  const favourite = data?.transfer_methods[0]?.method

  const id = data?.customer
  const idDocument = id?.id_type === 'nrc' && id.nrc
    ? `${id.nrc.code}/${id.nrc.township}(${id.nrc.type})${id.nrc.number}`
    : id?.passport
      ? `Passport ${id.passport}`
      : null

  return (
    <div className="rounded-xl border bg-gradient-to-b from-secondary/70 to-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{name}</p>
          <p className="text-xs text-muted-foreground">{customerId}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Change customer">
          <X />
        </Button>
      </div>
      {profile.isPending ? (
        <div className="mt-4 grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : data ? (
        <div className="mt-4 grid gap-3 text-sm">
          <div className="grid gap-1.5 text-muted-foreground">
            {data.customer.phone && (
              <span className="flex items-center gap-2">
                <Phone className="size-3.5" aria-hidden="true" /> {data.customer.country_code} {data.customer.phone}
              </span>
            )}
            {idDocument && (
              <span className="flex items-center gap-2">
                <IdCard className="size-3.5" aria-hidden="true" /> {idDocument}
              </span>
            )}
            <span className="flex items-center gap-2">
              <History className="size-3.5" aria-hidden="true" />
              {data.activity.transactions
                ? `${data.activity.transactions} deals · last ${formatDate(data.activity.last_transaction_at!)}`
                : 'First deal'}
            </span>
          </div>
          {data.totals.length > 0 && (
            <ul className="grid gap-1 border-t pt-3">
              {data.totals.slice(0, 3).map((row) => (
                <li key={`${row.from_currency}-${row.to_currency}`} className="flex justify-between gap-2 text-xs">
                  <span className="font-semibold">
                    {row.from_currency} → {row.to_currency}{' '}
                    <span className="font-normal text-muted-foreground">×{row.count}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatMoney(row.amount_sum, row.from_currency)}</span>
                </li>
              ))}
            </ul>
          )}
          {favourite && (
            <p className="text-xs text-muted-foreground">
              Usually pays with <strong className="text-foreground">{favourite}</strong>
            </p>
          )}
        </div>
      ) : (
        profile.error && <p className="mt-3 text-xs text-destructive">{profile.error.message}</p>
      )}
    </div>
  )
}

function NewCustomerForm({
  draft,
  reference,
  errors,
  onChange,
  onCancel,
}: {
  draft: NewCustomer
  reference: ReferenceData
  errors: Record<string, string | undefined>
  onChange: (draft: NewCustomer) => void
  onCancel: () => void
}) {
  const townships = useNrcTownships(draft.nrc_code)
  const set = (patch: Partial<NewCustomer>) => onChange({ ...draft, ...patch })
  const err = (field: string) => errors[`customer.${field}`]
  const field = (label: string, key: keyof NewCustomer, props: ComponentProps<typeof Input> = {}) => (
    <label className="grid gap-1 text-xs font-semibold">
      {label}
      <Input
        value={draft[key]}
        onChange={(event) => set({ [key]: event.target.value })}
        aria-invalid={!!err(key)}
        className="h-9"
        {...props}
      />
      {err(key) && <span className="font-normal text-destructive">{err(key)}</span>}
    </label>
  )
  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold">
          <UserPlus className="size-4 text-primary" aria-hidden="true" /> New customer
        </p>
        <Button variant="ghost" size="xs" onClick={onCancel}>
          Search instead
        </Button>
      </div>
      {field('Full name *', 'name', { autoFocus: true, maxLength: 191 })}
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
        {field('Code', 'country_code', { list: 'desk-country-codes', maxLength: 8 })}
        {field('Phone', 'phone', { type: 'tel', maxLength: 32 })}
      </div>
      <datalist id="desk-country-codes">
        {reference.country_codes.map((c) =>
          c.country_code ? <option key={`${c.name}-${c.country_code}`} value={c.country_code}>{c.name}</option> : null,
        )}
      </datalist>
      <div role="radiogroup" aria-label="Identity document" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['nrc', 'passport'] as const).map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={draft.id_type === type}
            onClick={() => set({ id_type: type })}
            className={cn(
              'h-8 rounded-md text-xs font-semibold text-muted-foreground transition',
              draft.id_type === type && 'bg-card text-foreground shadow-sm',
            )}
          >
            {type === 'nrc' ? 'Myanmar NRC' : 'Passport'}
          </button>
        ))}
      </div>
      {draft.id_type === 'passport' ? (
        <div className="grid grid-cols-2 gap-2">
          {field('Passport no. *', 'passport', { maxLength: 32 })}
          {field('Nationality *', 'nationality', { list: 'desk-nationalities', maxLength: 64 })}
          <datalist id="desk-nationalities">
            {reference.nationalities.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] gap-2">
            <label className="grid gap-1 text-xs font-semibold">
              State *
              <Combobox
                aria-label="NRC state"
                placeholder="–"
                searchPlaceholder="State no."
                contentClassName="min-w-28"
                value={draft.nrc_code}
                onChange={(next) => set({ nrc_code: next, nrc_township: '' })}
                aria-invalid={!!err('nrc_code')}
                options={reference.nrc_codes.map((code) => ({ value: code, label: code }))}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Township *
              <Combobox
                aria-label="NRC township"
                placeholder={townships.isFetching ? 'Loading…' : 'Select'}
                searchPlaceholder="Search township"
                contentClassName="min-w-56"
                value={draft.nrc_township}
                onChange={(next) => set({ nrc_township: next })}
                disabled={!draft.nrc_code}
                aria-invalid={!!err('nrc_township')}
                options={(townships.data ?? []).map((name) => ({ value: name, label: name }))}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Type *
              <Combobox
                aria-label="NRC type"
                contentClassName="min-w-28"
                value={draft.nrc_type}
                onChange={(next) => set({ nrc_type: next })}
                options={NRC_TYPES.map((type) => ({ value: type, label: `(${type})` }))}
              />
            </label>
          </div>
          {field('NRC number *', 'nrc_number', { inputMode: 'numeric', maxLength: 8, placeholder: '123456' })}
          {(err('nrc_code') || err('nrc_township')) && (
            <p className="text-xs text-destructive">{err('nrc_code') ?? err('nrc_township')}</p>
          )}
        </div>
      )}
    </div>
  )
}
