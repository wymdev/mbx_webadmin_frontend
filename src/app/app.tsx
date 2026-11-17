import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Shell } from './shell'

const Dashboard = lazy(() => import('@/features/dashboard/dashboard-page'))
const Transactions = lazy(() => import('@/features/transactions/transactions-page'))
const TransactionForm = lazy(() => import('@/features/transactions/transaction-form'))
const Reports = lazy(() => import('@/features/reports/reports-page'))
const Rates = lazy(() => import('@/features/rates/rates-page'))
const Customers = lazy(() => import('@/features/customers/customers-page'))
const Settings = lazy(() => import('@/features/settings/settings-page'))
const Profile = lazy(() => import('@/features/account/profile-page'))
const Trash = lazy(() => import('@/features/trash/trash-page'))
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'transactions/new', element: <TransactionForm /> },
      { path: 'transactions/:id/edit', element: <TransactionForm /> },
      { path: 'reports', element: <Reports /> },
      { path: 'rates', element: <Rates /> },
      { path: 'customers', element: <Customers /> },
      { path: 'settings/:section', element: <Settings /> },
      { path: 'profile', element: <Profile /> },
      { path: 'trash', element: <Trash /> },
      {
        path: '*',
        element: (
          <div className="panel empty-state">
            <h1>Page not found</h1>
            <p className="text-muted-foreground mt-3 mb-5">
              This page isn’t part of your workspace.
            </p>
            <Link className="text-primary underline" to="/">
              Back to overview
            </Link>
          </div>
        ),
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
        <div className="p-10 max-w-lg mx-auto">
          <h1>Something went wrong</h1>
          <p className="text-muted-foreground my-4">
            The workspace could not render. Reload to reset demo data and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2"
          >
            Reload workspace
          </button>
        </div>
      )
    return this.props.children
  }
}
export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <Suspense fallback={<div className="p-10 text-muted-foreground">Loading workspace…</div>}>
            <RouterProvider router={router} />
          </Suspense>
          <Toaster richColors position="bottom-right" closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
