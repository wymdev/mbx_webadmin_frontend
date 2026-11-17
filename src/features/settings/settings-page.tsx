import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import MoreHorizontal from 'lucide-react/icons/ellipsis'
import Pencil from 'lucide-react/icons/pencil'
import Plus from 'lucide-react/icons/plus'
import Trash2 from 'lucide-react/icons/trash'
import UsersRound from 'lucide-react/icons/users-round'
import Landmark from 'lucide-react/icons/landmark'
import SlidersHorizontal from 'lucide-react/icons/sliders-horizontal'
import Image from 'lucide-react/icons/image'
import Settings2 from 'lucide-react/icons/settings-2'
import Moon from 'lucide-react/icons/moon'
import Sun from 'lucide-react/icons/sun'
import PanelLeft from 'lucide-react/icons/panel-left'
import Rows3 from 'lucide-react/icons/rows-3'
import { PageHeader } from '@/components/page-header'
import { DataTable, type ColumnDef } from '@/components/data-table'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field, SelectField } from '@/components/form-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { repository } from '@/services/demo'
import { useDemoMutation } from '@/services/queries'
import type { SettingRecord, SettingsKind } from '@/domain/models'
import { usePreferences } from '@/stores/preferences'
import { toast } from 'sonner'
import { initials } from '@/lib/utils'

const config = {
  users: {
    title: 'Team members',
    description: 'Manage the people who help run your exchange operations.',
    singular: 'team member',
    icon: UsersRound,
  },
  methods: {
    title: 'Transfer methods',
    description: 'Keep your payment and transfer options organized.',
    singular: 'transfer method',
    icon: Landmark,
  },
  sources: {
    title: 'Customer sources',
    description: 'Understand where your customers discover Mergui Boss.',
    singular: 'customer source',
    icon: SlidersHorizontal,
  },
  slips: {
    title: 'Receipt settings',
    description: 'Make every receipt unmistakably Mergui Boss.',
    singular: 'receipt template',
    icon: Image,
  },
}
const schema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(80),
  detail: z.string().max(120),
  role: z.string(),
  active: z.boolean(),
})
type Values = z.infer<typeof schema>
export default function SettingsPage() {
  const location = useLocation()
  const part = location.pathname.split('/').at(-1) || 'users'
  if (part === 'preferences') return <Preferences />
  return <Records key={part} kind={(part in config ? part : 'users') as SettingsKind} />
}
function Records({ kind }: { kind: SettingsKind }) {
  const meta = config[kind]
  const query = useQuery({ queryKey: ['settings', kind], queryFn: () => repository.settings(kind) })
  const [editing, setEditing] = useState<SettingRecord | null>(null)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<SettingRecord | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', detail: '', role: 'Staff', active: true },
  })
  const save = useDemoMutation((values: Values) =>
    repository.saveSetting(kind, values, editing?.id),
  )
  const remove = useDemoMutation((id: string) => repository.trashSetting(kind, id))
  const columns: ColumnDef<SettingRecord>[] = [
    {
      accessorKey: 'name',
      header: kind === 'users' ? 'Name' : meta.title,
      cell: ({ row }) => (
        <div className="person-cell">
          <span className="person-avatar">
            {kind === 'users' ? initials(row.original.name) : <meta.icon size={13} />}
          </span>
          <div>
            <strong>{row.original.name}</strong>
            <small>{row.original.detail}</small>
          </div>
        </div>
      ),
    },
    { accessorKey: 'role', header: kind === 'users' ? 'Role' : 'Category' },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`type-badge ${row.original.active ? '' : 'sell'}`}>
          {row.original.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Actions for ${row.original.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setEditing(row.original)
                form.reset(row.original)
              }}
            >
              <Pencil />
              Edit {meta.singular}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(row.original)}>
              <Trash2 />
              {kind === 'users' ? 'Move to trash' : 'Remove from demo'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="MANAGEMENT / WORKSPACE"
        title={meta.title}
        description={meta.description}
        count={query.data?.length}
      >
        <Button
          onClick={() => {
            form.reset({
              name: '',
              detail: '',
              role: kind === 'users' ? 'Staff' : kind === 'slips' ? 'Receipt' : 'Standard',
              active: true,
            })
            setAdding(true)
          }}
        >
          <Plus />
          Add {meta.singular}
        </Button>
      </PageHeader>
      {kind === 'slips' && (
        <div className="panel p-5 mb-5 flex gap-4 items-center">
          <span className="brand-symbol">
            m<span>↗</span>
          </span>
          <div>
            <h2>Your receipt identity</h2>
            <p className="panel-subtitle">
              Templates store demo display metadata. The transaction receipt uses the MBX brand and
              includes exchange details.
            </p>
          </div>
        </div>
      )}
      <QueryState loading={query.isPending} error={query.error}>
        <DataTable
          data={query.data || []}
          columns={columns}
          searchPlaceholder={`Search ${meta.title.toLowerCase()}…`}
        />
      </QueryState>
      <p className="text-[10px] text-muted-foreground mt-3">
        Demo administration only.{' '}
        {kind === 'users'
          ? 'Roles are sample metadata; real account provisioning and permission enforcement require backend integration.'
          : 'Changes stay in this session.'}
      </p>
      <Dialog
        open={adding || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false)
            setEditing(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit' : 'Add'} {meta.singular}
            </DialogTitle>
            <DialogDescription>
              Update this fictional workspace record. Changes reset on refresh.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              save.mutate(values, {
                onSuccess: () => {
                  setAdding(false)
                  setEditing(null)
                  toast.success(`Demo ${meta.singular} saved`)
                },
                onError: (e) => toast.error(e.message),
              }),
            )}
          >
            <Field id="setting-name" label="Name" error={form.formState.errors.name?.message}>
              <Input id="setting-name" {...form.register('name')} />
            </Field>
            <Field
              id="setting-detail"
              label={kind === 'users' ? 'Email / description' : 'Description'}
              error={form.formState.errors.detail?.message}
            >
              <Input id="setting-detail" {...form.register('detail')} />
            </Field>
            <Field id="setting-role" label={kind === 'users' ? 'Role' : 'Category'}>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <SelectField
                    id="setting-role"
                    value={field.value}
                    onChange={field.onChange}
                    options={
                      kind === 'users'
                        ? ['Admin', 'Manager', 'Staff']
                        : kind === 'slips'
                          ? ['Receipt', 'Compact']
                          : ['Standard', 'Digital', 'In person']
                    }
                  />
                )}
              />
            </Field>
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <label
                  className="flex items-center justify-between text-xs"
                  htmlFor="setting-active"
                >
                  Active
                  <Switch
                    id="setting-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </label>
              )}
            />
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdding(false)
                  setEditing(null)
                }}
              >
                Cancel
              </Button>
              <Button disabled={save.isPending}>Save changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(v) => {
          if (!v) setRemoving(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kind === 'users' ? 'Move to trash?' : 'Remove demo record?'}</DialogTitle>
            <DialogDescription>
              {removing?.name}{' '}
              {kind === 'users'
                ? 'can be restored from the Users tab in Trash.'
                : 'will be removed for this demo session. Refreshing resets sample records.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.id, {
                  onSuccess: () => {
                    setRemoving(null)
                    toast.success('Demo record removed')
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              {kind === 'users' ? 'Move to trash' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
function Preferences() {
  const { theme, toggleTheme, collapsed, toggleSidebar, density, setDensity } = usePreferences()
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="PERSONAL / SETTINGS"
        title="Workspace preferences"
        description="Make the workspace feel like yours. Preferences are saved on this browser."
      />
      <section className="panel max-w-3xl">
        <div className="panel-heading border-b">
          <h2 className="flex gap-2 items-center">
            <Settings2 size={17} />
            Appearance & layout
          </h2>
        </div>
        <div className="p-6 space-y-7">
          <div className="flex justify-between gap-5">
            <div>
              <h2 className="flex gap-2 items-center">
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}Dark mode
              </h2>
              <p className="panel-subtitle">A softer workspace for late-hour operations.</p>
            </div>
            <Switch
              aria-label="Dark mode"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
          <div className="flex justify-between gap-5">
            <div>
              <h2 className="flex gap-2 items-center">
                <PanelLeft size={16} />
                Compact sidebar
              </h2>
              <p className="panel-subtitle">
                Keep navigation icons visible and give data more room.
              </p>
            </div>
            <Switch
              aria-label="Compact sidebar"
              checked={collapsed}
              onCheckedChange={toggleSidebar}
            />
          </div>
          <div className="flex justify-between gap-5 flex-wrap">
            <div>
              <h2 className="flex gap-2 items-center">
                <Rows3 size={16} />
                Table density
              </h2>
              <p className="panel-subtitle">Choose the spacing that works best for you.</p>
            </div>
            <div className="segmented">
              <button
                className={density === 'compact' ? 'active' : ''}
                onClick={() => setDensity('compact')}
              >
                Compact
              </button>
              <button
                className={density === 'comfortable' ? 'active' : ''}
                onClick={() => setDensity('comfortable')}
              >
                Comfortable
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
