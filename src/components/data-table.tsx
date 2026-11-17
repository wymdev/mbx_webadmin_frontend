import { useRef, useState, useMemo } from 'react'
import {
  flexRender,
  stockFeatures,
  useTable,
  type ColumnDef as TanStackColumnDef,
  type SortingState,
  type ColumnVisibilityState,
  type Row as TanStackRow,
  tableFeatures,
  createFilteredRowModel,
  createSortedRowModel,
  createPaginatedRowModel,
  filterFns,
  sortFns,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import ArrowDownUp from 'lucide-react/icons/arrow-down-up'
import ChevronLeft from 'lucide-react/icons/chevron-left'
import ChevronRight from 'lucide-react/icons/chevron-right'
import ChevronsLeft from 'lucide-react/icons/chevrons-left'
import ChevronsRight from 'lucide-react/icons/chevrons-right'
import Download from 'lucide-react/icons/download'
import ListFilter from 'lucide-react/icons/list-filter'
import Search from 'lucide-react/icons/search'
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal'
import TableProperties from 'lucide-react/icons/table-properties'
import GripVertical from 'lucide-react/icons/grip-vertical'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/stores/preferences'
import type { ReactNode } from 'react'

const features = tableFeatures({
  ...stockFeatures,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
})
export type ColumnDef<T extends object> = TanStackColumnDef<typeof features, T>
type Row<T extends object> = TanStackRow<typeof features, T>

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = 'Search records…',
  filters,
  exportAction,
  virtualAvailable = false,
  hideSearch = false,
  onReorder,
  reorderPending = false,
}: {
  data: T[]
  columns: ColumnDef<T>[]
  searchPlaceholder?: string
  filters?: ReactNode
  exportAction?: (rows: T[]) => void
  virtualAvailable?: boolean
  hideSearch?: boolean
  onReorder?: (activeId: string, targetId: string) => void
  reorderPending?: boolean
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [visibility, setVisibility] = useState<ColumnVisibilityState>({})
  const [selection, setSelection] = useState({})
  const [virtual, setVirtual] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const reorderBlocked = reorderPending || !!sorting.length || !!globalFilter || virtual
  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      onReorder
        ? [
            {
              id: 'order',
              header: '',
              enableSorting: false,
              enableHiding: false,
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-grab active:cursor-grabbing"
                  aria-label={`Reorder ${row.original.id}`}
                  title="Drag to reorder, or focus and press ↑ / ↓"
                  disabled={reorderBlocked}
                  draggable={!reorderBlocked}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', row.original.id)
                    setDraggedId(row.original.id)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                    event.preventDefault()
                    const index = data.findIndex((record) => record.id === row.original.id)
                    const target = data[index + (event.key === 'ArrowUp' ? -1 : 1)]
                    if (target) onReorder(row.original.id, target.id)
                  }}
                >
                  <GripVertical className="size-4" />
                </Button>
              ),
            },
            ...columns,
          ]
        : columns,
    [columns, data, onReorder, reorderBlocked],
  )
  const density = usePreferences((s) => s.density)
  const table = useTable({
    features,
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, columnVisibility: visibility, rowSelection: selection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    autoResetPageIndex: true,
  })
  const allRows = table.getPrePaginatedRowModel().rows
  const pagedRows = table.getRowModel().rows
  return (
    <div className="panel table-panel">
      <div className="table-toolbar">
        {!hideSearch && (
          <div className="search-input">
            <Search size={15} />
            <Input
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          {filters}
          {onReorder && (sorting.length > 0 || globalFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSorting([])
                setGlobalFilter('')
              }}
            >
              Clear view to reorder
            </Button>
          )}
          {virtualAvailable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVirtual((v) => !v)}
              aria-pressed={virtual}
            >
              <TableProperties />
              {virtual ? 'Paginated' : 'Virtual ledger'}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(v)}
                  >
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {exportAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAction(allRows.map((row) => row.original))}
            >
              <Download />
              Export
            </Button>
          )}
        </div>
      </div>
      {virtual ? (
        <VirtualRows rows={allRows} header={renderHeader()} density={density} />
      ) : (
        <div className="table-scroll">
          <table className={cn('data-table', density === 'comfortable' && 'comfortable')}>
            <thead>{renderHeader()}</thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn(
                    draggedId === row.id && 'row-dragging',
                    dragOverId === row.id && draggedId !== row.id && 'row-drop-target',
                  )}
                  onDragOver={(event) => {
                    if (onReorder && !reorderBlocked && draggedId) {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      setDragOverId(row.id)
                    }
                  }}
                  onDrop={(event) => {
                    if (!onReorder || reorderBlocked) return
                    event.preventDefault()
                    const active = event.dataTransfer.getData('text/plain')
                    if (data.some((record) => record.id === active) && active !== row.id)
                      onReorder(active, row.id)
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {!pagedRows.length && (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length}>
                    <EmptyTable />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="table-footer">
        <span>
          {Object.keys(selection).filter((id) => selection[id as keyof typeof selection]).length > 0
            ? `${table.getFilteredSelectedRowModel().rows.length} selected · `
            : ''}
          {allRows.length.toLocaleString()} record{allRows.length === 1 ? '' : 's'}
          {globalFilter && ' matching search'}
        </span>
        {virtual ? (
          <span className="flex items-center gap-2">
            <ListFilter size={14} />
            Virtual scrolling enabled
          </span>
        ) : (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Rows per page</span>
            <Select
              value={String(table.state.pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-17" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              Page {allRows.length ? table.state.pagination.pageIndex + 1 : 0} of{' '}
              {table.getPageCount()}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7 hidden sm:inline-flex"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="First page"
              >
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7 hidden sm:inline-flex"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Last page"
              >
                <ChevronsRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
  function renderHeader() {
    return table.getHeaderGroups().map((group) => (
      <tr key={group.id}>
        {group.headers.map((header) => (
          <th key={header.id}>
            {header.isPlaceholder ? null : header.column.getCanSort() ? (
              <button onClick={header.column.getToggleSortingHandler()} className="table-sort">
                {flexRender(header.column.columnDef.header, header.getContext())}
                <ArrowDownUp
                  size={12}
                  className={header.column.getIsSorted() ? 'text-primary' : 'opacity-35'}
                />
              </button>
            ) : (
              flexRender(header.column.columnDef.header, header.getContext())
            )}
          </th>
        ))}
      </tr>
    ))
  }
}
function VirtualRows<T extends object>({
  rows,
  header,
  density,
}: {
  rows: Row<T>[]
  header: ReactNode
  density: string
}) {
  const parent = useRef<HTMLDivElement>(null)
  // React Compiler is not enabled; this component owns the virtualizer lifecycle.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: () => (density === 'compact' ? 54 : 66),
    overscan: 8,
  })
  const items = virtualizer.getVirtualItems()
  const first = items[0]?.start || 0
  const last = items.at(-1)?.end || 0
  return (
    <div ref={parent} className="table-scroll virtual-scroll">
      <table className={cn('data-table', density === 'comfortable' && 'comfortable')}>
        <thead>{header}</thead>
        <tbody>
          {first > 0 && (
            <tr aria-hidden="true">
              <td colSpan={20} style={{ height: first, padding: 0 }} />
            </tr>
          )}
          {items.map((item) => {
            const row = rows[item.index]
            return (
              <tr key={row.id} data-index={item.index} ref={virtualizer.measureElement}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            )
          })}
          {last < virtualizer.getTotalSize() && (
            <tr aria-hidden="true">
              <td colSpan={20} style={{ height: virtualizer.getTotalSize() - last, padding: 0 }} />
            </tr>
          )}
          {!rows.length && (
            <tr>
              <td colSpan={20}>
                <EmptyTable />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
function EmptyTable() {
  return (
    <div className="py-12 text-center">
      <Search className="mx-auto mb-3 text-muted-foreground" size={24} />
      <p className="font-semibold">No matching records</p>
      <p className="text-xs text-muted-foreground mt-1">
        Try a different search or adjust your filters.
      </p>
    </div>
  )
}
export function selectionColumn<T extends object>(): ColumnDef<T> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows"
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
      />
    ),
  }
}
