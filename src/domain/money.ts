import Decimal from 'decimal.js'

const MoneyDecimal = Decimal.clone({ precision: 64, rounding: Decimal.ROUND_HALF_UP })
const bangkokDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function positiveDecimal(value: string) {
  if (value.length > 40 || !/^\d+(\.\d+)?$/.test(value))
    throw new Error('Enter a valid positive decimal')
  const decimal = new MoneyDecimal(value)
  if (!decimal.isFinite() || !decimal.gt(0) || decimal.gt('999999999999999'))
    throw new Error('Amount or rate is out of range')
  return decimal
}
export function calculateTotal(
  amount: string,
  rate: string,
  operation: 'multiply' | 'divide',
): string {
  const a = positiveDecimal(amount)
  const r = positiveDecimal(rate)
  const result = operation === 'multiply' ? a.times(r) : a.div(r)
  return result.toFixed(2, Decimal.ROUND_HALF_UP)
}
/** The amount that produces `total` (used when staff type what the recipient should get). */
export function reverseAmount(
  total: string,
  rate: string,
  operation: 'multiply' | 'divide',
): string {
  const t = positiveDecimal(total)
  const r = positiveDecimal(rate)
  const result = operation === 'multiply' ? t.div(r) : t.times(r)
  return result.toFixed(2, Decimal.ROUND_HALF_UP)
}
/** Which calculation a saved deal used, judged by which one reproduces its total. */
export function inferOperation(amount: string, rate: string, total: string): 'multiply' | 'divide' {
  try {
    const a = new MoneyDecimal(amount)
    const r = new MoneyDecimal(rate)
    const t = new MoneyDecimal(total)
    if (r.isZero()) return 'multiply'
    return a.times(r).minus(t).abs().lte(a.div(r).minus(t).abs()) ? 'multiply' : 'divide'
  } catch {
    return 'multiply'
  }
}
/** Relative difference |a-b|/b, or null when either side is not a positive number. */
export function relativeDifference(a: string, b: string): number | null {
  try {
    const x = new MoneyDecimal(a)
    const y = new MoneyDecimal(b)
    if (!x.gt(0) || !y.gt(0)) return null
    return x.minus(y).abs().div(y).toNumber()
  } catch {
    return null
  }
}
/** Keep digits and one dot, limited to what the API accepts (14 whole digits, 6 decimals). */
export function cleanDecimalInput(value: string) {
  const stripped = value.replace(/[^\d.]/g, '')
  const [whole = '', ...rest] = stripped.split('.')
  const fraction = rest.join('').slice(0, 6)
  const head = whole.replace(/^0+(?=\d)/, '').slice(0, 14)
  return rest.length ? `${head || '0'}.${fraction}` : head
}
/** 1234567.5 → "1,234,567.5" while typing (keeps a trailing dot / zeros). */
export function groupDigits(value: string) {
  if (!value) return ''
  const [whole, fraction] = value.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}
export function compareDecimals(a: string, b: string): number {
  return new Decimal(a).comparedTo(new Decimal(b))
}
export function sumAmounts(values: string[]): string {
  return values
    .reduce((total, value) => total.plus(value), new MoneyDecimal(0))
    .toFixed(2, Decimal.ROUND_HALF_UP)
}
export function bangkokDate(date: Date): string {
  const parts = bangkokDateFormatter.formatToParts(date)
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`
}
