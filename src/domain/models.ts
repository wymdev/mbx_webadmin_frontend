import { z } from 'zod'
import { positiveDecimal } from './money'

const decimal = z.string().refine((value) => {
  try {
    positiveDecimal(value)
    return true
  } catch {
    return false
  }
}, 'Enter a positive decimal amount')
export const transactionSchema = z
  .object({
    customerName: z.string().trim().min(2, 'Enter the customer name').max(100),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,22}$/, 'Enter a valid phone number with country code'),
    identityType: z.enum(['passport', 'nrc']),
    passport: z.string().trim().max(50),
    nrc: z.string().trim().max(70),
    nationality: z.string().trim().max(70),
    transferMethod: z.string().min(1),
    exchangeType: z.enum(['Buy', 'Sell']),
    fromCurrency: z.enum(['THB', 'MMK', 'USD', 'SGD']),
    toCurrency: z.enum(['THB', 'MMK', 'USD', 'SGD']),
    amount: decimal,
    rate: decimal,
    operation: z.enum(['multiply', 'divide']),
    source: z.string().min(1),
    description: z.string().max(500),
  })
  .superRefine((value, context) => {
    if (value.fromCurrency === value.toCurrency)
      context.addIssue({
        code: 'custom',
        path: ['toCurrency'],
        message: 'Choose a different destination currency',
      })
    if (value.identityType === 'passport') {
      if (!value.passport)
        context.addIssue({
          code: 'custom',
          path: ['passport'],
          message: 'Passport number is required',
        })
      if (!value.nationality)
        context.addIssue({
          code: 'custom',
          path: ['nationality'],
          message: 'Nationality is required',
        })
    } else if (!value.nrc)
      context.addIssue({ code: 'custom', path: ['nrc'], message: 'NRC number is required' })
  })
export type TransactionInput = z.infer<typeof transactionSchema>
export type Transaction = TransactionInput & { id: string; total: string; createdAt: string }
export type Customer = {
  id: string
  name: string
  phone: string
  identityType: 'passport' | 'nrc'
  passport: string
  nrc: string
  nationality: string
  source: string
  createdAt: string
}
export type Rate = {
  id: string
  currency: string
  country: string
  flag: string
  buy: string
  sell: string
  updatedAt: string
  history: { day: string; buy: number; sell: number }[]
}
export type SettingsKind = 'users' | 'methods' | 'sources' | 'slips'
export type SettingRecord = {
  id: string
  name: string
  detail: string
  role: string
  active: boolean
}
