import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { get } from '@/services/api'

const decimal = z.union([z.string(), z.number()]).transform(String)

const kpis = z.object({
  deals: z.number(),
  buy: z.number(),
  sell: z.number(),
  thb_volume: decimal,
  mmk_volume: decimal,
  customers: z.number(),
  new_customers: z.number(),
  average_thb: decimal,
})
export type Kpis = z.infer<typeof kpis>

const breakdown = z.array(z.object({ name: z.string(), count: z.number(), thb_volume: decimal }))
export type Breakdown = z.infer<typeof breakdown>

const analyticsSchema = z.object({
  period: z.object({ from: z.string(), to: z.string(), days: z.number() }),
  previous_period: z.object({ from: z.string(), to: z.string() }),
  kpis,
  previous_kpis: kpis,
  daily: z.array(z.object({ date: z.string(), buy: z.number(), sell: z.number(), thb_volume: decimal, mmk_volume: decimal })),
  hourly: z.array(z.object({ weekday: z.number(), hour: z.number(), count: z.number() })),
  transfer_methods: breakdown,
  customer_sources: breakdown,
  staff: breakdown,
  pairs: z.array(
    z.object({ from_currency: z.string(), to_currency: z.string(), count: z.number(), amount_sum: decimal, total_sum: decimal }),
  ),
  top_customers: z.array(
    z.object({ customer_id: z.string().nullable(), name: z.string().nullable(), count: z.number(), thb_volume: decimal, last_at: z.string().nullable() }),
  ),
})
export type Analytics = z.infer<typeof analyticsSchema>

export function useAnalytics(from: string, to: string) {
  return useQuery({
    queryKey: ['analytics', from, to],
    queryFn: ({ signal }) => get('analytics', analyticsSchema, { signal, params: { from, to } }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

const ratePoint = z.object({ date: z.string(), buy: decimal, sell: decimal })
export type RatePoint = z.infer<typeof ratePoint>

/** Closing board rate per Bangkok day for one currency. */
export function useRateChart(rateId: number | null, from: string, to: string) {
  return useQuery({
    queryKey: ['rate-chart', rateId, from, to],
    enabled: rateId !== null,
    queryFn: ({ signal }) => get(`rates/${rateId}/chart`, z.array(ratePoint), { signal, params: { from, to } }),
    placeholderData: keepPreviousData,
  })
}
