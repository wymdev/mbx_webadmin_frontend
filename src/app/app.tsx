import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { createBrowserRouter, isRouteErrorResponse, Outlet, RouterProvider, useRouteError } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast, Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthGate, SplashScreen, useCan, type Permission } from '@/features/auth/session'
import { ErrorPage } from '@/components/error-page'
import { Shell, useThemeEffect } from './shell'

const DealDesk = lazy(() => import('@/features/desk/deal-desk'))
const Overview = lazy(() => import('@/features/dashboard/overview-page'))
// Screens not redesigned yet still come from the first live build.
const LegacyPage = lazy(() => import('./live-workspace'))

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /**
       * Toast shown when the action succeeds (text, or built from the mutation's variables).
       * Actions that set it also toast the server's message when they fail.
       */
      success?: string | ((variables: never) => string)
    }
  }
}

const client = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: (_data, variables, _result, mutation) => {
      const success = mutation.meta?.success
      if (!success) return
      toast.success(typeof success === 'function' ? (success as (variables: unknown) => string)(variables) : success)
    },
    onError: (error, _variables, _result, mutation) => {
      if (mutation.meta?.success) toast.error(error.message)
    },
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})

function Root() {
  useThemeEffect()
  return (
    <AuthGate>
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    </AuthGate>
  )
}

/** Route crash (500), unknown URL thrown by the router (404), or a stale lazy chunk after a deploy. */
function RouteError() {
  const error = useRouteError()
  console.error('MBX route error', error)
  if (isRouteErrorResponse(error) && error.status === 404) return <ErrorPage kind="not-found" fullScreen />
  const staleChunk = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)
  return (
    <ErrorPage
      kind="server"
      fullScreen
      detail={staleChunk ? 'A newer version of MBX Ledger is available. Reloading will load it.' : undefined}
    />
  )
}

/** 403 inside the workspace when the signed-in role lacks the permission. */
function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  return useCan(permission) ? children : <ErrorPage kind="forbidden" />
}

// Screens not redesigned yet: each path renders from the first live build until it gets its own module.
const legacy = (path: string, permission?: Permission) => ({
  path,
  element: permission ? (
    <RequirePermission permission={permission}>
      <LegacyPage />
    </RequirePermission>
  ) : (
    <LegacyPage />
  ),
})

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: 'desk', element: <DealDesk /> },
      {
        element: <Shell />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Overview /> },
          legacy('transactions'),
          legacy('transactions/new'),
          legacy('reports'),
          legacy('customers'),
          legacy('rates'),
          legacy('settings/methods'),
          legacy('settings/sources'),
          legacy('settings/slips'),
          legacy('settings/users', 'manage_users'),
          legacy('trash'),
          legacy('trash/staff', 'manage_users'),
          legacy('audit', 'view_audit_log'),
          legacy('profile'),
          { path: '*', element: <ErrorPage kind="not-found" /> },
        ],
      },
    ],
  },
])

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MBX workspace error', error, info.componentStack)
  }
  render() {
    if (this.state.error)
      return (
        <main role="alert" className="grid min-h-dvh place-items-center p-6 text-center">
          <div className="max-w-md">
            <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground">ERROR 500</p>
            <h1 className="mt-2 text-2xl font-extrabold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The workspace hit an unexpected problem. Nothing you already saved is lost.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Reload workspace
            </button>
          </div>
        </main>
      )
    return this.props.children
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Toaster richColors position="bottom-right" closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
