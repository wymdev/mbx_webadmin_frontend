import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPage, errorDetail, errorKind } from '@/components/error-page'

/** Loading skeleton, or the matching error screen (403 / 404 / 500 / offline) with a retry. */
export function QueryState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean
  error?: Error | null
  retry?: () => void
  children: ReactNode
}) {
  if (loading)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  if (error) {
    const kind = errorKind(error)
    return (
      <div className="rounded-xl border bg-card">
        <ErrorPage kind={kind} compact detail={errorDetail(error)} onRetry={kind === 'forbidden' ? undefined : retry} />
      </div>
    )
  }
  return children
}
