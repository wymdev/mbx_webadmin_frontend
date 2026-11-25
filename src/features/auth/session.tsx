import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { ApiError, get, send, setUnauthorizedHandler } from '@/services/api'
import { ErrorPage, errorDetail, errorKind } from '@/components/error-page'
import { BrandSymbol } from '@/components/brand-mark'
import { SignInPage } from './sign-in-page'

export const staffSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullish(),
    photo_url: z.string().nullish(),
    roles: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  }),
  permissions: z.object({ manage_users: z.boolean(), view_audit_log: z.boolean() }),
})
export type Staff = z.infer<typeof staffSchema>
export type Permission = keyof Staff['permissions']

export const sessionKey = ['session'] as const

const SessionContext = createContext<Staff | null>(null)

/** The signed-in staff member. Only usable inside <AuthGate>. */
export function useStaff(): Staff {
  const staff = useContext(SessionContext)
  if (!staff) throw new Error('useStaff() must be used inside <AuthGate>')
  return staff
}

export function useCan(permission?: Permission) {
  const staff = useStaff()
  return permission ? staff.permissions[permission] : true
}

function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      try {
        return await get('auth/me', staffSchema, { signal })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: 'always',
  })
}

/** Drop every cached record and show the sign-in screen. */
function useEndSession() {
  const client = useQueryClient()
  return () => {
    void client.cancelQueries()
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] })
    client.setQueryData(sessionKey, null)
  }
}

export function useSignIn() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      await send('post', 'auth/login', credentials)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: sessionKey }),
  })
}

export function useSignOut() {
  const end = useEndSession()
  return useMutation({
    mutationFn: async () => {
      try {
        await send('post', 'auth/logout')
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) throw error
      }
    },
    onSuccess: end,
  })
}

/** Shows sign-in until there is a staff session, then provides it to the workspace. */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession()
  const end = useEndSession()
  useEffect(() => {
    setUnauthorizedHandler(end)
    return () => setUnauthorizedHandler(null)
  }, [end])

  if (session.data) return <SessionContext value={session.data}>{children}</SessionContext>
  if (session.data === null) return <SignInPage />
  if (session.error)
    return (
      <ErrorPage
        kind={errorKind(session.error) === 'server' ? 'server' : 'offline'}
        fullScreen
        detail={errorDetail(session.error)}
        onRetry={() => session.refetch()}
      />
    )
  return <SplashScreen />
}

export function SplashScreen() {
  return (
    <main className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading MBX Ledger">
      <div className="flex items-center gap-3 text-muted-foreground">
        <BrandSymbol className="h-9 animate-pulse" />
        <span className="text-sm font-semibold">Loading workspace…</span>
      </div>
    </main>
  )
}
