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
export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
