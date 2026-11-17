import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

export function PageHeader({
  eyebrow = 'YOUR WORKSPACE, AT A GLANCE',
  title,
  description,
  children,
  count,
}: {
  eyebrow?: string
  title: string
  description: string
  children?: ReactNode
  count?: number
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <div className="flex items-center gap-3">
          <h1>{title}</h1>
          {count !== undefined && <Badge variant="secondary">{count.toLocaleString()}</Badge>}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
