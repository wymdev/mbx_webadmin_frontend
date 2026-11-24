import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import Download from 'lucide-react/icons/download'
import Printer from 'lucide-react/icons/printer'
import Trash2 from 'lucide-react/icons/trash-2'
import RotateCcw from 'lucide-react/icons/rotate-ccw'
import Pencil from 'lucide-react/icons/pencil'
import Plus from 'lucide-react/icons/plus'
import { z } from 'zod'
import { apiClient, refreshCsrf } from '@/services/api'
import { useStaff, type Staff } from '@/features/auth/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QueryState } from '@/components/query-state'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { bangkokDate, calculateTotal } from '@/domain/money'
import { PageHeader } from '@/components/page-header'

const counts = z.object({ transactions: z.number(), buy: z.number(), sell: z.number() })
const dashboard = z.object({ totals: counts, all_time: z.object({ customers: z.number() }) })
const sections = [
  { title: 'Overview', endpoint: 'dashboard', fields: [] },
  { title: 'Transactions', endpoint: 'transactions', fields: ['transaction_id', 'exchange_type', 'from_currency', 'to_currency', 'amount', 'total', 'created_at'] },
  { title: 'Reports', endpoint: 'reports/summary', fields: [] },
  { title: 'Customers', endpoint: 'customers', fields: ['customer_id', 'name', 'transactions_count', 'last_transaction_at'] },
  { title: 'Rates', endpoint: 'rates', fields: ['currency', 'country', 'buy', 'sell'] },
  { title: 'Transfer methods', endpoint: 'transfer-methods', fields: ['name'] },
  { title: 'Customer sources', endpoint: 'customer-sources', fields: ['name'] },
  { title: 'Transaction trash', endpoint: 'transactions/trashed', fields: ['transaction_id', 'exchange_type', 'amount', 'deleted_at'] },
  { title: 'Staff trash', endpoint: 'users/trashed', fields: ['name', 'email', 'deleted_at'] },
  { title: 'Staff', endpoint: 'users', fields: ['name', 'email', 'created_at'] },
  { title: 'Audit log', endpoint: 'audit-logs', fields: ['seq', 'event', 'auditable_type', 'auditable_id', 'created_at'] },
] as const

const paths = {
  '/': 'dashboard', '/transactions': 'transactions', '/transactions/new': 'transactions',
  '/reports': 'reports/summary', '/customers': 'customers', '/rates': 'rates',
  '/settings/methods': 'transfer-methods', '/settings/sources': 'customer-sources',
  '/trash': 'transactions/trashed', '/trash/staff': 'users/trashed', '/settings/users': 'users', '/audit': 'audit-logs',
} as const

async function read<T>(endpoint: string, schema: z.ZodType<T>, signal: AbortSignal, params?: object) {
  const { data } = await apiClient.get(endpoint, { signal, params })
  return z.object({ data: schema }).parse(data).data
}

/**
 * Interim screens from the first live build. Each route moves to its own feature module as it is
 * redesigned; delete this file when none of its paths are routed here any more.
 */
export default function LegacyPage() {
  const account = useStaff()
  const { permissions } = account
  const livePaths = Object.entries(paths).filter(([, endpoint]) =>
    endpoint === 'users' || endpoint === 'users/trashed' ? permissions.manage_users : endpoint === 'audit-logs' ? permissions.view_audit_log : true,
  ).map(([path]) => path)
  livePaths.push('/profile', '/settings/slips')
  return <Ledger account={account} livePaths={livePaths} />
}

function Ledger({ account, livePaths }: { account: Staff; livePaths: string[] }) {
  const { pathname } = useLocation()
  if (!livePaths.includes(pathname)) return <div className="panel empty-state"><h1>Page unavailable</h1><Link className="text-primary underline" to="/">Back to overview</Link></div>
  if (pathname === '/settings/slips') return <ReceiptSettings />
  if (pathname === '/profile') return <><PageHeader title="My profile" description="Account details and password" /><Profile user={account.user} /></>
  const section = sections.find(({ endpoint }) => endpoint === paths[pathname as keyof typeof paths]) ?? sections[0]
  return (
    <div className="page-enter">
      <PageHeader title={section.title} description={section.endpoint === 'dashboard' ? 'Daily operations at Mergui Boss' : ''}>
        {pathname === '/' && <Button asChild><Link to="/transactions/new"><Plus /> New transaction</Link></Button>}
      </PageHeader>
      {pathname.startsWith('/trash') && account.permissions.manage_users && <nav className="mb-4 flex gap-2" aria-label="Trash views">
        <Button asChild variant={pathname === '/trash' ? 'default' : 'outline'}><Link to="/trash">Transactions</Link></Button>
        <Button asChild variant={pathname === '/trash/staff' ? 'default' : 'outline'}><Link to="/trash/staff">Staff accounts</Link></Button>
      </nav>}
      {section.endpoint === 'dashboard' ? <Overview /> : section.endpoint === 'reports/summary' ? <Reports /> : <LedgerTable key={pathname} section={section} startCreating={pathname === '/transactions/new'} />}
    </div>
  )
}

// A 401 anywhere ends the session through the API client's unauthorized handler.
function useLiveQuery<T>(key: readonly unknown[], queryFn: (signal: AbortSignal) => Promise<T>) {
  return useQuery({ queryKey: ['live', ...key], queryFn: ({ signal }) => queryFn(signal), retry: false })
}

function Overview() {
  const [date, setDate] = useState(() => bangkokDate(new Date()))
  const query = useLiveQuery(['dashboard', date], (signal) => read('dashboard', dashboard, signal, { date }))
  return (
    <>
      <label className="mb-5 inline-grid gap-1">Bangkok business day<Input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} /></label>
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
        {query.data && <dl className="grid grid-cols-2 gap-4 border-y py-4 sm:grid-cols-4">
          {Object.entries({ Transactions: query.data.totals.transactions, Buys: query.data.totals.buy, Sells: query.data.totals.sell, Customers: query.data.all_time.customers }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</dd></div>)}
        </dl>}
      </QueryState>
    </>
  )
}

const list = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z.object({ pagination: z.object({ has_more: z.boolean() }) }).optional(),
})

const report = z.object({ groups: z.array(z.object({
  from_currency: z.string(), to_currency: z.string(), exchange_type: z.string(),
  count: z.number(), amount_sum: z.string(), total_sum: z.string(),
})) })

function Reports() {
  const [from, setFrom] = useState(() => bangkokDate(new Date()))
  const [to, setTo] = useState(from)
  const filter = { 'filter[date_from]': from, 'filter[date_to]': to }
  const query = useLiveQuery(['reports', from, to], (signal) => read('reports/summary', report, signal, filter))
  const download = useMutation({ mutationFn: async () => {
    const response = await apiClient.get<Blob>('transactions/export', { params: filter, responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `mbx-transactions-${from}-${to}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  } })
  return <>
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="grid gap-1">From (Bangkok)<Input type="date" value={from} onChange={(event) => {
        const next = event.target.value
        if (next) { setFrom(next); if (next > to) setTo(next) }
      }} /></label>
      <label className="grid gap-1">To (Bangkok)<Input type="date" value={to} min={from} onChange={(event) => {
        const next = event.target.value
        if (next && next >= from) setTo(next)
      }} /></label>
      <Button variant="outline" disabled={!query.data || download.isPending} onClick={() => download.mutate()}><Download /> Export CSV</Button>
    </div>
    {download.error && <p role="alert" className="mb-3 text-destructive">{download.error.message}</p>}
    <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
      {query.data?.groups.length === 0 && <p>No transactions in this date range.</p>}
      {!!query.data?.groups.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr>{['Currency pair', 'Type', 'Transactions', 'Amount', 'Total'].map((label) => <th scope="col" className="border-b px-3 py-2" key={label}>{label}</th>)}</tr></thead>
        <tbody>{query.data.groups.map((group) => <tr key={JSON.stringify([group.from_currency, group.to_currency, group.exchange_type])}>
          {[`${group.from_currency} → ${group.to_currency}`, group.exchange_type, group.count, group.amount_sum, group.total_sum].map((value, index) => <td key={index} className="whitespace-nowrap border-b px-3 py-2 tabular-nums">{value}</td>)}
        </tr>)}</tbody>
      </table></div>}
    </QueryState>
  </>
}
function LedgerTable({ section, startCreating }: { section: (typeof sections)[number]; startCreating: boolean }) {
  const client = useQueryClient()
  const [rateHistory, setRateHistory] = useState<number | null>(null)
  const reorder = useMutation({
    mutationFn: async (ids: number[]) => {
      await refreshCsrf()
      await apiClient.post('rates/reorder', { ids })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['live', 'rates'] }),
  })
  const [page, setPage] = useState(1)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [listEdit, setListEdit] = useState<{ id?: number; name: string; deleting?: boolean } | null>(null)
  const [management, setManagement] = useState<{ row: Record<string, unknown>; deleting?: boolean } | null>(null)
  const lookupList = section.endpoint === 'transfer-methods' || section.endpoint === 'customer-sources'
  const managed = section.endpoint === 'rates' || section.endpoint === 'users'
  const [creating, setCreating] = useState(startCreating)
  const [action, setAction] = useState<{ id: number; kind: 'receipt' | 'delete' | 'restore' | 'edit' } | null>(null)
  const hasActions = managed || lookupList || section.endpoint === 'transactions' || section.endpoint === 'transactions/trashed' || section.endpoint === 'users/trashed' || section.endpoint === 'customers'
  const paginated = lookupList || ['transactions', 'customers', 'transactions/trashed', 'users', 'users/trashed', 'audit-logs'].includes(section.endpoint)
  const query = useLiveQuery([section.endpoint, page], async (signal) => {
    const response = await apiClient.get(section.endpoint, { signal, params: paginated ? { page } : undefined })
    return list.parse(response.data)
  })
  return (
    <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
      {lookupList && <Button className="mb-4" onClick={() => setListEdit({ name: '' })}><Plus /> Add entry</Button>}
      {managed && <Button className="mb-4" onClick={() => setManagement({ row: {} })}><Plus /> {section.endpoint === 'rates' ? 'Add rate' : 'Add staff account'}</Button>}
      {managed && management && <ManagementEdit endpoint={section.endpoint as 'rates' | 'users'} {...management} close={() => setManagement(null)} />}
      {rateHistory !== null && <RateHistory id={rateHistory} close={() => setRateHistory(null)} />}
      {reorder.error && <p className="text-destructive" role="alert">{reorder.error.message}</p>}
      {listEdit && <LookupEntry endpoint={section.endpoint} entry={listEdit} close={() => setListEdit(null)} />}
      {section.endpoint === 'transactions' && <Button className="mb-4" onClick={() => setCreating(true)}><Plus /> New transaction</Button>}
      {creating && <CreateTransaction close={() => setCreating(false)} />}
      {query.data && <>
        {query.data.data.length === 0 ? <p>No records found.</p> : <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead><tr>{section.fields.map((field) => <th key={field} scope="col" className="border-b px-3 py-2 capitalize">{field.replaceAll('_', ' ')}</th>)}{hasActions && <th scope="col" className="border-b px-3 py-2">Actions</th>}</tr></thead>
            <tbody>{query.data.data.map((row, index) => {
              const id = row.id
              return <tr key={String(id ?? row.customer_id ?? index)}>{section.fields.map((field) => <td key={field} className="whitespace-nowrap border-b px-3 py-2">{typeof row[field] === 'string' || typeof row[field] === 'number' ? String(row[field]) : '–'}</td>)}
                {hasActions && <td className="whitespace-nowrap border-b px-3 py-2">
                  {section.endpoint === 'customers' && typeof row.customer_id === 'string' && row.customer_id && <Button variant="ghost" size="sm" onClick={() => setCustomerId(String(row.customer_id))}><Pencil /> View / edit</Button>}
                  {section.endpoint !== 'customers' && typeof id === 'number' && (managed ? <>
                    {section.endpoint === 'rates' && <>
                      <Button variant="ghost" size="sm" onClick={() => setRateHistory(id)}>History</Button>
                      {([-1, 1] as const).map((direction) => <Button key={direction} variant="ghost" size="sm" disabled={reorder.isPending || index + direction < 0 || index + direction >= query.data.data.length} onClick={() => {
                        const ids = query.data.data.map((record) => record.id).filter((value): value is number => typeof value === 'number')
                        if (ids.length !== query.data.data.length) return
                        const other = index + direction
                        ;[ids[index], ids[other]] = [ids[other], ids[index]]
                        reorder.mutate(ids)
                      }}>{direction < 0 ? 'Move up' : 'Move down'}</Button>)}
                    </>}
                    <Button variant="ghost" size="sm" onClick={() => setManagement({ row })}><Pencil /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setManagement({ row, deleting: true })}><Trash2 /> Delete</Button>
                  </> : lookupList ? <>
                    <Button variant="ghost" size="sm" onClick={() => setListEdit({ id, name: String(row.name ?? '') })}><Pencil /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setListEdit({ id, name: String(row.name ?? ''), deleting: true })}><Trash2 /> Delete</Button>
                  </> : section.endpoint === 'transactions' ? <>
                    <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'receipt' })}><Printer /> Receipt</Button>
                    <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'edit' })}><Pencil /> Edit invoice</Button>
                    <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'delete' })}><Trash2 /> Trash</Button>
                  </> : <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'restore' })}><RotateCcw /> Restore</Button>)}
                </td>}
              </tr>
            })}</tbody>
          </table>
        </div>}
        {paginated && <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page}</span>
          <Button variant="outline" disabled={!query.data.meta?.pagination.has_more} onClick={() => setPage(page + 1)}>Next</Button>
        </div>}
      </>}
      {customerId && <CustomerDetails key={customerId} id={customerId} close={() => setCustomerId(null)} />}
      {action?.kind === 'edit' ? <EditInvoice key={action.id} id={action.id} close={() => setAction(null)} saved={() => setAction({ id: action.id, kind: 'receipt' })} /> : action && <TransactionAction key={`${action.kind}:${action.id}`} id={action.id} kind={action.kind} staff={section.endpoint === 'users/trashed'} close={() => setAction(null)} />}
    </QueryState>
  )
}

const receipt = z.object({
  transaction: z.object({
    transaction_id: z.string(), amount: z.string(), total: z.string(), from_currency: z.string(), to_currency: z.string(),
    exchange_type: z.string(), exchange_rate: z.string(), customer_name: z.string().nullish(),
    transfer_method: z.string().nullish(), description: z.string().nullish(),
  }),
  local_time: z.string().nullable(),
  look: z.object({ business_name: z.string(), font_color: z.string(), logo_url: z.string().nullable(), background_url: z.string().nullable() }),
})

const invoice = z.object({
  amount: z.string(), exchange_rate: z.string(), exchange_type: z.string(),
  from_currency: z.string(), to_currency: z.string(), transfer_method: z.string().nullable(),
  description: z.string().nullable(), customer_source_id: z.number().nullable(),
})

const namedOptions = z.array(z.object({ id: z.number(), name: z.string() }))
const transactionOptions = z.object({
  currencies: z.array(z.string()), transfer_methods: namedOptions, customer_sources: namedOptions,
})

function CreateTransaction({ close }: { close: () => void }) {
  const client = useQueryClient()
  const [exchangeType, setExchangeType] = useState<'Buy' | 'Sell'>('Buy')
  const [quote, setQuote] = useState('')
  const [customerMode, setCustomerMode] = useState('existing')
  const [idType, setIdType] = useState('passport')
  const options = useLiveQuery(['reference-data'], (signal) => read('reference-data', transactionOptions, signal))
  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const fields = (...names: string[]) => Object.fromEntries(names.map((name) => [name, String(form.get(name) ?? '').trim() || null]))
      const customer = customerMode === 'existing' ? fields('customer_id') : {
        ...fields('name', 'phone', 'country_code'), id_type: idType,
        ...(idType === 'passport' ? fields('passport', 'nationality') : fields('nrc_code', 'nrc_township', 'nrc_type', 'nrc_number')),
      }
      await refreshCsrf()
      await apiClient.post('transactions', {
        ...fields('exchange_type', 'from_currency', 'to_currency', 'operation', 'amount', 'exchange_rate', 'transfer_method', 'description'),
        customer_source_id: form.get('customer_source_id') ? Number(form.get('customer_source_id')) : null,
        customer,
      })
    },
    onSuccess: async () => {
      close()
      await client.invalidateQueries({ queryKey: ['live'] })
    },
  })
  const select = (label: string, name: string, choices: { value: string; label: string }[], required = false) => <label className="grid gap-1">{label}<select className="border-input bg-background h-9 rounded-md border px-2" name={name} required={required} defaultValue=""><option value="">{required ? 'Select' : 'None'}</option>{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
  const choices = (values: string[]) => values.map((value) => ({ value, label: value }))
  const field = (label: string, name: string, required = false, inputMode?: 'decimal') => <label className="grid gap-1">{label}<Input name={name} required={required} inputMode={inputMode} /></label>
  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
    <DialogTitle>New transaction</DialogTitle>
    <DialogDescription>Record an exchange.</DialogDescription>
    <QueryState loading={options.isPending} error={options.error} retry={options.refetch}>
      {options.data && <form className="grid gap-3" onChange={(event) => {
        const form = new FormData(event.currentTarget)
        try {
          const operation = form.get('operation')
          const currency = form.get('to_currency')
          if (!currency || currency === form.get('from_currency') || (operation !== 'multiply' && operation !== 'divide')) return setQuote('')
          setQuote(`${calculateTotal(String(form.get('amount')), String(form.get('exchange_rate')), operation)} ${currency}`)
        } catch {
          setQuote('')
        }
      }} onSubmit={(event) => { event.preventDefault(); if (!save.isPending) save.mutate(new FormData(event.currentTarget)) }}>
        <input type="hidden" name="exchange_type" value={exchangeType} />
        <div role="group" aria-label="Exchange type" className="grid grid-cols-2 gap-2">
          {(['Buy', 'Sell'] as const).map((type) => <Button key={type} type="button" size="lg" aria-pressed={exchangeType === type} variant={exchangeType === type ? 'default' : 'outline'} onClick={() => setExchangeType(type)}>{type}</Button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {select('Operation', 'operation', choices(['multiply', 'divide']), true)}
          {select('From currency', 'from_currency', choices(options.data.currencies), true)}
          {select('To currency', 'to_currency', choices(options.data.currencies), true)}
          {field('Amount', 'amount', true, 'decimal')}{field('Exchange rate', 'exchange_rate', true, 'decimal')}
          {select('Transfer method', 'transfer_method', choices(options.data.transfer_methods.map(({ name }) => name)))}
          {select('Customer source', 'customer_source_id', options.data.customer_sources.map(({ id, name }) => ({ value: String(id), label: name })))}
        </div>
        {field('Description', 'description')}
        <label className="grid gap-1">Customer<select className="border-input bg-background h-9 rounded-md border px-2" value={customerMode} onChange={(event) => setCustomerMode(event.target.value)}><option value="existing">Existing customer</option><option value="new">New customer</option></select></label>
        {customerMode === 'existing' ? field('Customer ID', 'customer_id', true) : <div className="grid gap-3 sm:grid-cols-2">
          {field('Name', 'name', true)}{field('Country code', 'country_code')}{field('Phone', 'phone')}
          <label className="grid gap-1">ID type<select className="border-input bg-background h-9 rounded-md border px-2" value={idType} onChange={(event) => setIdType(event.target.value)}><option value="passport">Passport</option><option value="nrc">NRC</option></select></label>
          {idType === 'passport' ? <>{field('Passport', 'passport', true)}{field('Nationality', 'nationality', true)}</> : <>{field('NRC code', 'nrc_code', true)}{field('NRC township', 'nrc_township', true)}{field('NRC type', 'nrc_type', true)}{field('NRC number', 'nrc_number', true)}</>}
        </div>}
        {save.error && <p role="alert" className="text-destructive">{save.error.message}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div><p className="text-sm text-muted-foreground">Estimated total</p><output className="text-xl font-bold tabular-nums">{quote || '—'}</output></div>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : `Save ${exchangeType.toLowerCase()}`}</Button>
        </div>
      </form>}
    </QueryState>
  </DialogContent></Dialog>
}

function EditInvoice({ id, close, saved }: { id: number; close: () => void; saved: () => void }) {
  const client = useQueryClient()
  const query = useLiveQuery(['transaction', id], (signal) => read(`transactions/${id}`, invoice, signal))
  const options = useLiveQuery(['reference-data'], (signal) => read('reference-data', transactionOptions, signal))
  const [notice, setNotice] = useState('')
  const save = useMutation({
    mutationFn: async (changes: Record<string, string | number | null>) => {
      await refreshCsrf()
      await apiClient.patch(`transactions/${id}`, changes)
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['live'] })
      saved()
    },
  })
  const original = query.data
  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogTitle>Edit invoice</DialogTitle>
      <DialogDescription>Transaction #{id}</DialogDescription>
      <QueryState loading={query.isPending || options.isPending} error={query.error ?? options.error} retry={() => { void query.refetch(); void options.refetch() }}>
        {original && options.data && <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault()
          if (save.isPending) return
          const form = new FormData(event.currentTarget)
          const reason = String(form.get('reason') ?? '').trim()
          if (reason.length < 3) return setNotice('Enter a reason of at least 3 characters.')
          const changes: Record<string, string | number | null> = {}
          for (const [field, baseline] of Object.entries(original)) {
            const raw = String(form.get(field) ?? '').trim()
            const value = field === 'customer_source_id' && raw ? Number(raw) : raw || null
            if (value !== baseline) changes[field] = value
          }
          const operation = String(form.get('operation') ?? '')
          if (operation) changes.operation = operation
          if (!Object.keys(changes).length) return setNotice('No invoice changes to save.')
          setNotice('')
          save.mutate({ ...changes, reason })
        }}>
          <div className="grid gap-3 sm:grid-cols-2">
          <InvoiceSelect label="Exchange type" name="exchange_type" value={original.exchange_type} choices={['Buy', 'Sell']} />
          <InvoiceSelect label="Calculation" name="operation" value="" choices={['', 'multiply', 'divide']} emptyLabel="Keep existing calculation" />
          <InvoiceSelect label="From currency" name="from_currency" value={original.from_currency} choices={options.data.currencies} />
          <InvoiceSelect label="To currency" name="to_currency" value={original.to_currency} choices={options.data.currencies} />
          <label className="grid gap-1">Amount<Input name="amount" inputMode="decimal" defaultValue={original.amount} required /></label>
          <label className="grid gap-1">Exchange rate<Input name="exchange_rate" inputMode="decimal" defaultValue={original.exchange_rate} required /></label>
          <InvoiceSelect label="Transfer method" name="transfer_method" value={original.transfer_method ?? ''} choices={['', ...options.data.transfer_methods.map(({ name }) => name)]} />
          <InvoiceSelect label="Customer source" name="customer_source_id" value={String(original.customer_source_id ?? '')} choices={['', ...options.data.customer_sources.map(({ id }) => String(id))]} labels={Object.fromEntries(options.data.customer_sources.map(({ id, name }) => [String(id), name]))} />
          </div>
          <label className="grid gap-1">Description<textarea className="border-input bg-background rounded-md border p-2" name="description" defaultValue={original.description ?? ''} /></label>
          <label className="grid gap-1">Reason for change<Input name="reason" required minLength={3} maxLength={500} /></label>
          {notice && <p role="status">{notice}</p>}
          {save.error && <p role="alert" className="text-destructive">{save.error.message}</p>}
          <Button type="submit" disabled={save.isPending}>Save and view receipt</Button>
        </form>}
      </QueryState>
    </DialogContent>
  </Dialog>
}

function TransactionAction({ id, kind, staff = false, close }: { id: number; kind: 'receipt' | 'delete' | 'restore'; staff?: boolean; close: () => void }) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['live', 'receipt', id],
    enabled: kind === 'receipt',
    queryFn: ({ signal }) => read(`transactions/${id}/receipt`, receipt, signal),
    retry: false,
    refetchOnMount: 'always',
  })
  const mutation = useMutation({
    mutationFn: async (reason: string) => {
      await refreshCsrf()
      if (kind === 'restore') await apiClient.post(`${staff ? 'users' : 'transactions'}/${id}/restore`, { reason })
      if (kind === 'delete') await apiClient.delete(`transactions/${id}`, { data: { reason } })
    },
    onSuccess: async () => {
      close()
      await client.invalidateQueries({ queryKey: ['live'] })
    },
  })
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close() }}>
    <DialogContent>
      <DialogTitle>{kind === 'receipt' ? 'Transaction receipt' : kind === 'restore' ? (staff ? 'Restore staff account' : 'Restore transaction') : 'Move transaction to trash'}</DialogTitle>
      <DialogDescription>{staff ? 'Staff account' : 'Transaction'} #{id}</DialogDescription>
      {kind === 'receipt' ? <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
        {query.data && <>
          <article className="transaction-print relative isolate grid gap-3 overflow-hidden rounded-md border bg-white p-5 tabular-nums" style={{ color: /^#[0-9a-f]{6}$/i.test(query.data.look.font_color) ? query.data.look.font_color : '#000000' }}>
            {query.data.look.background_url && <img alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" src={query.data.look.background_url} />}
            <header className="border-b pb-3">{query.data.look.logo_url && <img className="mb-2 max-h-12 max-w-36 object-contain" src={query.data.look.logo_url} alt="" />}<strong className="text-lg">{query.data.look.business_name}</strong><p>Exchange receipt #{query.data.transaction.transaction_id}</p>{query.data.local_time && <p>{query.data.local_time} (Bangkok)</p>}</header>
            <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              {Object.entries({
                Type: query.data.transaction.exchange_type,
                Customer: query.data.transaction.customer_name,
                Amount: `${query.data.transaction.amount} ${query.data.transaction.from_currency}`,
                'Exchange rate': query.data.transaction.exchange_rate,
                'Transfer method': query.data.transaction.transfer_method,
                'Total': `${query.data.transaction.total} ${query.data.transaction.to_currency}`,
              }).map(([label, value]) => value && <div key={label} className="col-span-2 grid grid-cols-subgrid"><dt>{label}</dt><dd className="wrap-anywhere text-right font-semibold">{value}</dd></div>)}
            </dl>
            {query.data.transaction.description && <p className="wrap-anywhere whitespace-pre-wrap border-t pt-3 text-sm">{query.data.transaction.description}</p>}
          </article>
          <Button type="button" variant="outline" disabled={query.isFetching} onClick={() => window.print()}><Printer /> Print receipt</Button>
        </>}
      </QueryState> : <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault()
        const reason = String(new FormData(event.currentTarget).get('reason')).trim()
        if (reason) mutation.mutate(reason)
      }}>
        <label className="grid gap-1">Reason<Input name="reason" required maxLength={500} /></label>
        {mutation.error && <p role="alert" className="text-destructive">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending}>{kind === 'restore' ? 'Restore' : 'Move to trash'}</Button>
      </form>}
    </DialogContent>
  </Dialog>
}

const receiptSettings = z.object({
  font_color: z.string().regex(/^#[0-9a-f]{6}$/i), logo_url: z.string().nullable(),
  slips: z.array(z.object({ id: z.number(), name: z.string(), image_url: z.string().nullish(), active: z.boolean() })),
})

function ReceiptSettings() {
  const client = useQueryClient()
  const query = useLiveQuery(['receipt-settings'], (signal) => read('receipt-settings', receiptSettings, signal))
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const save = useMutation({
    mutationFn: async ({ path, method, data }: { path: string; method: 'post' | 'put' | 'delete'; data?: object }) => {
      await refreshCsrf()
      await apiClient.request({ url: `receipt-settings/${path}`, method, data })
    },
    onSuccess: async () => {
      setEditing(null)
      setRemoving(null)
      await client.invalidateQueries({ queryKey: ['live'] })
    },
  })
  const settings = query.data
  return <>
    <PageHeader title="Receipt settings" description="Manage the logo, text color, and slip backgrounds." />
    <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
      {settings && <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="panel grid content-start gap-4 p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Slip backgrounds</h2><Button disabled={save.isPending} onClick={() => { save.reset(); setEditing('new'); setRemoving(null) }}><Plus /> Add background</Button></div>
          {!settings.slips.length && <p className="text-sm text-muted-foreground">No backgrounds yet.</p>}
          {settings.slips.map((slip) => <div key={slip.id} className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="mr-auto min-w-0 break-words font-medium">{slip.name}{slip.active && <small className="ml-2 text-primary">Active</small>}</span>
            {!slip.active && <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate({ path: `slips/${slip.id}/activate`, method: 'post' })}>Activate</Button>}
            <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => { save.reset(); setEditing(slip.id); setRemoving(null) }}><Pencil /> Edit</Button>
            <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => { save.reset(); setRemoving(slip.id); setEditing(null) }}><Trash2 /> Delete</Button>
          </div>)}
          {editing !== null && <form key={editing} className="grid gap-3 border-t pt-4" onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const image = data.get('image')
            if (image instanceof File && !image.size) data.delete('image')
            save.mutate({ path: editing === 'new' ? 'slips' : `slips/${editing}`, method: 'post', data })
          }}>
            <label className="grid gap-1">Background name<Input name="name" minLength={2} maxLength={191} defaultValue={settings.slips.find(({ id }) => id === editing)?.name} required /></label>
            <label className="grid gap-1">Image<Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={editing === 'new'} /></label>
            <div className="flex gap-2"><Button disabled={save.isPending}>Save background</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setEditing(null)}>Cancel</Button></div>
          </form>}
          {removing !== null && <form key={removing} className="grid gap-3 border-t pt-4" onSubmit={(event) => {
            event.preventDefault()
            const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
            if (reason.length >= 3) save.mutate({ path: `slips/${removing}`, method: 'delete', data: { reason } })
          }}>
            <label className="grid gap-1">Reason for deleting<Input name="reason" required minLength={3} maxLength={500} /></label>
            <div className="flex gap-2"><Button variant="destructive" disabled={save.isPending}>Delete background</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setRemoving(null)}>Cancel</Button></div>
          </form>}
        </section>
        <section className="panel grid content-start gap-4 p-5">
          <h2 className="font-semibold">Appearance</h2>
          <div className="relative isolate grid min-h-40 place-content-center gap-2 overflow-hidden rounded-md border bg-white p-4 text-center" style={{ color: settings.font_color }}>
            {settings.slips.find((slip) => slip.active)?.image_url && <img className="absolute inset-0 -z-10 h-full w-full object-cover" src={settings.slips.find((slip) => slip.active)?.image_url ?? undefined} alt="" />}
            {settings.logo_url && <img className="mx-auto max-h-12 max-w-36 object-contain" src={settings.logo_url} alt="Receipt logo" />}
            <strong>Mergui Boss</strong><span className="text-sm">Receipt preview</span>
          </div>
          <form key={settings.font_color} className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); save.mutate({ path: 'font-color', method: 'put', data: { color: new FormData(event.currentTarget).get('color') } }) }}>
            <label className="grid gap-1">Text color<Input className="w-16" name="color" type="color" defaultValue={settings.font_color} /></label>
            <Button variant="outline" disabled={save.isPending}>Save color</Button>
          </form>
          <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); save.mutate({ path: 'logo', method: 'post', data: new FormData(event.currentTarget) }) }}>
            <label className="grid gap-1">New logo<Input name="logo" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
            <Button variant="outline" disabled={save.isPending}>Upload logo</Button>
          </form>
        </section>
        {save.error && <p role="alert" className="text-destructive lg:col-span-2">{save.error.message}</p>}
      </div>}
    </QueryState>
  </>
}

function Profile({ user }: { user: Staff['user'] }) {
  const client = useQueryClient()
  const details = useMutation({
    mutationFn: async (form: FormData) => {
      const photo = form.get('photo')
      if (photo instanceof File && !photo.size) form.delete('photo')
      await refreshCsrf()
      await apiClient.post('profile', form)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['staff-session'] }),
  })
  const [passwordState, setPasswordState] = useState({ pending: false, message: '', failed: false })
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    setPasswordState({ pending: true, message: '', failed: false })
    try {
      await refreshCsrf()
      await apiClient.put('profile/password', Object.fromEntries(form))
      target.reset()
      setPasswordState({ pending: false, message: 'Password updated.', failed: false })
    } catch (error) {
      setPasswordState({ pending: false, message: error instanceof Error ? error.message : 'Password update failed.', failed: true })
    }
  }
  return <div className="grid max-w-3xl gap-8 sm:grid-cols-2">
    <form className="grid content-start gap-3" key={JSON.stringify([user.name, user.email, user.phone])} onSubmit={(event) => { event.preventDefault(); details.mutate(new FormData(event.currentTarget)) }}>
      <h3 className="font-semibold">Account details</h3>
      <label className="grid gap-1">Name<Input name="name" defaultValue={user.name} required /></label>
      <label className="grid gap-1">Email<Input name="email" type="email" defaultValue={user.email} required /></label>
      <label className="grid gap-1">Phone<Input name="phone" type="tel" defaultValue={user.phone ?? ''} /></label>
      <label className="grid gap-1">Photo<Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      {details.error && <p role="alert" className="text-destructive">{details.error.message}</p>}
      {details.isSuccess && <p role="status">Profile updated.</p>}
      <Button type="submit" disabled={details.isPending}>Save profile</Button>
    </form>
    <form className="grid content-start gap-3" onSubmit={changePassword}>
      <h3 className="font-semibold">Change password</h3>
      <label className="grid gap-1">Current password<Input name="current_password" type="password" autoComplete="current-password" required /></label>
      <label className="grid gap-1">New password<Input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label className="grid gap-1">Confirm password<Input name="password_confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
      {passwordState.message && <p role={passwordState.failed ? 'alert' : 'status'} className={passwordState.failed ? 'text-destructive' : undefined}>{passwordState.message}</p>}
      <Button type="submit" disabled={passwordState.pending}>Update password</Button>
    </form>
  </div>
}

function InvoiceSelect({ label, name, value, choices, emptyLabel = 'None', labels = {} }: {
  label: string; name: string; value: string; choices: string[]; emptyLabel?: string; labels?: Record<string, string>
}) {
  return <label className="grid gap-1">{label}<select className="border-input bg-background h-9 rounded-md border px-2" name={name} defaultValue={value}>
    {[...new Set([...choices, value])].map((option) => <option key={option} value={option}>{option ? labels[option] ?? option : emptyLabel}</option>)}
  </select></label>
}

function LookupEntry({ endpoint, entry, close }: { endpoint: string; entry: { id?: number; name: string; deleting?: boolean }; close: () => void }) {
  const client = useQueryClient()
  const save = useMutation({
    mutationFn: async (value: string) => {
      await refreshCsrf()
      const url = entry.id === undefined ? endpoint : `${endpoint}/${entry.id}`
      if (entry.deleting) await apiClient.delete(url, { data: { reason: value } })
      else if (entry.id !== undefined) await apiClient.patch(url, { name: value })
      else await apiClient.post(url, { name: value })
    },
    onSuccess: async () => {
      close()
      await client.invalidateQueries({ queryKey: ['live'] })
    },
  })
  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close() }}><DialogContent>
    <DialogTitle>{entry.deleting ? 'Delete entry' : entry.id === undefined ? 'Add entry' : 'Edit entry'}</DialogTitle>
    <DialogDescription>{entry.name || (endpoint === 'transfer-methods' ? 'Transfer method' : 'Customer source')}</DialogDescription>
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault()
      const value = String(new FormData(event.currentTarget).get('value') ?? '').trim()
      if (!save.isPending && value.length >= (entry.deleting ? 3 : 2)) save.mutate(value)
    }}>
      <label className="grid gap-1">{entry.deleting ? 'Reason for deleting' : 'Name'}<Input name="value" defaultValue={entry.deleting ? '' : entry.name} required minLength={entry.deleting ? 3 : 2} maxLength={entry.deleting ? 500 : 191} /></label>
      {save.error && <p role="alert" className="text-destructive">{save.error.message}</p>}
      <Button type="submit" variant={entry.deleting ? 'destructive' : 'default'} disabled={save.isPending}>{entry.deleting ? 'Delete' : 'Save'}</Button>
    </form>
  </DialogContent></Dialog>
}

const customerDetails = z.object({
  customer: z.object({ name: z.string(), phone: z.string().nullable(), country_code: z.string().nullable(), nationality: z.string().nullable(), facebook_profile_url: z.string().nullable() }),
  activity: z.object({ transactions: z.number(), first_transaction_at: z.string().nullable(), last_transaction_at: z.string().nullable() }),
})

const staffRoles = z.array(z.object({ id: z.number(), name: z.string(), assignable: z.boolean() }))

const rateHistoryRows = z.array(z.object({ id: z.number(), created_at: z.string().nullable(), buy: z.string(), sell: z.string() }))

function RateHistory({ id, close }: { id: number; close: () => void }) {
  const query = useLiveQuery(['rate-history', id], (signal) => read(`rates/${id}/history`, rateHistoryRows, signal))
  return <Dialog open onOpenChange={(open) => { if (!open) close() }}><DialogContent className="max-h-[90dvh] overflow-auto">
    <DialogTitle>Rate history</DialogTitle><DialogDescription>Last 30 days</DialogDescription>
    <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
      {query.data?.length ? <table className="w-full text-left tabular-nums text-sm">
        <thead><tr><th scope="col">Bangkok time</th><th scope="col">Buy</th><th scope="col">Sell</th></tr></thead>
        <tbody>{[...query.data].reverse().map((point) => <tr className="border-t" key={point.id}><td className="py-2">{point.created_at ? new Date(point.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' }) : '—'}</td><td>{point.buy}</td><td>{point.sell}</td></tr>)}</tbody>
      </table> : <p>No rate changes in this period.</p>}
    </QueryState>
  </DialogContent></Dialog>
}

function ManagementEdit({ endpoint, row, deleting, close }: { endpoint: 'rates' | 'users'; row: Record<string, unknown>; deleting?: boolean; close: () => void }) {
  const client = useQueryClient()
  const isRate = endpoint === 'rates'
  const creating = typeof row.id !== 'number'
  const url = creating ? endpoint : `${endpoint}/${row.id}`
  const options = useQuery({
    queryKey: ['live', 'management-options', endpoint], enabled: !deleting, retry: false,
    queryFn: async ({ signal }) => isRate
      ? { currencies: (await read('reference-data', z.object({ currencies: z.array(z.string()) }), signal)).currencies, roles: [] }
      : { currencies: [], roles: await read('users/roles', staffRoles, signal) },
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason') ?? '').trim()
    if (deleting && reason.length < 3) return
    setPending(true)
    setError('')
    try {
      await refreshCsrf()
      if (deleting) await apiClient.delete(url, { data: { reason } })
      else if (isRate) {
        const photo = form.get('photo')
        if (photo instanceof File && !photo.size) form.delete('photo')
        await apiClient.post(url, form)
      } else {
        const role = form.get('role')
        const password = form.get('password')
        const data = { name: form.get('name'), email: form.get('email'), ...(password && { password }), ...(role && { role_ids: [Number(role)] }) }
        if (creating) await apiClient.post(url, data)
        else await apiClient.patch(url, data)
      }
      await client.invalidateQueries({ queryKey: ['live'] })
      close()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The request failed.')
    } finally {
      setPending(false)
    }
  }
  const subject = isRate ? 'rate' : 'staff account'
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>{deleting ? `Delete ${subject}` : creating ? `Add ${subject}` : `Edit ${subject}`}</DialogTitle>
    <DialogDescription>{String(row.currency ?? row.name ?? (isRate ? 'Exchange rates' : 'Team members'))}</DialogDescription>
    <QueryState loading={!deleting && options.isPending} error={options.error} retry={options.refetch}>
      <form className="grid gap-3" onSubmit={submit}>
        {deleting ? <label className="grid gap-1">Reason<Input name="reason" minLength={3} maxLength={500} required /></label> : isRate ? <>
          <InvoiceSelect label="Currency" name="currency" value={String(row.currency ?? options.data?.currencies[0] ?? '')} choices={options.data?.currencies ?? []} />
          <label className="grid gap-1">Country<Input name="country" defaultValue={String(row.country ?? '')} required maxLength={100} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">Buy<Input name="buy" inputMode="decimal" defaultValue={String(row.buy ?? '')} required /></label>
            <label className="grid gap-1">Sell<Input name="sell" inputMode="decimal" defaultValue={String(row.sell ?? '')} required /></label>
          </div>
          <label className="grid gap-1">Flag image<Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        </> : <>
          <label className="grid gap-1">Name<Input name="name" defaultValue={String(row.name ?? '')} minLength={2} required /></label>
          <label className="grid gap-1">Email<Input name="email" type="email" defaultValue={String(row.email ?? '')} required /></label>
          <label className="grid gap-1">{creating ? 'Password' : 'New password (optional)'}<Input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required={creating} /></label>
          <label className="grid gap-1">Role<select name="role" className="h-9 rounded-md border bg-background px-2" defaultValue="" required={creating}><option value="">{creating ? 'Select role' : 'Keep current roles'}</option>{options.data?.roles.filter(({ assignable }) => assignable).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        </>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button disabled={pending} variant={deleting ? 'destructive' : 'default'}>{deleting ? 'Delete' : 'Save'}</Button>
      </form>
    </QueryState>
  </DialogContent></Dialog>
}

function CustomerDetails({ id, close }: { id: string; close: () => void }) {
  const client = useQueryClient()
  const endpoint = `customers/${encodeURIComponent(id)}`
  const query = useLiveQuery(['customer', id], (signal) => read(endpoint, customerDetails, signal))
  const [deleting, setDeleting] = useState(false)
  const save = useMutation({
    mutationFn: async (data: Record<string, string | null>) => {
      await refreshCsrf()
      if (deleting) await apiClient.delete(endpoint, { data })
      else await apiClient.patch(endpoint, data)
    },
    onSuccess: async () => {
      close()
      await client.invalidateQueries({ queryKey: ['live'] })
    },
  })
  const customer = query.data?.customer
  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>{deleting ? 'Delete customer' : customer?.name ?? 'Customer details'}</DialogTitle>
    <DialogDescription>{deleting ? 'Existing ledger transactions will be kept.' : `Customer ${id}`}</DialogDescription>
    <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
      {customer && <form key={String(deleting)} className="grid gap-3" onSubmit={(event) => {
        event.preventDefault()
        if (save.isPending) return
        const fields = Object.fromEntries([...new FormData(event.currentTarget)].map(([field, value]) => [field, String(value).trim() || null]))
        if (deleting && (fields.reason?.length ?? 0) < 3) return
        const changes = Object.fromEntries(Object.entries(fields).filter(([field, value]) => field === 'reason' ? value !== null : value !== customer[field as keyof typeof customer]))
        if (!deleting && !Object.keys(changes).some((field) => field !== 'reason')) return
        save.mutate(changes)
      }}>
        {!deleting && <>
          <p className="text-sm text-muted-foreground">{query.data?.activity.transactions ?? 0} transactions</p>
          <label className="grid gap-1">Name<Input name="name" defaultValue={customer.name} minLength={2} maxLength={191} required /></label>
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
            <label className="grid gap-1">Country code<Input name="country_code" defaultValue={customer.country_code ?? ''} maxLength={8} /></label>
            <label className="grid gap-1">Phone<Input name="phone" type="tel" defaultValue={customer.phone ?? ''} maxLength={32} /></label>
          </div>
          <label className="grid gap-1">Nationality<Input name="nationality" defaultValue={customer.nationality ?? ''} maxLength={64} /></label>
          <label className="grid gap-1">Facebook profile URL<Input name="facebook_profile_url" type="url" defaultValue={customer.facebook_profile_url ?? ''} /></label>
        </>}
        <label className="grid gap-1">{deleting ? 'Reason for deleting' : 'Reason (optional)'}<Input name="reason" required={deleting} minLength={3} maxLength={500} /></label>
        {save.error && <p role="alert" className="text-destructive">{save.error.message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant={deleting ? 'destructive' : 'default'} disabled={save.isPending}>{deleting ? 'Delete customer' : 'Save changes'}</Button>
          <Button type="button" variant="outline" disabled={save.isPending} onClick={() => { save.reset(); setDeleting(!deleting) }}>{deleting ? 'Cancel' : 'Delete…'}</Button>
        </div>
      </form>}
    </QueryState>
  </DialogContent></Dialog>
}