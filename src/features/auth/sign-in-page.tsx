import { useState, type FormEvent } from 'react'
import ArrowRight from 'lucide-react/icons/arrow-right'
import Eye from 'lucide-react/icons/eye'
import EyeOff from 'lucide-react/icons/eye-off'
import ShieldCheck from 'lucide-react/icons/shield-check'
import Zap from 'lucide-react/icons/zap'
import ChartLine from 'lucide-react/icons/chart-line'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandLogo } from '@/components/brand-mark'
import { useSignIn } from './session'

export function SignInPage() {
  const signIn = useSignIn()
  const [showPassword, setShowPassword] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    signIn.mutate({ email: String(form.get('email')), password: String(form.get('password')) })
  }

  return (
    <main className="grid min-h-dvh bg-background md:grid-cols-[minmax(18rem,5fr)_minmax(0,7fr)]">
      <aside className="relative isolate flex flex-col justify-between gap-8 overflow-hidden bg-[var(--sidebar)] px-6 py-7 text-[#edf6ef] md:gap-12 md:p-10 lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_120%_120%,#fdb60022,transparent),repeating-linear-gradient(120deg,transparent_0px,transparent_39px,#d8ecdf10_40px,transparent_41px)]"
        />
        <BrandLogo className="h-12 self-start md:h-14" />
        <div className="hidden md:block">
          <div aria-hidden="true" className="mb-5 h-0.5 w-10 bg-[var(--gold)]" />
          <p className="max-w-sm text-3xl leading-tight font-extrabold lg:text-4xl">
            Every deal, rate and receipt in one place.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-[#cfe2d6]">
            <li className="flex items-center gap-3">
              <Zap className="size-4 text-[var(--gold)]" aria-hidden="true" /> Full-screen deal desk
            </li>
            <li className="flex items-center gap-3">
              <ChartLine className="size-4 text-[var(--gold)]" aria-hidden="true" /> Live business
              analytics
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-[var(--gold)]" aria-hidden="true" /> Every change
              signed in the audit chain
            </li>
          </ul>
        </div>
        <div className="hidden items-center gap-2 border-t border-white/15 pt-5 text-xs font-semibold text-[#bfd5c8] md:flex">
          <ShieldCheck aria-hidden="true" size={16} /> Staff access only
        </div>
      </aside>

      <section
        aria-labelledby="sign-in-title"
        className="flex items-center justify-center px-6 py-12 sm:px-10 md:py-16"
      >
        <div className="w-full max-w-sm">
          <header className="mb-8">
            <p className="mb-2 text-sm font-bold text-primary">Staff workspace</p>
            <h1 id="sign-in-title" className="text-3xl font-extrabold text-foreground">
              Sign in to MBX Ledger
            </h1>
          </header>
          <form onSubmit={submit} className="grid gap-5" aria-busy={signIn.isPending}>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="staff-email">
              Work email
              <Input
                id="staff-email"
                name="email"
                type="email"
                autoComplete="username"
                className="h-11"
                autoFocus
                required
              />
            </label>
            <div className="grid gap-2">
              <label className="text-sm font-semibold" htmlFor="staff-password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="staff-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-11 pr-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-1 my-auto text-muted-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
            </div>
            {signIn.error && (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {signIn.error.message}
              </p>
            )}
            <Button
              type="submit"
              className="mt-1 h-11 w-full justify-between px-4"
              disabled={signIn.isPending}
            >
              {signIn.isPending ? 'Signing in…' : 'Sign in'} <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
