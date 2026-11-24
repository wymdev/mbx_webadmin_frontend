import { useNow } from '@/lib/use-now'

const format = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Business time (Bangkok). */
export function BangkokClock({ className }: { className?: string }) {
  const now = useNow()
  return (
    <time className={className} dateTime={new Date(now).toISOString()} title="Bangkok business time">
      {format.format(now)}
    </time>
  )
}
