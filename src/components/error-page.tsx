import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ArrowLeft from 'lucide-react/icons/arrow-left'
import House from 'lucide-react/icons/house'
import RotateCw from 'lucide-react/icons/rotate-cw'
import SearchX from 'lucide-react/icons/search-x'
import ShieldBan from 'lucide-react/icons/shield-ban'
import ServerCrash from 'lucide-react/icons/server-crash'
import WifiOff from 'lucide-react/icons/wifi-off'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'

type Kind = 'not-found' | 'forbidden' | 'server' | 'offline'

const content: Record<Kind, { code: string; icon: LucideIcon; title: string; message: string }> = {
  'not-found': {
    code: '404',
    icon: SearchX,
    title: 'Page not found',
    message: 'This page doesn’t exist or was moved. Check the address, or head back to the overview.',
  },
  forbidden: {
    code: '403',
    icon: ShieldBan,
    title: 'You don’t have access',
    message: 'Your role can’t open this page. Ask an admin if you need it for your work.',
  },
  server: {
    code: '500',
    icon: ServerCrash,
    title: 'Something went wrong',
    message: 'The workspace hit an unexpected problem. Nothing you already saved is lost. Reload to try again.',
  },
  offline: {
    code: '503',
    icon: WifiOff,
    title: 'Can’t reach MBX Ledger',
    message: 'The server isn’t answering. Check your internet connection, then try again.',
  },
}

/**
 * Error screen in two sizes: `fullScreen` replaces the whole app (route crash, signed-out errors),
 * otherwise it sits inside the workspace shell or a card.
 */
export function ErrorPage({
  kind,
  fullScreen = false,
  compact = false,
  detail,
  onRetry,
  children,
}: {
  kind: Kind
  fullScreen?: boolean
  compact?: boolean
  detail?: string
  onRetry?: () => void
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const { code, icon: Icon, title, message } = content[kind]
  const retry = onRetry ?? (kind === 'server' || kind === 'offline' ? () => window.location.reload() : undefined)
  return (
    <div
      role={kind === 'server' || kind === 'offline' ? 'alert' : undefined}
      className={cn(
        'grid place-items-center text-center',
        fullScreen ? 'min-h-dvh bg-background p-6' : compact ? 'px-4 py-10' : 'min-h-[60vh] px-4 py-16',
      )}
    >
      <div className="grid max-w-md justify-items-center">
        <div className="relative mb-6">
          {!compact && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[7rem] leading-none font-extrabold tracking-tighter text-muted select-none"
            >
              {code}
            </span>
          )}
          <span className="relative grid size-14 place-items-center rounded-2xl border bg-card text-primary shadow-sm">
            <Icon className="size-6" aria-hidden="true" />
          </span>
        </div>
        <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground">ERROR {code}</p>
        <h1 className={cn('mt-2 font-extrabold tracking-tight', compact ? 'text-lg' : 'text-2xl')}>{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {retry && (
            <Button onClick={retry}>
              <RotateCw /> Try again
            </Button>
          )}
          {!compact && (
            <>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft /> Go back
              </Button>
              <Button variant={retry ? 'outline' : 'default'} asChild>
                {fullScreen ? (
                  <a href="/">
                    <House /> Overview
                  </a>
                ) : (
                  <Link to="/">
                    <House /> Overview
                  </Link>
                )}
              </Button>
            </>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

/** Which error screen fits an error thrown by a request or a route. */
export function errorKind(error: unknown): Kind {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'not-found'
    if (error.status === 403) return 'forbidden'
    if (error.status === undefined || error.status === 503 || error.status === 502) return 'offline'
  }
  return 'server'
}

/** Reference id to quote when reporting a server error. */
export function errorDetail(error: unknown) {
  return error instanceof ApiError && error.requestId ? `Reference: ${error.requestId}` : undefined
}
