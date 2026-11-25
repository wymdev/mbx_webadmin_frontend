import { useRef, useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import ArrowDown from 'lucide-react/icons/arrow-down'
import ArrowUp from 'lucide-react/icons/arrow-up'
import ChevronLeft from 'lucide-react/icons/chevron-left'
import ChevronRight from 'lucide-react/icons/chevron-right'
import ChevronsUpDown from 'lucide-react/icons/chevrons-up-down'
import Columns3 from 'lucide-react/icons/columns-3'
import FilterX from 'lucide-react/icons/filter-x'
import Search from 'lucide-react/icons/search'
import GripVertical from 'lucide-react/icons/grip-vertical'
import { apiClient } from '@/services/api'
import { ExcelMenu } from '@/components/excel-menu'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePreferences } from '@/stores/preferences'
import { cn } from '@/lib/utils'

export type Row = Record<string, unknown>

export type ServerColumn = {
  id: string
  label: string
  cell: (row: Row) => ReactNode
  align?: 'right'
  /** API sort name; makes the header clickable. */
  sort?: string
  /** Not shown until the user turns it on. */
  hidden?: boolean
  /** Always shown; not listed in the Columns menu. */
  required?: boolean
}

export type ServerFilter =
  | { type: 'search'; name: string; label: string; placeholder?: string }
  | { type: 'select'; name: string; label: string; options: { value: string; label: string }[] }
  | { type: 'date'; name: string; label: string }

const list = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z
    .object({
      pagination: z
        .object({
          current_page: z.number().optional(),
          last_page: z.number().optional(),
          total: z.number().optional(),
          from: z.number().nullish(),
          to: z.number().nullish(),
        })
        .optional(),
    })
    .optional(),
})

const PAGE_SIZES = [10, 25, 50, 100]
/** The API's prefix searches need at least two characters. */
const SEARCH_MIN = 2

/**
 * A list backed by an API endpoint: server-side filters, sorting and page numbers. Filters, page and
 * sort live in the URL (so refresh and Back keep them); visible columns and page size are remembered.
 */
export function ServerTable({
  id,
  title,
  endpoint,
  columns,
  filters = [],
  params = {},
  paginated = true,
  toolbar,
  rowActions,
  rowKey,
  excel,
  onReorder,
  reorderPending = false,
}: {
  /** Key for the remembered column choice. */
  id: string
  title: string
  endpoint: string
  columns: ServerColumn[]
  filters?: ServerFilter[]
  /** Fixed query parameters, e.g. `include`. */
  params?: Record<string, string>
  paginated?: boolean
  toolbar?: ReactNode
  rowActions?: (row: Row, index: number, rows: Row[]) => ReactNode
  rowKey: (row: Row, index: number) => string
  /** Excel export list and / or import type for this table. */
  excel?: { exportList?: string; importType?: string }
  /** Drag rows to change their order; receives every row id in the new order. */
  onReorder?: (ids: number[]) => void
  reorderPending?: boolean
}) {
  const [dragged, setDragged] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [search, setSearch] = useSearchParams()
  const pageSize = usePreferences((state) => state.pageSize)
  const setPageSize = usePreferences((state) => state.setPageSize)
  const chosen = usePreferences((state) => state.tableColumns[id])
  const setTableColumns = usePreferences((state) => state.setTableColumns)

  const page = Math.max(1, Number(search.get('page')) || 1)
  const sort = search.get('sort') ?? ''
  const active = Object.fromEntries(filters.map((filter) => [filter.name, search.get(filter.name) ?? '']).filter(([, value]) => value))

  const update = (changes: Record<string, string | null>, keepPage = false) =>
    setSearch(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if (!keepPage) next.delete('page')
        return next
      },
      { replace: true },
    )

  const query = {
    ...params,
    ...(paginated ? { page: String(page), per_page: String(pageSize) } : {}),
    ...(sort ? { sort } : {}),
    ...Object.fromEntries(Object.entries(active).map(([name, value]) => [`filter[${name}]`, value])),
  }
  const result = useQuery({
    queryKey: ['live', endpoint, query],
    queryFn: async ({ signal }) => list.parse((await apiClient.get(endpoint, { signal, params: query })).data),
    placeholderData: keepPreviousData,
    retry: false,
  })

  const defaults = columns.filter((column) => !column.hidden).map((column) => column.id)
  const shown = new Set(chosen ?? defaults)
  const visible = columns.filter((column) => column.required || shown.has(column.id))
  const toggleColumn = (columnId: string, on: boolean) => {
    const next = columns.filter((column) => (column.id === columnId ? on : shown.has(column.id))).map((column) => column.id)
    setTableColumns(id, next)
  }

  const rows = result.data?.data ?? []
  const pagination = result.data?.meta?.pagination
  const lastPage = pagination?.last_page ?? 1
  const total = pagination?.total ?? rows.length
  const filtering = Object.keys(active).length > 0
  const exportParams = Object.fromEntries(Object.entries(query).filter(([key]) => key.startsWith('filter[') || key === 'sort'))

  // Ordering only makes sense on the full, unsorted, unfiltered list.
  const ids = rows.map((row) => row.id).filter((value): value is number => typeof value === 'number')
  const canReorder = !!onReorder && !reorderPending && !sort && !filtering && ids.length === rows.length
  const move = (from: number, to: number) => {
    if (!onReorder || from === to || to < 0 || to >= ids.length) return
    const next = [...ids]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onReorder(next)
  }

  return (
    <QueryState loading={result.isPending} error={result.data ? null : result.error} retry={result.refetch}>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="panel-subtitle">
              {total.toLocaleString()} {total === 1 ? 'record' : 'records'}
              {filtering && ' match the filters'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ColumnsMenu columns={columns} shown={shown} toggle={toggleColumn} reset={() => setTableColumns(id, null)} />
            {excel && <ExcelMenu title={title} exportList={excel.exportList} importType={excel.importType} params={exportParams} />}
            {toolbar}
          </div>
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap items-end gap-3 border-b bg-[var(--card-header)] px-5 py-3">
            {filters.map((filter) => (
              <FilterControl key={filter.name} filter={filter} value={active[filter.name] ?? ''} apply={(value) => update({ [filter.name]: value || null })} />
            ))}
            {filtering && (
              <Button variant="ghost" size="sm" onClick={() => update(Object.fromEntries(filters.map((filter) => [filter.name, null])))}>
                <FilterX /> Clear filters
              </Button>
            )}
          </div>
        )}

        {result.error && (
          <p role="alert" className="border-b px-5 py-3 text-sm text-destructive">
            {result.error.message}{' '}
            <button type="button" className="underline" onClick={() => void result.refetch()}>
              Try again
            </button>
          </p>
        )}

        {rows.length === 0 ? (
          <div className="empty-state text-sm text-muted-foreground">
            <p>{filtering ? 'No records match these filters.' : 'No records yet.'}</p>
          </div>
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', result.isPlaceholderData && 'opacity-60')} aria-busy={result.isFetching}>
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--card-header)] text-xs text-muted-foreground">
                <tr>
                  {onReorder && (
                    <th scope="col" className="w-10 border-b py-3 pl-3">
                      <span className="sr-only">Order</span>
                    </th>
                  )}
                  {visible.map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className={cn('whitespace-nowrap border-b px-5 py-3 font-semibold', column.align === 'right' && 'text-right')}
                      aria-sort={sortState(sort, column.sort)}
                    >
                      {column.sort ? (
                        <button
                          type="button"
                          className={cn('inline-flex items-center gap-1 hover:text-foreground', column.align === 'right' && 'flex-row-reverse')}
                          onClick={() => update({ sort: nextSort(sort, column.sort!) }, true)}
                        >
                          {column.label}
                          <SortIcon state={sortState(sort, column.sort)} />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  {rowActions && (
                    <th scope="col" className="border-b px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={rowKey(row, index)}
                    className={cn(
                      'transition-colors hover:bg-muted/60',
                      dragged === index && 'opacity-40',
                      over === index && dragged !== null && dragged !== index && (dragged < index ? 'shadow-[inset_0_-2px_0_var(--primary)]' : 'shadow-[inset_0_2px_0_var(--primary)]'),
                    )}
                    onDragOver={(event) => {
                      if (dragged === null) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      setOver(index)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (dragged !== null) move(dragged, index)
                      setDragged(null)
                      setOver(null)
                    }}
                  >
                    {onReorder && (
                      <td className="w-10 border-b py-2 pl-3">
                        <button
                          type="button"
                          className="grid size-7 cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
                          draggable={canReorder}
                          disabled={!canReorder}
                          aria-label={`Move row ${index + 1}. Drag, or press up / down arrow.`}
                          title={canReorder ? 'Drag to reorder (or focus and press ↑ / ↓)' : 'Clear sorting and filters to reorder'}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData('text/plain', String(index))
                            setDragged(index)
                          }}
                          onDragEnd={() => {
                            setDragged(null)
                            setOver(null)
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                            event.preventDefault()
                            move(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                          }}
                        >
                          <GripVertical className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                    {visible.map((column) => (
                      <td key={column.id} className={cn('whitespace-nowrap border-b px-5 py-3', column.align === 'right' && 'text-right tabular-nums')}>
                        {column.cell(row)}
                      </td>
                    ))}
                    {rowActions && <td className="whitespace-nowrap border-b px-3 py-2 text-right">{rowActions(row, index, rows)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {paginated && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <span className="text-muted-foreground">
              {pagination?.from ? `Showing ${pagination.from.toLocaleString()}–${(pagination.to ?? pagination.from).toLocaleString()} of ${total.toLocaleString()}` : 'No rows'}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                Rows
                <Combobox
                  size="sm"
                  aria-label="Rows per page"
                  className="w-20"
                  searchable={false}
                  options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
                  value={String(pageSize)}
                  onChange={(next) => {
                    setPageSize(Number(next))
                    update({})
                  }}
                />
              </div>
              <nav className="flex items-center gap-1" aria-label="Pages">
                <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, true)} aria-label="Previous page">
                  <ChevronLeft />
                </Button>
                {pageNumbers(page, lastPage).map((number, index) =>
                  number === null ? (
                    <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <Button
                      key={number}
                      variant={number === page ? 'default' : 'ghost'}
                      size="sm"
                      className="min-w-8 px-2 tabular-nums"
                      aria-current={number === page ? 'page' : undefined}
                      onClick={() => update({ page: number === 1 ? null : String(number) }, true)}
                    >
                      {number}
                    </Button>
                  ),
                )}
                <Button variant="outline" size="icon-sm" disabled={page >= lastPage} onClick={() => update({ page: String(page + 1) }, true)} aria-label="Next page">
                  <ChevronRight />
                </Button>
              </nav>
            </div>
          </div>
        )}
      </section>
    </QueryState>
  )
}

/** 1 … 4 5 [6] 7 8 … 40 */
export function pageNumbers(current: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)
  const start = Math.max(2, Math.min(current - 1, last - 4))
  const end = Math.min(last - 1, Math.max(current + 1, 5))
  const middle = Array.from({ length: end - start + 1 }, (_, index) => start + index)
  return [1, ...(start > 2 ? [null] : []), ...middle, ...(end < last - 1 ? [null] : []), last]
}

type SortState = 'ascending' | 'descending' | 'none'
function sortState(sort: string, name?: string): SortState | undefined {
  if (!name) return undefined
  return sort === name ? 'ascending' : sort === `-${name}` ? 'descending' : 'none'
}
/** Newest / largest first, then oldest / smallest first, then back to the default order. */
function nextSort(sort: string, name: string) {
  return sort === `-${name}` ? name : sort === name ? null : `-${name}`
}
function SortIcon({ state }: { state?: SortState }) {
  if (state === 'ascending') return <ArrowUp className="size-3 text-primary" aria-hidden="true" />
  if (state === 'descending') return <ArrowDown className="size-3 text-primary" aria-hidden="true" />
  return <ChevronsUpDown className="size-3 opacity-40" aria-hidden="true" />
}

function ColumnsMenu({ columns, shown, toggle, reset }: { columns: ServerColumn[]; shown: Set<string>; toggle: (id: string, on: boolean) => void; reset: () => void }) {
  const optional = columns.filter((column) => !column.required)
  if (!optional.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Columns3 /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {optional.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={shown.has(column.id)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(on) => toggle(column.id, on === true)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={reset}>Reset to default</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterControl({ filter, value, apply }: { filter: ServerFilter; value: string; apply: (value: string) => void }) {
  if (filter.type === 'select')
    return (
      <div className="grid gap-1 text-xs font-medium text-muted-foreground">
        <span>{filter.label}</span>
        <Combobox
          className="min-w-36"
          aria-label={filter.label}
          emptyLabel="All"
          searchPlaceholder={`Search ${filter.label.toLowerCase()}`}
          options={filter.options}
          value={value}
          onChange={apply}
        />
      </div>
    )
  if (filter.type === 'date')
    return (
      <div className="grid gap-1 text-xs font-medium text-muted-foreground">
        <span>{filter.label}</span>
        <DatePicker className="w-48" aria-label={filter.label} placeholder="Any day" value={value} onChange={apply} />
      </div>
    )
  return <SearchFilter filter={filter} value={value} apply={apply} />
}

/** Applies after a short pause in typing, and only from two characters (or when cleared). */
function SearchFilter({ filter, value, apply }: { filter: Extract<ServerFilter, { type: 'search' }>; value: string; apply: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  const timer = useRef<number | undefined>(undefined)
  // Cleared from outside (Clear filters, Back): follow the URL.
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== draft.trim()) setDraft(value)
  }
  return (
    <label className="grid min-w-56 flex-1 gap-1 text-xs font-medium text-muted-foreground sm:max-w-80">
      {filter.label}
      <span className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          className="h-9 pl-8 text-sm text-foreground"
          placeholder={filter.placeholder}
          value={draft}
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            window.clearTimeout(timer.current)
            const trimmed = next.trim()
            if (trimmed.length === 0 || trimmed.length >= SEARCH_MIN) timer.current = window.setTimeout(() => apply(trimmed), 350)
          }}
        />
      </span>
    </label>
  )
}
