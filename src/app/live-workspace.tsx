import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import Download from 'lucide-react/icons/download'
import Printer from 'lucide-react/icons/printer'
import Trash2 from 'lucide-react/icons/trash-2'
import RotateCcw from 'lucide-react/icons/rotate-ccw'
import Pencil from 'lucide-react/icons/pencil'
import Plus from 'lucide-react/icons/plus'
import ChartLine from 'lucide-react/icons/chart-line'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiClient, download as downloadFile, refreshCsrf, UPLOAD_TIMEOUT } from '@/services/api'
import { prepareImageField } from '@/lib/image'
import { cn, formatRate } from '@/lib/utils'
import { ServerTable, type Row, type ServerColumn, type ServerFilter } from '@/components/server-table'
import { RateHistoryDialog, RateSparkline, RateWithTrend } from '@/features/rates/rate-trends'
import { ReceiptDesigner } from '@/features/receipts/receipt-designer'
import { ReceiptView } from '@/features/receipts/receipt-view'
import { useStaff, type Staff } from '@/features/auth/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker, DateRangePicker } from '@/components/ui/date-picker'
import { QueryState } from '@/components/query-state'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { bangkokDate, calculateTotal } from '@/domain/money'
import { PageHeader } from '@/components/page-header'

const counts = z.object({ transactions: z.number(), buy: z.number(), sell: z.number() })
const dashboard = z.object({ totals: counts, all_time: z.object({ customers: z.number() }) })
const sections = [
  { title: 'Overview', endpoint: 'dashboard' },
  { title: 'Transactions', endpoint: 'transactions' },
  { title: 'Reports', endpoint: 'reports/summary' },
  { title: 'Customers', endpoint: 'customers' },
  { title: 'Exchange rates', endpoint: 'rates' },
  { title: 'Transfer methods', endpoint: 'transfer-methods' },
  { title: 'Customer sources', endpoint: 'customer-sources' },
  { title: 'Transaction trash', endpoint: 'transactions/trashed' },
  { title: 'Staff trash', endpoint: 'users/trashed' },
  { title: 'Staff', endpoint: 'users' },
  { title: 'Audit log', endpoint: 'audit-logs' },
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
  if (pathname === '/settings/slips') return <ReceiptDesigner />
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
      <div className="mb-5 inline-grid gap-1">Bangkok business day<DatePicker className="w-56" aria-label="Bangkok business day" clearable={false} value={date} onChange={(next) => next && setDate(next)} /></div>
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
        {query.data && <dl className="grid grid-cols-2 gap-4 border-y py-4 sm:grid-cols-4">
          {Object.entries({ Transactions: query.data.totals.transactions, Buys: query.data.totals.buy, Sells: query.data.totals.sell, Customers: query.data.all_time.customers }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</dd></div>)}
        </dl>}
      </QueryState>
    </>
  )
}

const report = z.object({ groups: z.array(z.object({
  from_currency: z.string(), to_currency: z.string(), exchange_type: z.string(),
  count: z.number(), amount_sum: z.string(), total_sum: z.string(),
})) })

function Reports() {
  const [from, setFrom] = useState(() => bangkokDate(new Date()))
  const [to, setTo] = useState(from)
  const filter = { 'filter[date_from]': from, 'filter[date_to]': to }
  const query = useLiveQuery(['reports', from, to], (signal) => read('reports/summary', report, signal, filter))
  const download = useMutation({
    mutationFn: () => downloadFile('exports/transactions', `mbx-transactions-${from}-${to}.xlsx`, filter),
    meta: { success: 'Excel file downloaded' },
  })
  return <section className="panel overflow-hidden">
    <div className="flex flex-wrap items-end gap-3 border-b px-5 py-4">
      <div className="grid gap-1">Period (Bangkok)<DateRangePicker className="w-80 max-w-full" aria-label="Report period" value={{ from, to }} onChange={(next) => { setFrom(next.from); setTo(next.to) }} /></div>
      <Button variant="outline" disabled={!query.data || download.isPending} onClick={() => download.mutate()}><Download /> {download.isPending ? 'Exporting…' : 'Export to Excel'}</Button>
    </div>
    {download.error && <p role="alert" className="border-b px-5 py-3 text-sm text-destructive">{download.error.message}</p>}
    <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
      {query.data?.groups.length === 0 && <p className="empty-state text-sm text-muted-foreground">No transactions in this date range.</p>}
      {!!query.data?.groups.length && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-[var(--card-header)] text-xs text-muted-foreground"><tr>{['Currency pair', 'Type', 'Transactions', 'Amount', 'Total'].map((label, index) => <th scope="col" className={cn('border-b px-5 py-3 font-semibold', index > 1 && 'text-right')} key={label}>{label}</th>)}</tr></thead>
        <tbody>{query.data.groups.map((group) => <tr key={JSON.stringify([group.from_currency, group.to_currency, group.exchange_type])} className="transition-colors hover:bg-muted/60">
          <td className="whitespace-nowrap border-b px-5 py-3 font-medium">{group.from_currency} → {group.to_currency}</td>
          <td className="whitespace-nowrap border-b px-5 py-3"><Cell field="exchange_type" value={group.exchange_type} /></td>
          {[String(group.count), group.amount_sum, group.total_sum].map((value, index) => <td key={index} className="whitespace-nowrap border-b px-5 py-3 text-right tabular-nums">{groupDigits(value)}</td>)}
        </tr>)}</tbody>
      </table></div>}
    </QueryState>
  </section>
}
const NUMERIC_FIELDS = new Set(['amount', 'total', 'buy', 'sell', 'transactions_count', 'seq'])
const isNumeric = (field: string) => NUMERIC_FIELDS.has(field)

const bangkokDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** "1234567.50" → "1,234,567.50". Works on the string, so no precision is lost. */
function groupDigits(value: string) {
  const match = /^(-?)(\d+)(\.\d+)?$/.exec(value)
  return match ? `${match[1]}${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${match[3] ?? ''}` : value
}

function Cell({ field, value }: { field: string; value: unknown }) {
  if (typeof value !== 'string' && typeof value !== 'number') return <span className="text-muted-foreground">–</span>
  const text = String(value)
  if (field === 'exchange_type') {
    return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', text === 'Buy' ? 'bg-primary/10 text-primary' : 'bg-[var(--gold)]/15 text-[#8a5a00] dark:text-[var(--gold)]')}>{text}</span>
  }
  if (field.endsWith('_at')) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? text : <time dateTime={text}>{bangkokDateTime.format(date)}</time>
  }
  if (isNumeric(field)) return groupDigits(text)
  if (field === 'transaction_id' || field === 'customer_id') return <span className="font-medium tabular-nums">{text}</span>
  return text
}

/** A column showing one API field through `Cell`. */
function field(id: string, label: string, options: Partial<ServerColumn> = {}): ServerColumn {
  return { id, label, cell: (row) => <Cell field={id} value={row[id]} />, ...(isNumeric(id) ? { align: 'right' as const } : {}), ...options }
}
/** A column of plain text, cut short with the full text on hover. */
function text(id: string, label: string, options: Partial<ServerColumn> = {}): ServerColumn {
  return {
    id, label, ...options,
    cell: (row) => {
      const value = row[id]
      if (typeof value !== 'string' || !value) return <span className="text-muted-foreground">–</span>
      return <span className="block max-w-64 truncate" title={value}>{value}</span>
    },
  }
}
const nameOf = (value: unknown) => (value && typeof value === 'object' && 'name' in value ? String((value as { name: unknown }).name) : null)
const options = (values: string[], labels: Record<string, string> = {}) => values.map((value) => ({ value, label: labels[value] ?? value }))

const AUDIT_EVENTS = ['created', 'updated', 'deleted', 'restored', 'exported', 'login', 'logout', 'login_failed', 'password_changed', 'roles_changed', 'token_issued']
const AUDIT_TYPES: Record<string, string> = {
  transaction: 'Transaction', customer: 'Customer', rate: 'Rate', user: 'Staff', transfer_method: 'Transfer method',
  customer_source: 'Customer source', slip_image: 'Receipt background', slip_logo: 'Receipt logo', receipt_color: 'Receipt colour',
}

type TableSetup = { columns: ServerColumn[]; filters?: ServerFilter[]; params?: Record<string, string>; paginated?: boolean }

/** Columns, filters and fixed query parameters for each live list. */
function useTableSetup(endpoint: string): TableSetup {
  const transactional = endpoint === 'transactions' || endpoint === 'transactions/trashed'
  const reference = useQuery({
    queryKey: ['live', 'reference-data'], enabled: transactional, staleTime: 300_000,
    queryFn: ({ signal }) => read('reference-data', transactionOptions, signal),
  })
  const roles = useQuery({
    queryKey: ['live', 'staff-roles'], enabled: endpoint === 'users', staleTime: 300_000,
    queryFn: ({ signal }) => read('users/roles', staffRoles, signal),
  })
  const currencies = reference.data?.currencies ?? []
  const type: ServerFilter = { type: 'select', name: 'exchange_type', label: 'Type', options: options(['Buy', 'Sell']) }

  switch (endpoint) {
    case 'transactions':
      return {
        params: { include: 'created_by' },
        columns: [
          field('transaction_id', 'Transaction ID', { required: true, sort: 'transaction_id' }),
          field('created_at', 'Date (Bangkok)', { sort: 'created_at' }),
          field('exchange_type', 'Type'),
          text('customer_name', 'Customer'),
          field('customer_id', 'Customer ID', { hidden: true }),
          field('from_currency', 'From'),
          field('amount', 'Amount', { sort: 'amount' }),
          { id: 'exchange_rate', label: 'Rate', align: 'right', cell: (row) => (typeof row.exchange_rate === 'string' ? formatRate(row.exchange_rate) : '–') },
          field('to_currency', 'To'),
          field('total', 'Total', { sort: 'total' }),
          text('transfer_method', 'Method'),
          { id: 'created_by', label: 'Staff', cell: (row) => nameOf(row.created_by) ?? '–' },
          text('description', 'Note', { hidden: true }),
        ],
        filters: [
          { type: 'search', name: 'q', label: 'Search', placeholder: 'Transaction ID or customer name' },
          type,
          { type: 'select', name: 'from_currency', label: 'From', options: options(currencies) },
          { type: 'select', name: 'to_currency', label: 'To', options: options(currencies) },
          { type: 'select', name: 'transfer_method', label: 'Method', options: options((reference.data?.transfer_methods ?? []).map(({ name }) => name)) },
          { type: 'select', name: 'customer_source_id', label: 'Source', options: (reference.data?.customer_sources ?? []).map(({ id, name }) => ({ value: String(id), label: name })) },
          { type: 'date', name: 'date_from', label: 'From date' },
          { type: 'date', name: 'date_to', label: 'To date' },
        ],
      }
    case 'transactions/trashed':
      return {
        params: { include: 'deleted_by' },
        columns: [
          field('transaction_id', 'Transaction ID', { required: true, sort: 'transaction_id' }),
          field('exchange_type', 'Type'),
          text('customer_name', 'Customer'),
          field('from_currency', 'From'),
          field('amount', 'Amount', { sort: 'amount' }),
          field('to_currency', 'To'),
          field('total', 'Total', { sort: 'total' }),
          field('created_at', 'Date (Bangkok)', { hidden: true, sort: 'created_at' }),
          field('deleted_at', 'Deleted (Bangkok)', { sort: 'deleted_at' }),
          { id: 'deleted_by', label: 'Deleted by', cell: (row) => nameOf(row.deleted_by) ?? '–' },
        ],
        filters: [
          { type: 'search', name: 'q', label: 'Search', placeholder: 'Transaction ID or customer name' },
          type,
          { type: 'date', name: 'deleted_from', label: 'Deleted from' },
          { type: 'date', name: 'deleted_to', label: 'Deleted to' },
        ],
      }
    case 'customers':
      return {
        columns: [
          field('customer_id', 'Customer ID', { required: true }),
          text('name', 'Name', { sort: 'name' }),
          { id: 'phone', label: 'Phone', cell: (row) => (row.phone ? `${row.country_code ? `${String(row.country_code)} ` : ''}${String(row.phone)}` : '–') },
          { id: 'id_type', label: 'ID type', cell: (row) => (row.id_type === 'nrc' ? 'NRC' : row.id_type === 'passport' ? 'Passport' : '–') },
          { id: 'id_number', label: 'ID number', hidden: true, cell: (row) => identityNumber(row) },
          text('nationality', 'Nationality'),
          field('transactions_count', 'Deals'),
          field('last_transaction_at', 'Last deal (Bangkok)'),
          field('created_at', 'Joined (Bangkok)', { hidden: true, sort: 'created_at' }),
          text('facebook_profile_url', 'Facebook', { hidden: true }),
        ],
        filters: [
          { type: 'search', name: 'q', label: 'Search', placeholder: 'Name, phone or customer ID' },
          { type: 'select', name: 'id_type', label: 'ID type', options: options(['nrc', 'passport'], { nrc: 'NRC', passport: 'Passport' }) },
          { type: 'date', name: 'created_from', label: 'Joined from' },
          { type: 'date', name: 'created_to', label: 'Joined to' },
        ],
      }
    case 'rates':
      return {
        paginated: false,
        columns: [
          {
            id: 'currency', label: 'Currency', required: true,
            cell: (row) => <span className="inline-flex items-center gap-2 font-semibold">
              {typeof row.photo_url === 'string' && <img src={row.photo_url} alt="" className="size-6 rounded-full border object-cover" />}
              {String(row.currency ?? '')}
            </span>,
          },
          text('country', 'Country'),
          { id: 'buy', label: 'Buy', align: 'right', cell: (row) => <RateWithTrend value={row.buy} trend={row.buy_trend} /> },
          { id: 'sell', label: 'Sell', align: 'right', cell: (row) => <RateWithTrend value={row.sell} trend={row.sell_trend} /> },
          { id: 'movement', label: 'Last 30 days', cell: (row) => (typeof row.id === 'number' ? <RateSparkline rateId={row.id} /> : '–') },
          field('updated_at', 'Updated (Bangkok)'),
        ],
      }
    case 'transfer-methods':
    case 'customer-sources':
      return {
        columns: [
          text('name', 'Name', { required: true, sort: 'name' }),
          field('created_at', 'Added (Bangkok)', { sort: 'created_at' }),
          field('updated_at', 'Changed (Bangkok)', { hidden: true }),
        ],
        filters: [{ type: 'search', name: 'q', label: 'Search', placeholder: 'Name' }],
      }
    case 'users':
      return {
        columns: [
          {
            id: 'name', label: 'Name', required: true, sort: 'name',
            cell: (row) => <span className="inline-flex items-center gap-2 font-medium">
              {typeof row.photo_url === 'string' && !row.photo_url.endsWith('user2.png') && <img src={row.photo_url} alt="" className="size-7 rounded-full object-cover" />}
              {String(row.name ?? '')}
            </span>,
          },
          text('email', 'Email', { sort: 'email' }),
          text('phone', 'Phone'),
          { id: 'roles', label: 'Role', cell: (row) => (Array.isArray(row.roles) ? row.roles.map(nameOf).filter(Boolean).join(', ') || '–' : '–') },
          field('created_at', 'Added (Bangkok)', { sort: 'created_at' }),
        ],
        filters: [
          { type: 'search', name: 'q', label: 'Search', placeholder: 'Name or email' },
          { type: 'select', name: 'role', label: 'Role', options: options((roles.data ?? []).map(({ name }) => name)) },
        ],
      }
    case 'users/trashed':
      return {
        columns: [
          text('name', 'Name', { required: true, sort: 'name' }),
          text('email', 'Email'),
          field('deleted_at', 'Deleted (Bangkok)', { sort: 'deleted_at' }),
        ],
      }
    case 'audit-logs':
      return {
        columns: [
          field('seq', '#', { required: true, sort: 'seq' }),
          field('created_at', 'Time (Bangkok)'),
          { id: 'event', label: 'Event', cell: (row) => String(row.event ?? '').replaceAll('_', ' ') },
          { id: 'auditable_type', label: 'Record', cell: (row) => AUDIT_TYPES[String(row.auditable_type)] ?? String(row.auditable_type ?? '–') },
          text('auditable_id', 'Record ID'),
          { id: 'user', label: 'By', cell: (row) => nameOf(row.user) ?? 'System' },
          text('channel', 'Channel'),
          text('reason', 'Reason'),
          text('ip_address', 'IP address', { hidden: true }),
        ],
        filters: [
          { type: 'select', name: 'event', label: 'Event', options: options(AUDIT_EVENTS, Object.fromEntries(AUDIT_EVENTS.map((event) => [event, event.replaceAll('_', ' ')]))) },
          { type: 'select', name: 'auditable_type', label: 'Record', options: options(Object.keys(AUDIT_TYPES), AUDIT_TYPES) },
          { type: 'select', name: 'channel', label: 'Channel', options: options(['admin', 'mobile', 'public', 'system']) },
          { type: 'date', name: 'date_from', label: 'From date' },
          { type: 'date', name: 'date_to', label: 'To date' },
        ],
      }
    default:
      return { columns: [] }
  }
}

function identityNumber(row: Row) {
  const nrc = row.nrc as { code?: string; township?: string; type?: string; number?: string } | null | undefined
  if (row.id_type === 'nrc' && nrc) return `${nrc.code ?? ''}/${nrc.township ?? ''}(${nrc.type ?? ''})${nrc.number ?? ''}`
  return typeof row.passport === 'string' && row.passport ? row.passport : '–'
}

/** Excel export list and import type for each live list (transaction import is for admins). */
function excelFor(endpoint: string, admin: boolean): { exportList?: string; importType?: string } | undefined {
  switch (endpoint) {
    case 'transactions': return { exportList: 'transactions', importType: admin ? 'transactions' : undefined }
    case 'transactions/trashed': return { exportList: 'transactions-trash' }
    case 'customers': return { exportList: 'customers', importType: 'customers' }
    case 'rates': return { exportList: 'rates', importType: 'rates' }
    case 'transfer-methods': return { exportList: 'transfer-methods', importType: 'transfer-methods' }
    case 'customer-sources': return { exportList: 'customer-sources', importType: 'customer-sources' }
    case 'users': return { exportList: 'staff' }
    case 'audit-logs': return { exportList: 'audit-logs' }
    default: return undefined
  }
}

function LedgerTable({ section, startCreating }: { section: (typeof sections)[number]; startCreating: boolean }) {
  const client = useQueryClient()
  const { permissions } = useStaff()
  const setup = useTableSetup(section.endpoint)
  const [rateHistory, setRateHistory] = useState<Row | null>(null)
  const reorder = useMutation({
    mutationFn: async (ids: number[]) => {
      await refreshCsrf()
      await apiClient.post('rates/reorder', { ids })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['live', 'rates'] }),
    meta: { success: 'Rate order updated' },
  })
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [listEdit, setListEdit] = useState<{ id?: number; name: string; deleting?: boolean } | null>(null)
  const [management, setManagement] = useState<{ row: Record<string, unknown>; deleting?: boolean } | null>(null)
  const lookupList = section.endpoint === 'transfer-methods' || section.endpoint === 'customer-sources'
  const managed = section.endpoint === 'rates' || section.endpoint === 'users'
  const [creating, setCreating] = useState(startCreating)
  const [action, setAction] = useState<{ id: number; kind: 'receipt' | 'delete' | 'restore' | 'edit' } | null>(null)
  const hasActions = managed || lookupList || section.endpoint === 'transactions' || section.endpoint === 'transactions/trashed' || section.endpoint === 'users/trashed' || section.endpoint === 'customers'

  const toolbar = <>
    {lookupList && <Button onClick={() => setListEdit({ name: '' })}><Plus /> Add entry</Button>}
    {managed && <Button onClick={() => setManagement({ row: {} })}><Plus /> {section.endpoint === 'rates' ? 'Add rate' : 'Add staff account'}</Button>}
    {section.endpoint === 'transactions' && <Button onClick={() => setCreating(true)}><Plus /> New transaction</Button>}
  </>

  const rowActions = (row: Row) => {
    const id = row.id
    if (section.endpoint === 'customers')
      return typeof row.customer_id === 'string' && row.customer_id ? <Button variant="ghost" size="sm" onClick={() => setCustomerId(String(row.customer_id))}><Pencil /> View / edit</Button> : null
    if (typeof id !== 'number') return null
    if (managed) return <>
      {section.endpoint === 'rates' && <Button variant="ghost" size="sm" onClick={() => setRateHistory(row)}><ChartLine /> History</Button>}
      <Button variant="ghost" size="sm" onClick={() => setManagement({ row })}><Pencil /> Edit</Button>
      <Button variant="ghost" size="sm" onClick={() => setManagement({ row, deleting: true })}><Trash2 /> Delete</Button>
    </>
    if (lookupList) return <>
      <Button variant="ghost" size="sm" onClick={() => setListEdit({ id, name: String(row.name ?? '') })}><Pencil /> Edit</Button>
      <Button variant="ghost" size="sm" onClick={() => setListEdit({ id, name: String(row.name ?? ''), deleting: true })}><Trash2 /> Delete</Button>
    </>
    if (section.endpoint === 'transactions') return <>
      <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'receipt' })}><Printer /> Receipt</Button>
      <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'edit' })}><Pencil /> Edit</Button>
      <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'delete' })}><Trash2 /> Trash</Button>
    </>
    return <Button variant="ghost" size="sm" onClick={() => setAction({ id, kind: 'restore' })}><RotateCcw /> Restore</Button>
  }

  return <>
    {managed && management && <ManagementEdit endpoint={section.endpoint as 'rates' | 'users'} {...management} close={() => setManagement(null)} />}
    {rateHistory && typeof rateHistory.id === 'number' && <RateHistoryDialog
      rate={{ id: rateHistory.id, currency: String(rateHistory.currency ?? ''), country: typeof rateHistory.country === 'string' ? rateHistory.country : undefined, buy: typeof rateHistory.buy === 'string' ? rateHistory.buy : undefined, sell: typeof rateHistory.sell === 'string' ? rateHistory.sell : undefined }}
      close={() => setRateHistory(null)}
    />}
    {listEdit && <LookupEntry endpoint={section.endpoint} entry={listEdit} close={() => setListEdit(null)} />}
    {creating && <CreateTransaction close={() => setCreating(false)} />}
    <ServerTable
      id={section.endpoint}
      title={section.title}
      endpoint={section.endpoint}
      {...setup}
      toolbar={toolbar}
      rowActions={hasActions ? rowActions : undefined}
      rowKey={(row, index) => String(row.id ?? row.customer_id ?? row.seq ?? index)}
      excel={excelFor(section.endpoint, permissions.manage_users)}
      onReorder={section.endpoint === 'rates' ? (ids) => reorder.mutate(ids) : undefined}
      reorderPending={reorder.isPending}
    />
    {customerId && <CustomerDetails key={customerId} id={customerId} close={() => setCustomerId(null)} />}
    {action?.kind === 'edit' ? <EditInvoice key={action.id} id={action.id} close={() => setAction(null)} saved={() => setAction({ id: action.id, kind: 'receipt' })} /> : action && <TransactionAction key={`${action.kind}:${action.id}`} id={action.id} kind={action.kind} staff={section.endpoint === 'users/trashed'} close={() => setAction(null)} />}
  </>
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
    meta: { success: 'Transaction saved' },
  })
  const formRef = useRef<HTMLFormElement>(null)
  const recalculate = () => {
    if (!formRef.current) return
    const form = new FormData(formRef.current)
    try {
      const operation = form.get('operation')
      const currency = form.get('to_currency')
      if (!currency || currency === form.get('from_currency') || (operation !== 'multiply' && operation !== 'divide')) return setQuote('')
      setQuote(`${calculateTotal(String(form.get('amount')), String(form.get('exchange_rate')), operation)} ${currency}`)
    } catch {
      setQuote('')
    }
  }
  // The combobox writes its hidden input on the next render; recalculate after that.
  const select = (label: string, name: string, choices: { value: string; label: string }[], required = false) => <label className="grid gap-1">{label}<Combobox name={name} required={required} aria-label={label} placeholder={required ? 'Select' : 'None'} emptyLabel={required ? undefined : 'None'} options={choices} onChange={() => requestAnimationFrame(recalculate)} /></label>
  const choices = (values: string[]) => values.map((value) => ({ value, label: value }))
  const field = (label: string, name: string, required = false, inputMode?: 'decimal') => <label className="grid gap-1">{label}<Input name={name} required={required} inputMode={inputMode} /></label>
  return <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
    <DialogTitle>New transaction</DialogTitle>
    <DialogDescription>Record an exchange.</DialogDescription>
    <QueryState loading={options.isPending} error={options.error} retry={options.refetch}>
      {options.data && <form ref={formRef} className="grid gap-3" onChange={recalculate} onSubmit={(event) => { event.preventDefault(); if (!save.isPending) save.mutate(new FormData(event.currentTarget)) }}>
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
        <label className="grid gap-1">Customer<Combobox aria-label="Customer" options={[{ value: 'existing', label: 'Existing customer' }, { value: 'new', label: 'New customer' }]} value={customerMode} onChange={setCustomerMode} /></label>
        {customerMode === 'existing' ? field('Customer ID', 'customer_id', true) : <div className="grid gap-3 sm:grid-cols-2">
          {field('Name', 'name', true)}{field('Country code', 'country_code')}{field('Phone', 'phone')}
          <label className="grid gap-1">ID type<Combobox aria-label="ID type" options={[{ value: 'passport', label: 'Passport' }, { value: 'nrc', label: 'NRC' }]} value={idType} onChange={setIdType} /></label>
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
    meta: { success: 'Invoice updated' },
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
    meta: { success: kind === 'restore' ? (staff ? 'Staff account restored' : 'Transaction restored') : 'Transaction moved to trash' },
  })
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) close() }}>
    <DialogContent>
      <DialogTitle>{kind === 'receipt' ? 'Transaction receipt' : kind === 'restore' ? (staff ? 'Restore staff account' : 'Restore transaction') : 'Move transaction to trash'}</DialogTitle>
      <DialogDescription>{staff ? 'Staff account' : 'Transaction'} #{id}</DialogDescription>
      {kind === 'receipt' ? <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
        {query.data && <>
          <ReceiptView printable look={query.data.look} transaction={query.data.transaction} localTime={query.data.local_time} />
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


function Profile({ user }: { user: Staff['user'] }) {
  const client = useQueryClient()
  const details = useMutation({
    mutationFn: async (form: FormData) => {
      await prepareImageField(form, 'photo', { maxSide: 512 })
      await refreshCsrf()
      await apiClient.post('profile', form, { timeout: UPLOAD_TIMEOUT })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['staff-session'] }),
    meta: { success: 'Profile updated' },
  })
  const [passwordState, setPasswordState] = useState({ pending: false, error: '' })
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = event.currentTarget
    const form = new FormData(target)
    setPasswordState({ pending: true, error: '' })
    try {
      await refreshCsrf()
      await apiClient.put('profile/password', Object.fromEntries(form))
      target.reset()
      setPasswordState({ pending: false, error: '' })
      toast.success('Password updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password update failed.'
      setPasswordState({ pending: false, error: message })
      toast.error(message)
    }
  }
  return <div className="grid max-w-4xl items-start gap-5 md:grid-cols-2">
    <form className="panel grid content-start gap-3 p-5" key={JSON.stringify([user.name, user.email, user.phone])} onSubmit={(event) => {
      event.preventDefault()
      const target = event.currentTarget
      details.mutate(new FormData(target), { onSuccess: () => target.reset() })
    }}>
      <h3 className="font-semibold">Account details</h3>
      <label className="grid gap-1">Name<Input name="name" defaultValue={user.name} required /></label>
      <label className="grid gap-1">Email<Input name="email" type="email" defaultValue={user.email} required /></label>
      <label className="grid gap-1">Phone<Input name="phone" type="tel" defaultValue={user.phone ?? ''} /></label>
      <label className="grid gap-1">Photo<Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      {details.error && <p role="alert" className="text-destructive">{details.error.message}</p>}
      <Button type="submit" disabled={details.isPending}>{details.isPending ? 'Saving…' : 'Save profile'}</Button>
    </form>
    <form className="panel grid content-start gap-3 p-5" onSubmit={changePassword}>
      <h3 className="font-semibold">Change password</h3>
      <label className="grid gap-1">Current password<Input name="current_password" type="password" autoComplete="current-password" required /></label>
      <label className="grid gap-1">New password<Input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label className="grid gap-1">Confirm password<Input name="password_confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>
      {passwordState.error && <p role="alert" className="text-destructive">{passwordState.error}</p>}
      <Button type="submit" disabled={passwordState.pending}>{passwordState.pending ? 'Updating…' : 'Update password'}</Button>
    </form>
  </div>
}

function InvoiceSelect({ label, name, value, choices, emptyLabel = 'None', labels = {} }: {
  label: string; name: string; value: string; choices: string[]; emptyLabel?: string; labels?: Record<string, string>
}) {
  return <label className="grid gap-1">{label}<Combobox name={name} aria-label={label} defaultValue={value}
    options={[...new Set([...choices, value])].map((option) => ({ value: option, label: option ? labels[option] ?? option : emptyLabel }))} /></label>
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
    meta: { success: entry.deleting ? 'Entry deleted' : entry.id === undefined ? 'Entry added' : 'Entry updated' },
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
        await prepareImageField(form, 'photo', { maxSide: 256, keepAlpha: true })
        await apiClient.post(url, form, { timeout: UPLOAD_TIMEOUT })
      } else {
        const role = form.get('role')
        const password = form.get('password')
        const data = { name: form.get('name'), email: form.get('email'), ...(password && { password }), ...(role && { role_ids: [Number(role)] }) }
        if (creating) await apiClient.post(url, data)
        else await apiClient.patch(url, data)
      }
      await client.invalidateQueries({ queryKey: ['live'] })
      close()
      toast.success(`${isRate ? 'Rate' : 'Staff account'} ${deleting ? 'deleted' : creating ? 'added' : 'updated'}`)
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'The request failed.'
      setError(message)
      toast.error(message)
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
          <label className="grid gap-1">Role<Combobox name="role" aria-label="Role" required={creating} placeholder="Select role" emptyLabel={creating ? undefined : 'Keep current roles'} options={(options.data?.roles ?? []).filter(({ assignable }) => assignable).map((role) => ({ value: String(role.id), label: role.name }))} /></label>
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
    meta: { success: deleting ? 'Customer deleted' : 'Customer updated' },
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