import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Decimal from 'decimal.js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatMoney(value: string | number, currency?: string) {
  try {
    const decimal = new Decimal(value)
    if (!decimal.isFinite()) return '—'
    const [whole, fraction] = decimal.toFixed(2, Decimal.ROUND_HALF_UP).split('.')
    const grouped = new Intl.NumberFormat('en-US').format(BigInt(whole))
    return `${grouped}.${fraction}${currency ? ` ${currency}` : ''}`
  } catch {
    return '—'
  }
}
export function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}
/** Rate for display: grouped, trailing zeros trimmed, at least 2 decimals ("4420.000000" → "4,420.00"). */
export function formatRate(value: string | number) {
  const plain = trimRate(String(value))
  const [whole, fraction = ''] = plain.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${grouped}.${fraction.padEnd(2, '0')}`
}
/** Rate for an input: no grouping, trailing zeros trimmed to 2 decimals ("129.200000" → "129.20"). */
export function trimRate(value: string) {
  if (!/^\d+(\.\d+)?$/.test(value)) return value
  const [whole, fraction = ''] = value.split('.')
  const trimmed = fraction.replace(/0+$/, '')
  return `${whole}.${trimmed.padEnd(2, '0')}`
}
/** "just now", "12 min ago", "3 h ago", "2 days ago". */
export function timeAgo(value: string | null | undefined, now = Date.now()) {
  if (!value) return ''
  const minutes = Math.round((now - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}
export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
