import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import Check from 'lucide-react/icons/check'
import ImageIcon from 'lucide-react/icons/image'
import Pencil from 'lucide-react/icons/pencil'
import ReceiptText from 'lucide-react/icons/receipt-text'
import Smartphone from 'lucide-react/icons/smartphone'
import Plus from 'lucide-react/icons/plus'
import Trash2 from 'lucide-react/icons/trash-2'
import Upload from 'lucide-react/icons/upload'
import { apiClient, get, refreshCsrf, UPLOAD_TIMEOUT } from '@/services/api'
import { prepareImageField } from '@/lib/image'
import { cn, formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneChatFrame } from '@/components/phone-frame'
import { ReceiptView, SAMPLE_INVOICES } from './receipt-view'

const settingsSchema = z.object({
  business_name: z.string().nullish(),
  font_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  logo_url: z.string().nullable(),
  // Older API versions keep a single logo and send no history.
  logos: z.array(z.object({ id: z.number(), logo_url: z.string().nullable(), active: z.boolean(), created_at: z.string().nullable() })).default([]),
  slips: z.array(z.object({ id: z.number(), name: z.string(), image_url: z.string().nullish(), active: z.boolean() })),
})
type Settings = z.infer<typeof settingsSchema>

/** One receipt-settings write; `done` is the toast shown when it succeeds. */
type Change = { path: string; method: 'post' | 'put' | 'delete'; data?: object; done: string }
/** Picked in the designer but not applied yet. */
type Draft = { slipId?: number; logoId?: number; color?: string }

const SWATCHES = ['#000000', '#1f2937', '#0b2921', '#176649', '#1e3a8a', '#7c2d12', '#ffffff']
const CHECKERBOARD = 'bg-[conic-gradient(#eef1ef_0_25%,#ffffff_0_50%,#eef1ef_0_75%,#ffffff_0)] bg-[length:14px_14px]'

export function ReceiptDesigner() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['live', 'receipt-settings'],
    queryFn: ({ signal }) => get('receipt-settings', settingsSchema, { signal }),
    retry: false,
  })
  const [draft, setDraft] = useState<Draft>({})
  const [sampleId, setSampleId] = useState(SAMPLE_INVOICES[0].id)
  const [frame, setFrame] = useState<'phone' | 'full'>('phone')
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [removing, setRemoving] = useState<{ kind: 'slip' | 'logo'; id: number } | null>(null)

  const save = useMutation({
    mutationFn: async ({ path, method, data }: Change) => {
      if (data instanceof FormData) {
        await prepareImageField(data, 'image', { maxSide: 1600 })
        await prepareImageField(data, 'logo', { maxSide: 600, keepAlpha: true })
      }
      await refreshCsrf()
      await apiClient.request({ url: `receipt-settings/${path}`, method, data, timeout: data instanceof FormData ? UPLOAD_TIMEOUT : undefined })
    },
    onSuccess: async (_result, change) => {
      setEditing(null)
      setRemoving(null)
      // A new logo becomes the active one, so drop any logo picked for preview.
      if (change.path === 'logo') setDraft((current) => ({ ...current, logoId: undefined }))
      await client.invalidateQueries({ queryKey: ['live'] })
    },
    meta: { success: (change: Change) => change.done },
  })

  const apply = useMutation({
    mutationFn: async ({ settings, look }: { settings: Settings; look: ReturnType<typeof resolve> }) => {
      await refreshCsrf()
      if (look.slip && !look.slip.active) await apiClient.post(`receipt-settings/slips/${look.slip.id}/activate`)
      if (look.logo && !look.logo.active) await apiClient.post(`receipt-settings/logos/${look.logo.id}/activate`)
      if (look.color.toLowerCase() !== settings.font_color.toLowerCase()) await apiClient.put('receipt-settings/font-color', { color: look.color })
    },
    onSuccess: async () => {
      setDraft({})
      await client.invalidateQueries({ queryKey: ['live'] })
    },
    meta: { success: 'Receipt look saved. New receipts use it now.' },
  })

  const settings = query.data
  const sample = SAMPLE_INVOICES.find((invoice) => invoice.id === sampleId) ?? SAMPLE_INVOICES[0]
  const busy = save.isPending || apply.isPending

  return (
    <>
      <PageHeader title="Receipt designer" description="Click a background, logo or colour to preview it on a sample invoice. Receipts only change when you apply." />
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch}>
        {settings && (() => {
          const look = resolve(settings, draft)
          const pending = [
            look.slip && !look.slip.active && `background “${look.slip.name}”`,
            look.logo && !look.logo.active && 'logo',
            look.color.toLowerCase() !== settings.font_color.toLowerCase() && `text colour ${look.color}`,
          ].filter(Boolean)
          return (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              {/* Preview */}
              <section className="panel grid gap-4 p-5 xl:sticky xl:top-24">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold">Live preview</h2>
                  <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Example invoice">
                    {SAMPLE_INVOICES.map((invoice) => (
                      <Button key={invoice.id} size="sm" variant={invoice.id === sampleId ? 'default' : 'outline'} role="radio" aria-checked={invoice.id === sampleId} onClick={() => setSampleId(invoice.id)}>
                        {invoice.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="inline-flex rounded-lg border bg-muted/50 p-0.5" role="radiogroup" aria-label="Preview as">
                    {([['phone', 'On a phone', Smartphone], ['full', 'Full size', ReceiptText]] as const).map(([id, label, Icon]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={frame === id}
                        onClick={() => setFrame(id)}
                        className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-xs"
                      >
                        <Icon className="size-4" aria-hidden="true" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
                {(() => {
                  const receipt = (
                    <ReceiptView
                      look={{ business_name: settings.business_name || 'Mergui Boss', font_color: look.color, logo_url: look.logo?.logo_url ?? settings.logo_url, background_url: look.slip?.image_url ?? null }}
                      transaction={sample.transaction}
                      localTime={sample.time}
                      className={frame === 'phone' ? 'w-[25rem] rounded-none border-0' : undefined}
                    />
                  )
                  return frame === 'phone' ? (
                    <div className="rounded-xl bg-[radial-gradient(ellipse_at_top,var(--card-header),transparent_70%)] py-4">
                      <PhoneChatFrame sender={settings.business_name || 'Mergui Boss'} avatarUrl={look.logo?.logo_url ?? settings.logo_url} caption="Thank you! Here is your receipt.">
                        {receipt}
                      </PhoneChatFrame>
                    </div>
                  ) : (
                    <div className="mx-auto w-full max-w-md">{receipt}</div>
                  )
                })()}
                <p className="text-center text-xs text-muted-foreground">
                  {frame === 'phone' ? 'How the customer sees the receipt in Viber, Line or Messenger. ' : ''}Example invoice for checking the look. It is not saved and never printed.
                </p>
                {pending.length ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--gold)]/60 bg-[var(--gold)]/10 p-3 text-sm" role="status">
                    <span>
                      <strong>Preview only.</strong> Not applied yet: {pending.join(', ')}.
                    </span>
                    <span className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => setDraft({})}>
                        Discard
                      </Button>
                      <Button size="sm" disabled={busy} onClick={() => apply.mutate({ settings, look })}>
                        {apply.isPending ? 'Applying…' : 'Apply to receipts'}
                      </Button>
                    </span>
                  </div>
                ) : (
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary" aria-hidden="true" /> This is how receipts look now.
                  </p>
                )}
              </section>

              <div className="grid gap-6">
                {/* Backgrounds */}
                <Panel
                  title="Background"
                  subtitle="Click one to preview it behind the receipt."
                  action={<Button size="sm" disabled={busy} onClick={() => { save.reset(); setEditing('new'); setRemoving(null) }}><Plus /> Add background</Button>}
                >
                  {!settings.slips.length && <p className="text-sm text-muted-foreground">No backgrounds yet.</p>}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Background">
                    {settings.slips.map((slip) => (
                      <Choice
                        key={slip.id}
                        label={slip.name}
                        selected={look.slip?.id === slip.id}
                        current={slip.active}
                        onSelect={() => setDraft((current) => ({ ...current, slipId: slip.id }))}
                        tools={<>
                          <Button size="icon-sm" variant="secondary" aria-label={`Rename or replace ${slip.name}`} disabled={busy} onClick={() => { save.reset(); setEditing(slip.id); setRemoving(null) }}><Pencil /></Button>
                          {!slip.active && <Button size="icon-sm" variant="secondary" aria-label={`Delete ${slip.name}`} disabled={busy} onClick={() => { save.reset(); setRemoving({ kind: 'slip', id: slip.id }); setEditing(null) }}><Trash2 /></Button>}
                        </>}
                      >
                        {slip.image_url ? <img src={slip.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />}
                      </Choice>
                    ))}
                  </div>
                  {editing !== null && (
                    <form key={editing} className="grid gap-3 border-t pt-4" onSubmit={(event) => {
                      event.preventDefault()
                      save.mutate({ path: editing === 'new' ? 'slips' : `slips/${editing}`, method: 'post', data: new FormData(event.currentTarget), done: editing === 'new' ? 'Background added' : 'Background updated' })
                    }}>
                      <label className="grid gap-1 text-sm">Background name<Input name="name" minLength={2} maxLength={191} defaultValue={settings.slips.find(({ id }) => id === editing)?.name} required /></label>
                      <label className="grid gap-1 text-sm">Image{editing !== 'new' && ' (leave empty to keep the current one)'}<Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={editing === 'new'} /></label>
                      <div className="flex gap-2"><Button disabled={busy}>{save.isPending ? 'Saving…' : 'Save background'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div>
                    </form>
                  )}
                  {removing?.kind === 'slip' && <RemoveForm what="background" busy={busy} cancel={() => setRemoving(null)} submit={(reason) => save.mutate({ path: `slips/${removing.id}`, method: 'delete', data: { reason }, done: 'Background deleted' })} />}
                </Panel>

                {/* Logos */}
                <Panel
                  title="Logo"
                  subtitle="Every logo you upload is kept here, so you can switch back at any time."
                  action={
                    <form className="flex items-center gap-2" onSubmit={(event) => {
                      event.preventDefault()
                      save.mutate({ path: 'logo', method: 'post', data: new FormData(event.currentTarget), done: 'Logo uploaded and now on receipts' })
                    }}>
                      <Input name="logo" type="file" accept="image/jpeg,image/png,image/webp" required className="h-9 max-w-52 text-xs" aria-label="New logo file" />
                      <Button size="sm" disabled={busy}><Upload /> Upload</Button>
                    </form>
                  }
                >
                  {!settings.logos.length && (settings.logo_url ? (
                    <div className={cn('grid h-24 w-40 place-items-center rounded-lg border p-3', CHECKERBOARD)}><img src={settings.logo_url} alt="Current logo" className="max-h-full max-w-full object-contain" /></div>
                  ) : <p className="text-sm text-muted-foreground">No logo yet.</p>)}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Logo">
                    {settings.logos.map((logo) => (
                      <Choice
                        key={logo.id}
                        label={logo.created_at ? `Added ${formatDate(logo.created_at)}` : 'Logo'}
                        selected={look.logo?.id === logo.id}
                        current={logo.active}
                        onSelect={() => setDraft((current) => ({ ...current, logoId: logo.id }))}
                        tools={!logo.active && <Button size="icon-sm" variant="secondary" aria-label="Delete this logo" disabled={busy} onClick={() => { save.reset(); setRemoving({ kind: 'logo', id: logo.id }); setEditing(null) }}><Trash2 /></Button>}
                        mediaClassName={cn('p-3', CHECKERBOARD)}
                      >
                        {logo.logo_url ? <img src={logo.logo_url} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />}
                      </Choice>
                    ))}
                  </div>
                  {removing?.kind === 'logo' && <RemoveForm what="logo" busy={busy} cancel={() => setRemoving(null)} submit={(reason) => save.mutate({ path: `logos/${removing.id}`, method: 'delete', data: { reason }, done: 'Logo deleted' })} />}
                </Panel>

                {/* Text colour */}
                <Panel title="Text colour" subtitle="Pick a colour that stays readable on the background.">
                  <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Text colour">
                    {SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        role="radio"
                        aria-checked={look.color.toLowerCase() === swatch}
                        aria-label={swatch}
                        title={swatch}
                        onClick={() => setDraft((current) => ({ ...current, color: swatch }))}
                        className={cn('grid size-9 place-items-center rounded-full border-2 shadow-xs transition', look.color.toLowerCase() === swatch ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:scale-105')}
                        style={{ background: swatch }}
                      >
                        {look.color.toLowerCase() === swatch && <Check className={cn('size-4', swatch === '#ffffff' ? 'text-black' : 'text-white')} aria-hidden="true" />}
                      </button>
                    ))}
                    <label className="ml-2 flex items-center gap-2 text-sm">
                      Custom
                      <Input type="color" className="h-9 w-14 cursor-pointer p-1" value={look.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} />
                      <code className="text-xs text-muted-foreground">{look.color}</code>
                    </label>
                  </div>
                </Panel>
                {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
              </div>
            </div>
          )
        })()}
      </QueryState>
    </>
  )
}

/** What the preview shows: the draft pick, or what receipts use now. */
function resolve(settings: Settings, draft: Draft) {
  const activeSlip = settings.slips.find((slip) => slip.active)
  const activeLogo = settings.logos.find((logo) => logo.active)
  return {
    slip: settings.slips.find((slip) => slip.id === (draft.slipId ?? activeSlip?.id)),
    logo: settings.logos.find((logo) => logo.id === (draft.logoId ?? activeLogo?.id)),
    color: draft.color ?? settings.font_color,
  }
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="panel-subtitle">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A clickable thumbnail: ticked when previewed, labelled when it is on receipts now. */
function Choice({ label, selected, current, onSelect, tools, mediaClassName, children }: {
  label: string
  selected: boolean
  current: boolean
  onSelect: () => void
  tools?: ReactNode
  mediaClassName?: string
  children: ReactNode
}) {
  return (
    <div className={cn('group relative overflow-hidden rounded-lg border-2 bg-card transition', selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40')}>
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="block w-full text-left">
        <span className={cn('grid aspect-[4/3] place-items-center overflow-hidden bg-muted', mediaClassName)}>{children}</span>
        <span className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
          <span className="truncate font-medium">{label}</span>
          {current && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">On receipts</span>}
        </span>
      </button>
      {selected && (
        <span className="pointer-events-none absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow" aria-hidden="true">
          <Check className="size-4" />
        </span>
      )}
      {tools && <span className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">{tools}</span>}
    </div>
  )
}

function RemoveForm({ what, busy, cancel, submit }: { what: string; busy: boolean; cancel: () => void; submit: (reason: string) => void }) {
  return (
    <form className="grid gap-3 border-t pt-4" onSubmit={(event) => {
      event.preventDefault()
      const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
      if (reason.length >= 3) submit(reason)
    }}>
      <label className="grid gap-1 text-sm">Reason for deleting this {what}<Input name="reason" required minLength={3} maxLength={500} autoFocus /></label>
      <div className="flex gap-2"><Button variant="destructive" disabled={busy}>Delete {what}</Button><Button type="button" variant="outline" disabled={busy} onClick={cancel}>Cancel</Button></div>
    </form>
  )
}
