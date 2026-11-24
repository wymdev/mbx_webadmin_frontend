import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { get, getPage } from '@/services/api'
import { bangkokDate, inferOperation } from '@/domain/money'

const decimal = z.union([z.string(), z.number()]).transform(String)
const named = z.array(z.object({ id: z.number(), name: z.string() }))

export const referenceSchema = z.object({
  currencies: z.array(z.string()),
  currency_usage: z.object({ from: z.array(z.string()), to: z.array(z.string()) }),
  transfer_methods: named,
  customer_sources: named,
  country_codes: z.array(z.object({ name: z.string(), code: z.string().nullish(), country_code: z.string().nullish() })),
  nationalities: z.array(z.string().nullable()).transform((values) => values.filter((v): v is string => !!v)),
  nrc_codes: z.array(z.union([z.string(), z.number()]).transform(String)),
})
export type ReferenceData = z.infer<typeof referenceSchema>

export function useReferenceData() {
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: ({ signal }) => get('reference-data', referenceSchema, { signal }),
    staleTime: 10 * 60_000,
  })
}

export const rateSchema = z.object({
  id: z.number(),
  currency: z.string(),
  country: z.string().nullish(),
  buy: decimal,
  sell: decimal,
  buy_trend: z.string().nullish(),
  sell_trend: z.string().nullish(),
  photo_url: z.string().nullish(),
  updated_at: z.string().nullish(),
})
export type Rate = z.infer<typeof rateSchema>

export function useRates() {
  return useQuery({
    queryKey: ['rates'],
    queryFn: ({ signal }) => get('rates', z.array(rateSchema), { signal }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useNrcTownships(code: string) {
  return useQuery({
    queryKey: ['nrc-townships', code],
    enabled: /^\d{1,2}$/.test(code),
    queryFn: ({ signal }) =>
      get('reference-data/nrc-townships', z.array(z.string()), { signal, params: { code } }),
    staleTime: Infinity,
  })
}

const suggestion = z.object({
  customer_id: z.string().nullable(),
  name: z.string(),
  country_code: z.string().nullish(),
  phone: z.string().nullish(),
  id_type: z.string().nullish(),
})
export type CustomerSuggestion = z.infer<typeof suggestion>
export function useCustomerLookup(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: ['customer-lookup', term],
    enabled: term.length >= 2,
    queryFn: ({ signal }) => get('customers/lookup', z.array(suggestion), { signal, params: { q: term } }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export const customerProfileSchema = z.object({
  customer: z.object({
    customer_id: z.string().nullable(),
    name: z.string(),
    country_code: z.string().nullable(),
    phone: z.string().nullable(),
    id_type: z.string().nullable(),
    nrc: z.object({ code: z.string().nullable(), township: z.string().nullable(), type: z.string().nullable(), number: z.string().nullable() }).nullable(),
    nationality: z.string().nullable(),
    passport: z.string().nullable(),
    facebook_profile_url: z.string().nullable(),
  }),
  activity: z.object({
    transactions: z.number(),
    first_transaction_at: z.string().nullable(),
    last_transaction_at: z.string().nullable(),
  }),
  totals: z.array(z.object({ from_currency: z.string(), to_currency: z.string(), count: z.number(), amount_sum: decimal, total_sum: decimal })),
  transfer_methods: z.array(z.object({ method: z.string(), count: z.number() })),
})
export type CustomerProfile = z.infer<typeof customerProfileSchema>

export function useCustomerProfile(customerId: string | null) {
  return useQuery({
    queryKey: ['customer', customerId],
    enabled: !!customerId,
    queryFn: ({ signal }) => get(`customers/${encodeURIComponent(customerId!)}`, customerProfileSchema, { signal }),
  })
}

export const transactionSchema = z.object({
  id: z.number(),
  transaction_id: z.string(),
  exchange_type: z.string(),
  from_currency: z.string(),
  to_currency: z.string(),
  amount: decimal,
  exchange_rate: decimal,
  total: decimal,
  transfer_method: z.string().nullable(),
  description: z.string().nullable(),
  customer_id: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_source_id: z.number().nullable(),
  created_at: z.string().nullable(),
  created_by: z.object({ id: z.number(), name: z.string() }).nullish(),
})
export type Transaction = z.infer<typeof transactionSchema>

/** The latest deal on this currency pair: its type, rate and calculation are the desk's defaults. */
export function useLastDeal(from: string, to: string) {
  return useQuery({
    queryKey: ['last-deal', from, to],
    enabled: !!from && !!to && from !== to,
    queryFn: async ({ signal }) => {
      const { rows } = await getPage('transactions', transactionSchema, {
        signal,
        params: { 'filter[from_currency]': from, 'filter[to_currency]': to, per_page: 1 },
      })
      const deal = rows[0]
      return deal ? { ...deal, operation: inferOperation(deal.amount, deal.exchange_rate, deal.total) } : null
    },
    staleTime: 60_000,
  })
}

/** Today's deals (Bangkok day), newest first. */
export function useTodayDeals(staffId?: number) {
  const today = bangkokDate(new Date())
  return useQuery({
    queryKey: ['transactions', 'today', today, staffId ?? 'all'],
    queryFn: ({ signal }) =>
      getPage('transactions', transactionSchema, {
        signal,
        params: {
          'filter[date_from]': today,
          'filter[date_to]': today,
          ...(staffId ? { 'filter[created_by]': staffId } : {}),
          include: 'created_by',
          per_page: staffId ? 1 : 8,
        },
      }),
    refetchInterval: 30_000,
  })
}

export const receiptSchema = z.object({
  transaction: transactionSchema,
  local_time: z.string().nullable(),
  look: z.object({
    business_name: z.string(),
    font_color: z.string(),
    logo_url: z.string().nullable(),
    background_url: z.string().nullable(),
    qr_url: z.string().nullish(),
  }),
})
export type Receipt = z.infer<typeof receiptSchema>

export function useReceipt(id: number | null) {
  return useQuery({
    queryKey: ['receipt', id],
    enabled: id !== null,
    queryFn: ({ signal }) => get(`transactions/${id}/receipt`, receiptSchema, { signal }),
  })
}
