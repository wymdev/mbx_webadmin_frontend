import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import LockKeyhole from 'lucide-react/icons/lock-keyhole'
import Mail from 'lucide-react/icons/mail'
import ShieldCheck from 'lucide-react/icons/shield-check'
import UserRound from 'lucide-react/icons/user-round'
import { PageHeader } from '@/components/page-header'
import { Field } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone'),
})
const passwordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    password: z.string().min(12, 'Use at least 12 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
export default function ProfilePage() {
  const [name, setName] = useState('Alex Lee')
  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: 'Alex Lee', email: 'alex@example.test', phone: '+66 81 234 5678' },
  })
  const password = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: '', password: '', confirm: '' },
  })
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="PERSONAL / ACCOUNT"
        title="My profile"
        description="Your personal details and account preferences."
      />
      <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
        <aside className="panel p-6">
          <div className="account-avatar size-16 text-lg mb-4">AL</div>
          <h2>{name}</h2>
          <p className="text-xs text-muted-foreground mt-1">Workspace administrator</p>
          <div className="summary-row mt-5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Mail size={13} />
              Email
            </span>
            <span className="text-[10px]">alex@example.test</span>
          </div>
          <div className="summary-row">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck size={13} />
              Access
            </span>
            <span className="type-badge">Demo admin</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-5 leading-relaxed">
            This is a fictional account. Personal details and passwords are never sent to a backend.
          </p>
        </aside>
        <section className="panel p-6">
          <Tabs defaultValue="details">
            <TabsList className="mb-6">
              <TabsTrigger value="details">
                <UserRound className="size-3.5" />
                Personal details
              </TabsTrigger>
              <TabsTrigger value="security">
                <LockKeyhole className="size-3.5" />
                Password
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <h2>Personal information</h2>
              <p className="panel-subtitle mb-6">Keep your workspace profile up to date.</p>
              <form
                className="space-y-5"
                onSubmit={profile.handleSubmit((v) => {
                  setName(v.name)
                  toast.success('Demo profile updated for this page session')
                })}
              >
                <Field
                  id="profile-name"
                  label="Full name"
                  error={profile.formState.errors.name?.message}
                >
                  <Input id="profile-name" {...profile.register('name')} />
                </Field>
                <div className="field-grid">
                  <Field
                    id="profile-email"
                    label="Email address"
                    error={profile.formState.errors.email?.message}
                  >
                    <Input id="profile-email" type="email" {...profile.register('email')} />
                  </Field>
                  <Field
                    id="profile-phone"
                    label="Phone"
                    error={profile.formState.errors.phone?.message}
                  >
                    <Input id="profile-phone" type="tel" {...profile.register('phone')} />
                  </Field>
                </div>
                <div className="border-t pt-5 flex justify-end">
                  <Button>Save profile</Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="security">
              <h2>Change password</h2>
              <p className="panel-subtitle mb-6">
                Validate a password change form. Demo mode does not change any credentials.
              </p>
              <form
                className="space-y-5"
                onSubmit={password.handleSubmit(() => {
                  password.reset()
                  toast.info('Validation passed. No password was changed in demo mode.')
                })}
              >
                {(
                  [
                    { key: 'current', label: 'Current password', complete: 'current-password' },
                    { key: 'password', label: 'New password', complete: 'new-password' },
                    { key: 'confirm', label: 'Confirm new password', complete: 'new-password' },
                  ] as const
                ).map((field) => (
                  <Field
                    key={field.key}
                    id={field.key}
                    label={field.label}
                    error={password.formState.errors[field.key]?.message}
                  >
                    <Input
                      id={field.key}
                      type="password"
                      autoComplete={field.complete}
                      {...password.register(field.key)}
                    />
                  </Field>
                ))}
                <div className="border-t pt-5 flex justify-end">
                  <Button>Validate password change</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}
