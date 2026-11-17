import { describe, expect, it } from 'vitest'
import { calculateTotal, compareDecimals, sumAmounts } from './money'
import { transactionSchema } from './models'

describe('exchange calculations', () => {
  it('retains cents when a large valid amount is multiplied by a fractional rate', () => {
    expect(calculateTotal('999999999999999', '4350.99', 'multiply')).toBe('4350989999999995649.01')
  })
  it('sorts decimal strings numerically and sums beyond floating point precision', () => {
    expect(compareDecimals('1.9', '1.10')).toBeGreaterThan(0)
    expect(compareDecimals('1.5', '1.05')).toBeGreaterThan(0)
    expect(sumAmounts(['99999999999999.99', '0.01'])).toBe('100000000000000.00')
  })
  it('preserves fractional amounts and rounds half up to two decimals', () => {
    expect(calculateTotal('10.25', '125.5', 'multiply')).toBe('1286.38')
    expect(calculateTotal('0.1', '0.2', 'multiply')).toBe('0.02')
  })
  it('divides without truncating the entered amount', () => {
    expect(calculateTotal('100.50', '4', 'divide')).toBe('25.13')
  })
  it('rejects invalid and non-positive amounts or rates', () => {
    for (const value of ['0', '-2', 'NaN', 'Infinity', 'abc']) {
      expect(() => calculateTotal('100', value, 'divide')).toThrow()
      expect(() => calculateTotal(value, '2', 'multiply')).toThrow()
    }
  })
})

const input = {
  customerName: 'Demo Customer',
  phone: '+66123456789',
  identityType: 'passport',
  passport: 'AB123456',
  nrc: '',
  nationality: 'Myanmar',
  transferMethod: 'Bank transfer',
  exchangeType: 'Buy',
  fromCurrency: 'THB',
  toCurrency: 'MMK',
  amount: '100.25',
  rate: '125.5',
  operation: 'multiply',
  source: 'Walk-in',
  description: '',
}
describe('transaction validation', () => {
  it('requires passport only when passport identity is selected', () => {
    expect(transactionSchema.safeParse(input).success).toBe(true)
    expect(transactionSchema.safeParse({ ...input, passport: '' }).success).toBe(false)
    expect(
      transactionSchema.safeParse({
        ...input,
        identityType: 'nrc',
        passport: '',
        nrc: '12/DEMO(N)123456',
      }).success,
    ).toBe(true)
  })
  it('rejects same-currency exchanges and missing customer names', () => {
    expect(transactionSchema.safeParse({ ...input, toCurrency: 'THB' }).success).toBe(false)
    expect(transactionSchema.safeParse({ ...input, customerName: ' ' }).success).toBe(false)
  })
})
