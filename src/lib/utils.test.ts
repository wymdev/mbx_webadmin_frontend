import { expect, it } from 'vitest'
import { formatMoney } from './utils'

it('formats monetary strings without losing their fractional precision', () => {
  expect(formatMoney('99999999999999.99', 'THB')).toBe('99,999,999,999,999.99 THB')
  expect(formatMoney('100000000000000.01')).toBe('100,000,000,000,000.01')
})
