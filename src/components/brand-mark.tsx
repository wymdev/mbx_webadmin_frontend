import { cn } from '@/lib/utils'

/** The Mergui Boss circular “M” in gold, from the original brand files (see public/brand). */
export function BrandSymbol({ className }: { className?: string }) {
  return <img src="/brand/mergui-mark.png" alt="" width={142} height={120} className={cn('h-8 w-auto shrink-0', className)} />
}

/** Full logo: “M”, white “Mergui Boss”, gold “Money Exchange”. Only for dark backgrounds. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/mergui-logo.png"
      alt="Mergui Boss Money Exchange"
      width={432}
      height={120}
      className={cn('h-10 w-auto shrink-0', className)}
    />
  )
}

/** The “M” on its dark green tile, for light surfaces. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn('grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--sidebar)]', className)}
      aria-hidden="true"
    >
      <BrandSymbol className="h-5" />
    </span>
  )
}
