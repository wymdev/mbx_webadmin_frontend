import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repository } from './demo'
import type { SettingsKind } from '@/domain/models'

export const queryKeys = {
  transactions: ['transactions'],
  trash: ['trash'],
  rates: ['rates'],
  customers: ['customers'],
  settings: ['settings'],
}
export const useTransactions = () =>
  useQuery({ queryKey: queryKeys.transactions, queryFn: () => repository.transactions() })
export const useRates = () =>
  useQuery({ queryKey: queryKeys.rates, queryFn: () => repository.rates() })
export const useCustomers = () =>
  useQuery({ queryKey: queryKeys.customers, queryFn: () => repository.customers() })
export const useSettings = (kind: SettingsKind) =>
  useQuery({ queryKey: ['settings', kind], queryFn: () => repository.settings(kind) })
export function useDemoMutation<T, R>(mutationFn: (input: T) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await client.invalidateQueries()
    },
  })
}
