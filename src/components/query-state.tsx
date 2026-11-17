import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import AlertCircle from 'lucide-react/icons/circle-exclamation-point'

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
      <div className="space-y-4" aria-label="Loading workspace">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  if (error)
    return (
      <div className="panel p-10 text-center">
        <AlertCircle className="mx-auto mb-3 text-destructive" />
        <h2>Unable to load data</h2>
        <p className="text-muted-foreground my-3">{error.message}</p>
        <Button onClick={retry}>Try again</Button>
      </div>
    )
  return children
}
