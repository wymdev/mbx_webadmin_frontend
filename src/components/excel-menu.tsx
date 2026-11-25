import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import Download from 'lucide-react/icons/download'
import FileDown from 'lucide-react/icons/file-down'
import FileSpreadsheet from 'lucide-react/icons/file-spreadsheet'
import FileUp from 'lucide-react/icons/file-up'
import { download, send, UPLOAD_TIMEOUT } from '@/services/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Excel actions for a list: export what the filters show (every page), download the import
 * template, and import a filled template with a checked preview.
 */
export function ExcelMenu({
  title,
  exportList,
  importType,
  params,
}: {
  title: string
  /** /exports/{list}; omitted = no export. */
  exportList?: string
  /** /imports/{type}; omitted = no import. */
  importType?: string
  /** The list's current filter and sort parameters. */
  params: Record<string, string>
}) {
  const [importing, setImporting] = useState(false)
  const exporter = useMutation({
    mutationFn: () => download(`exports/${exportList}`, `mbx-${exportList}.xlsx`, params),
    meta: { success: 'Excel file downloaded' },
  })
  const template = useMutation({
    mutationFn: () => download(`imports/${importType}/template`, `mbx-${importType}-import-template.xlsx`),
    meta: { success: 'Template downloaded. Fill in the Data sheet, then import it.' },
  })
  if (!exportList && !importType) return null
  const filtered = Object.keys(params).some((key) => key.startsWith('filter['))

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={exporter.isPending || template.isPending}>
            <FileSpreadsheet /> {exporter.isPending ? 'Exporting…' : 'Excel'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{title} in Excel</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {exportList && (
            <DropdownMenuItem onSelect={() => exporter.mutate()}>
              <Download />
              <span className="grid">
                Export to Excel
                <small className="text-xs text-muted-foreground">{filtered ? 'Rows matching the filters, all pages' : 'Every row, all pages'}</small>
              </span>
            </DropdownMenuItem>
          )}
          {importType && (
            <>
              <DropdownMenuItem onSelect={() => template.mutate()}>
                <FileDown />
                <span className="grid">
                  Download import template
                  <small className="text-xs text-muted-foreground">Our format, with a How to fill sheet</small>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setImporting(true)}>
                <FileUp />
                <span className="grid">
                  Import from Excel…
                  <small className="text-xs text-muted-foreground">Checked first, saved only when you confirm</small>
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {importing && importType && <ImportDialog type={importType} title={title} close={() => setImporting(false)} downloadTemplate={() => template.mutate()} />}
    </>
  )
}

/* ---------- import ---------- */

const previewSchema = z.object({
  token: z.string(),
  title: z.string(),
  file: z.string(),
  summary: z.object({ rows: z.number(), create: z.number(), update: z.number(), skip: z.number(), error: z.number() }),
  ignored_columns: z.array(z.string()),
  rows: z.array(z.object({ row: z.number(), action: z.enum(['create', 'update', 'skip', 'error']), summary: z.string(), errors: z.array(z.string()), note: z.string().nullable() })),
  expires_in_minutes: z.number(),
})
type Preview = z.infer<typeof previewSchema>

const ACTIONS: Record<Preview['rows'][number]['action'], { label: string; className: string }> = {
  create: { label: 'Add', className: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400' },
  update: { label: 'Update', className: 'bg-sky-600/10 text-sky-700 dark:text-sky-400' },
  skip: { label: 'Skip', className: 'bg-muted text-muted-foreground' },
  error: { label: 'Problem', className: 'bg-destructive/10 text-destructive' },
}

function ImportDialog({ type, title, close, downloadTemplate }: { type: string; title: string; close: () => void; downloadTemplate: () => void }) {
  const client = useQueryClient()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [onlyProblems, setOnlyProblems] = useState(false)

  const check = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const result = await send<unknown>('post', `imports/${type}/preview`, form, { timeout: UPLOAD_TIMEOUT })
      return previewSchema.parse(result.data)
    },
    onSuccess: (result) => {
      setPreview(result)
      setOnlyProblems(result.summary.error > 0)
    },
  })
  const confirm = useMutation({
    mutationFn: (token: string) => send('post', `imports/${token}/commit`),
    onSuccess: async (result) => {
      toast.success(result.message ?? 'Import saved')
      await client.invalidateQueries({ queryKey: ['live'] })
      close()
    },
    onError: (error) => toast.error(error.message),
  })
  const busy = check.isPending || confirm.isPending

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) close() }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogTitle>Import {title.toLowerCase()} from Excel</DialogTitle>
        <DialogDescription>Upload a filled template. MBX checks every row and shows what will happen. Nothing is saved until you confirm.</DialogDescription>

        {!preview ? (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const file = new FormData(event.currentTarget).get('file')
              if (file instanceof File && file.size) check.mutate(file)
            }}
          >
            <ol className="grid gap-2 rounded-lg border bg-[var(--card-header)] p-4 text-sm">
              <li>
                1. <button type="button" className="font-medium text-primary underline" onClick={downloadTemplate}>Download the template</button> (or export this list and edit it).
              </li>
              <li>2. Fill in the Data sheet from row 2. The How to fill sheet explains every column.</li>
              <li>3. Upload it here and check the preview.</li>
            </ol>
            <label className="grid gap-1 text-sm font-medium">
              Excel file (.xlsx or .csv, up to 2,000 rows)
              <Input name="file" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" required />
            </label>
            {check.error && <p role="alert" className="text-sm text-destructive">{check.error.message}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button>
              <Button disabled={busy}>{check.isPending ? 'Checking…' : 'Upload and check'}</Button>
            </div>
          </form>
        ) : (
          <ImportPreview
            preview={preview}
            onlyProblems={onlyProblems}
            setOnlyProblems={setOnlyProblems}
            busy={busy}
            error={confirm.error?.message}
            restart={() => { setPreview(null); confirm.reset(); check.reset() }}
            confirm={() => confirm.mutate(preview.token)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ImportPreview({ preview, onlyProblems, setOnlyProblems, busy, error, restart, confirm }: {
  preview: Preview
  onlyProblems: boolean
  setOnlyProblems: (value: boolean) => void
  busy: boolean
  error?: string
  restart: () => void
  confirm: () => void
}) {
  const { summary } = preview
  const changes = summary.create + summary.update
  const rows = onlyProblems ? preview.rows.filter((row) => row.action === 'error') : preview.rows
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{preview.file}</span>
        <span className="text-muted-foreground">· {summary.rows.toLocaleString()} rows</span>
        <Count value={summary.create} label="to add" action="create" />
        <Count value={summary.update} label="to update" action="update" />
        <Count value={summary.skip} label="skipped" action="skip" />
        <Count value={summary.error} label="with problems" action="error" />
      </div>
      {preview.ignored_columns.length > 0 && (
        <p className="text-xs text-muted-foreground">Ignored columns (not part of this import): {preview.ignored_columns.join(', ')}</p>
      )}
      {summary.error > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyProblems} onChange={(event) => setOnlyProblems(event.target.checked)} /> Show only rows with problems
        </label>
      )}

      <div className="max-h-[45dvh] overflow-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--card-header)] text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Row</th>
              <th scope="col" className="px-3 py-2 font-semibold">What happens</th>
              <th scope="col" className="px-3 py-2 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.row} className={cn(row.action === 'error' && 'bg-destructive/5')}>
                <td className="px-3 py-2 align-top tabular-nums text-muted-foreground">{row.row}</td>
                <td className="px-3 py-2 align-top">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', ACTIONS[row.action].className)}>{ACTIONS[row.action].label}</span>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="wrap-anywhere">{row.summary}</div>
                  {row.note && <div className="text-xs text-muted-foreground">{row.note}</div>}
                  {row.errors.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-xs text-destructive">
                      {row.errors.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.rows.length < summary.rows && <p className="text-xs text-muted-foreground">Showing the first {preview.rows.length} rows; all {summary.rows} are checked and imported.</p>}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="max-w-lg text-sm text-muted-foreground">
          {summary.error > 0
            ? 'Fix the rows marked Problem in your file, then upload it again. Nothing has been saved.'
            : changes === 0
              ? 'Every row is already up to date. There is nothing to import.'
              : `Nothing is saved yet. Confirming saves all ${changes} rows together. If any fails, none are saved. This preview stays ready for ${preview.expires_in_minutes} minutes.`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={restart}>Choose another file</Button>
          <Button disabled={busy || summary.error > 0 || changes === 0} onClick={confirm}>
            {busy ? 'Importing…' : `Import ${changes.toLocaleString()} ${changes === 1 ? 'row' : 'rows'}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Count({ value, label, action }: { value: number; label: string; action: keyof typeof ACTIONS }) {
  if (!value) return null
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ACTIONS[action].className)}>{value.toLocaleString()} {label}</span>
}
