import { describe, expect, it } from 'vitest'
import { createRepository } from './demo'

describe('demo repository', () => {
  it('moves a rate by stable ID, preserves other rows, and rejects missing IDs', async () => {
    const repo = createRepository()
    const before = await repo.rates()
    await repo.reorderRates(before[0].id, before[2].id)
    expect((await repo.rates()).map((row) => row.id)).toEqual([
      before[1].id,
      before[2].id,
      before[0].id,
      before[3].id,
    ])
    await expect(repo.reorderRates('missing', before[0].id)).rejects.toThrow()
    expect(await repo.rates()).toHaveLength(before.length)
  })
  it('saves, edits, trashes and restores without duplicating a transaction', async () => {
    const repo = createRepository()
    const before = await repo.transactions()
    const saved = await repo.saveTransaction({
      customerName: 'New Demo Customer',
      phone: '+66123456789',
      identityType: 'passport',
      passport: 'P123456',
      nrc: '',
      nationality: 'Myanmar',
      transferMethod: 'Bank transfer',
      exchangeType: 'Buy',
      fromCurrency: 'THB',
      toCurrency: 'MMK',
      amount: '10.25',
      rate: '125.5',
      operation: 'multiply',
      source: 'Walk-in',
      description: '',
    })
    expect((await repo.transactions()).length).toBe(before.length + 1)
    expect(saved.total).toBe('1286.38')
    await repo.saveTransaction({ ...saved, customerName: 'Edited Demo Customer' }, saved.id)
    expect((await repo.transactions()).find((t) => t.id === saved.id)?.customerName).toBe(
      'Edited Demo Customer',
    )
    await repo.trashTransaction(saved.id)
    expect((await repo.transactions()).some((t) => t.id === saved.id)).toBe(false)
    expect((await repo.trashedTransactions()).some((t) => t.id === saved.id)).toBe(true)
    await repo.restoreTransaction(saved.id)
    expect((await repo.transactions()).filter((t) => t.id === saved.id)).toHaveLength(1)
    expect(await repo.trashedTransactions()).not.toContainEqual(
      expect.objectContaining({ id: saved.id }),
    )
  })
  it('returns detached records so consumers cannot mutate repository state', async () => {
    const repo = createRepository()
    const rows = await repo.transactions()
    rows[0].customerName = 'Unexpected mutation'
    expect((await repo.transactions())[0].customerName).not.toBe('Unexpected mutation')
  })
})
