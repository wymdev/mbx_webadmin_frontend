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
