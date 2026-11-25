import { describe, expect, it } from 'vitest'
import { pageNumbers } from './server-table'
import { change } from '@/features/rates/rate-trends'

describe('pageNumbers', () => {
  it('lists every page when there are few', () => {
    expect(pageNumbers(1, 1)).toEqual([1])
    expect(pageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('keeps first, last and the pages around the current one', () => {
    expect(pageNumbers(1, 40)).toEqual([1, 2, 3, 4, 5, null, 40])
    expect(pageNumbers(20, 40)).toEqual([1, null, 19, 20, 21, null, 40])
    expect(pageNumbers(40, 40)).toEqual([1, null, 36, 37, 38, 39, 40])
  })

  it('never repeats a page or leaves a gap of one', () => {
    for (let last = 1; last <= 30; last++) {
      for (let current = 1; current <= last; current++) {
        const pages = pageNumbers(current, last).filter((page): page is number => page !== null)
        expect(new Set(pages).size).toBe(pages.length)
        expect(pages).toContain(current)
        expect(pages[0]).toBe(1)
        expect(pages.at(-1)).toBe(last)
      }
    }
  })
})

describe('rate change', () => {
  it('is exact for decimal rates', () => {
    const result = change('134.10', '134.30')
    expect(result?.diff.toFixed()).toBe('0.2')
    expect(result?.percent?.toFixed(4)).toBe('0.1491')
  })

  it('handles falls, no change and zero', () => {
    expect(change('100', '90')?.diff.toFixed()).toBe('-10')
    expect(change('100', '100')?.diff.isZero()).toBe(true)
    expect(change('0', '5')?.percent).toBeNull()
    expect(change('abc', '5')).toBeNull()
  })
})
