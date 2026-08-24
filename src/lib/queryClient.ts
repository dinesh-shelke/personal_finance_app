import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query cache.
 *
 * Tuned for a personal-finance app on mobile data: the user's own ledger only
 * changes when they change it, so aggressive refetching costs battery and
 * bandwidth for nothing. Mutations invalidate explicitly instead.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is only stale once the user has been away for a while.
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      // React Native has no window focus event worth listening to.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // One retry covers a dropped packet; more just delays the error state.
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      // Never silently retry a write — a retried insert can double a
      // transaction, and a duplicated expense is worse than a visible error.
      retry: 0,
    },
  },
});

/**
 * Query key factory. Centralised so an invalidation can never miss a cache
 * entry because two files spelled the same key differently.
 */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,

  accounts: (userId: string) => ['accounts', userId] as const,
  accountBalances: (userId: string) => ['account-balances', userId] as const,
  netWorth: (userId: string) => ['net-worth', userId] as const,

  categories: (userId: string) => ['categories', userId] as const,
  categoriesByKind: (userId: string, kind: 'income' | 'expense') =>
    ['categories', userId, kind] as const,

  transactions: (userId: string) => ['transactions', userId] as const,
  transactionList: (userId: string, filters: unknown) =>
    ['transactions', userId, 'list', filters] as const,
  transaction: (userId: string, id: string) => ['transactions', userId, 'detail', id] as const,

  monthlySummary: (userId: string, from: string, to: string) =>
    ['monthly-summary', userId, from, to] as const,
  categoryBreakdown: (userId: string, from: string, to: string, kind: string) =>
    ['category-breakdown', userId, from, to, kind] as const,
} as const;

/**
 * Every key whose value depends on the transaction ledger.
 *
 * Adding a transaction changes balances, net worth and every summary, so
 * mutations invalidate this whole set rather than guessing which slices moved.
 */
export function invalidateLedger(userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accountBalances(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth(userId) }),
    queryClient.invalidateQueries({ queryKey: ['monthly-summary', userId] }),
    queryClient.invalidateQueries({ queryKey: ['category-breakdown', userId] }),
  ]);
}
