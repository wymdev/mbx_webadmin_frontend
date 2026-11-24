import { cn } from '@/lib/utils'

/** The MBX “m↗” mark on its dark green tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn('grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--sidebar)]', className)}
      aria-hidden="true"
    >
      <span className="brand-symbol origin-center scale-[0.62]">
        m<span>↗</span>
      </span>
    </span>
  )
}
