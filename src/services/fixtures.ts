import type { Customer, Rate, SettingsKind, SettingRecord, Transaction } from '@/domain/models'
import { bangkokDate, calculateTotal } from '@/domain/money'

const names = [
  'Aye Chan',
  'Min Khant',
  'Su Myat',
  'Nanda Win',
  'Thiri Mon',
  'Kaung Htet',
  'May Thu',
  'Hnin Wai',
  'Zaw Lin',
  'Ei Phyu',
  'Than Htun',
  'Nyein Chan',
  'Khin Myat',
  'Wai Yan',
  'Moe Thandar',
  'Thet Naing',
  'Phoo Pwint',
  'Aung Myo',
  'Yadanar Win',
  'Lin Htet',
  'Pyae Sone',
  'Wint Wah',
  'Ko Ko',
  'Hsu Hlaing',
]
export function makeFixtures() {
  const now = new Date()
  const today = bangkokDate(now)
  const customers: Customer[] = names.map((name, index) => ({
    id: `CUS-${String(index + 1).padStart(4, '0')}`,
    name,
    phone: `+66 8${String(12000000 + index * 713).padStart(8, '0')}`,
    identityType: index % 3 === 0 ? 'nrc' : 'passport',
    passport: `DEMO${10000 + index}`,
    nrc: `12/DEMO(N)${String(100000 + index)}`,
    nationality: 'Myanmar',
    source: ['Walk-in', 'Facebook', 'Referral', 'Mobile app'][index % 4],
    createdAt: new Date(now.getTime() - (60 + index) * 86400000).toISOString(),
  }))
  const transactions: Transaction[] = Array.from({ length: 840 }, (_, index) => {
    const customer = customers[(index * 7) % customers.length]
    const fromCurrency = (['THB', 'THB', 'MMK', 'USD', 'THB', 'SGD', 'THB'] as const)[index % 7]
    const amount =
      fromCurrency === 'MMK'
        ? String(500000 + (index % 30) * 25000)
        : String(500 + ((index * 137) % 18000)) + '.50'
    const rate =
      fromCurrency === 'THB'
        ? '125.50'
        : fromCurrency === 'MMK'
          ? '125.50'
          : fromCurrency === 'USD'
            ? '4350.00'
            : '3280.00'
    const operation = fromCurrency === 'MMK' ? 'divide' : 'multiply'
    const dayOffset = Math.floor(index / 28)
    const created = new Date(`${today}T16:45:00+07:00`)
    created.setUTCDate(created.getUTCDate() - dayOffset)
    created.setUTCMinutes(created.getUTCMinutes() - (index % 28) * 13)
    return {
      id: `MBX-${String(12840 - index).padStart(6, '0')}`,
      customerName: customer.name,
      phone: customer.phone,
      identityType: customer.identityType,
      passport: customer.passport,
      nrc: customer.nrc,
      nationality: customer.nationality,
      transferMethod: ['Bank transfer', 'Bank transfer', 'Cash', 'Mobile wallet', 'Bank transfer'][
        index % 5
      ],
      exchangeType: index % 3 === 0 ? 'Sell' : 'Buy',
      fromCurrency,
      toCurrency: fromCurrency === 'MMK' ? 'THB' : 'MMK',
      amount,
      rate,
      operation,
      total: calculateTotal(amount, rate, operation),
      source: customer.source,
      description: 'Fictional sample exchange for the MBX workspace.',
      createdAt: created.toISOString(),
    }
  })
  const rates: Rate[] = [
    { currency: 'THB', country: 'Thailand', flag: '🇹🇭', buy: '125.50', sell: '127.00' },
    { currency: 'USD', country: 'United States', flag: '🇺🇸', buy: '4350.00', sell: '4420.00' },
    { currency: 'SGD', country: 'Singapore', flag: '🇸🇬', buy: '3280.00', sell: '3345.00' },
    { currency: 'EUR', country: 'European Union', flag: '🇪🇺', buy: '4685.00', sell: '4770.00' },
  ].map((r, index) => ({
    ...r,
    id: `rate-${index + 1}`,
    updatedAt: now.toISOString(),
    history: Array.from({ length: 10 }, (_, i) => ({
      day: `Day ${i + 1}`,
      buy: Number(r.buy) * (1 + (i - 9) * 0.0015),
      sell: Number(r.sell) * (1 + (i - 9) * 0.0013),
    })),
  }))
  const settings: Record<SettingsKind, SettingRecord[]> = {
    users: [
      { id: 'user-1', name: 'Alex Lee', detail: 'alex@example.test', role: 'Admin', active: true },
      { id: 'user-2', name: 'Su Myat', detail: 'su@example.test', role: 'Manager', active: true },
      { id: 'user-3', name: 'Min Khant', detail: 'min@example.test', role: 'Staff', active: true },
      {
        id: 'user-4',
        name: 'Thiri Mon',
        detail: 'thiri@example.test',
        role: 'Staff',
        active: false,
      },
    ],
    methods: ['Bank transfer', 'Cash', 'Mobile wallet'].map((name, i) => ({
      id: `method-${i}`,
      name,
      detail: ['Direct bank account transfer', 'Counter exchange', 'Supported wallet transfer'][i],
      role: i === 1 ? 'In person' : 'Digital',
      active: true,
    })),
    sources: ['Walk-in', 'Facebook', 'Referral', 'Mobile app'].map((name, i) => ({
      id: `source-${i}`,
      name,
      detail: 'Customer acquisition channel',
      role: i === 0 ? 'In person' : 'Digital',
      active: true,
    })),
    slips: [
      {
        id: 'slip-1',
        name: 'MBX standard receipt',
        detail: 'Forest green and gold · full exchange details',
        role: 'Receipt',
        active: true,
      },
      {
        id: 'slip-2',
        name: 'Compact counter receipt',
        detail: 'Compact receipt layout metadata',
        role: 'Compact',
        active: false,
      },
    ],
  }
  return { customers, transactions, rates, settings }
}
