import {
  transactionSchema,
  type TransactionInput,
  type Transaction,
  type SettingsKind,
  type SettingRecord,
} from '@/domain/models'
import { calculateTotal, positiveDecimal } from '@/domain/money'
import { makeFixtures } from './fixtures'

export function createRepository() {
  const data = makeFixtures()
  let transactions = data.transactions
  let trash: Transaction[] = []
  let userTrash: SettingRecord[] = []
  let nextId = 12841
  let sequence = 100
  const clone = <T>(value: T): T => structuredClone(value)
  return {
    async transactions() {
      return clone(transactions)
    },
    async trashedTransactions() {
      return clone(trash)
    },
    async saveTransaction(input: TransactionInput, id?: string) {
      const parsed = transactionSchema.parse(input)
      const existing = id ? transactions.find((t) => t.id === id) : undefined
      if (id && !existing) throw new Error('Transaction no longer exists')
      const transaction: Transaction = {
        ...parsed,
        id: existing?.id || `MBX-${String(nextId++).padStart(6, '0')}`,
        createdAt: existing?.createdAt || new Date().toISOString(),
        total: calculateTotal(parsed.amount, parsed.rate, parsed.operation),
      }
      transactions = existing
        ? transactions.map((t) => (t.id === id ? transaction : t))
        : [transaction, ...transactions]
      if (!data.customers.some((c) => c.name === parsed.customerName))
        data.customers.unshift({
          id: `CUS-${++sequence}`,
          name: parsed.customerName,
          phone: parsed.phone,
          identityType: parsed.identityType,
          passport: parsed.passport,
          nrc: parsed.nrc,
          nationality: parsed.nationality,
          source: parsed.source,
          createdAt: transaction.createdAt,
        })
      return clone(transaction)
    },
    async trashTransaction(id: string) {
      const item = transactions.find((t) => t.id === id)
      if (!item) throw new Error('Transaction not found')
      transactions = transactions.filter((t) => t.id !== id)
      trash.unshift(item)
    },
    async restoreTransaction(id: string) {
      const item = trash.find((t) => t.id === id)
      if (!item) throw new Error('Transaction not found in trash')
      trash = trash.filter((t) => t.id !== id)
      transactions = [item, ...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async customers() {
      return clone(data.customers)
    },
    async rates() {
      return clone(data.rates)
    },
    async reorderRates(activeId: string, targetId: string) {
      const from = data.rates.findIndex((rate) => rate.id === activeId)
      const to = data.rates.findIndex((rate) => rate.id === targetId)
      if (from < 0 || to < 0) throw new Error('Rate not found')
      if (from === to) return
      const [moved] = data.rates.splice(from, 1)
      data.rates.splice(to, 0, moved)
    },
    async saveRate(input: { id: string; buy: string; sell: string }) {
      positiveDecimal(input.buy)
      positiveDecimal(input.sell)
      const item = data.rates.find((r) => r.id === input.id)
      if (!item) throw new Error('Rate not found')
      item.buy = input.buy
      item.sell = input.sell
      item.updatedAt = new Date().toISOString()
      item.history.push({ day: 'Updated', buy: Number(input.buy), sell: Number(input.sell) })
      return clone(item)
    },
    async settings(kind: SettingsKind) {
      return clone(data.settings[kind])
    },
    async saveSetting(kind: SettingsKind, input: Omit<SettingRecord, 'id'>, id?: string) {
      if (input.name.trim().length < 2) throw new Error('Name is required')
      const record = { ...input, id: id || `${kind}-${++sequence}` }
      if (id && !data.settings[kind].some((r) => r.id === id)) throw new Error('Record not found')
      data.settings[kind] = id
        ? data.settings[kind].map((r) => (r.id === id ? record : r))
        : [...data.settings[kind], record]
      return clone(record)
    },
    async trashSetting(kind: SettingsKind, id: string) {
      const record = data.settings[kind].find((r) => r.id === id)
      if (!record) throw new Error('Record not found')
      data.settings[kind] = data.settings[kind].filter((r) => r.id !== id)
      if (kind === 'users') userTrash.unshift(record)
    },
    async trashedUsers() {
      return clone(userTrash)
    },
    async restoreUser(id: string) {
      const record = userTrash.find((r) => r.id === id)
      if (!record) throw new Error('User not found')
      userTrash = userTrash.filter((r) => r.id !== id)
      data.settings.users.push(record)
    },
  }
}
export const repository = createRepository()
