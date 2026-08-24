import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useUserId } from '@/features/auth/SessionProvider';
import { invalidateLedger, queryKeys } from '@/lib/queryClient';
import { groupByDay } from '@/utils/date';
import { sumAmounts } from '@/utils/money';

import {
  createTransaction,
  deleteTransaction,
  fetchCategoryBreakdown,
  fetchMonthlySummary,
  getTransaction,
  listTransactions,
  updateTransaction,
  type TransactionFilters,
  type TransactionInput,
  type TransactionWithRelations,
} from './api';

/**
 * Transaction queries and mutations.
 *
 * Writes never retry (see `queryClient.ts`) — a retried insert would duplicate
 * a transaction, and a phantom expense is worse than a visible error the user
 * can retry themselves.
 */

export function useTransactions(filters: TransactionFilters = {}) {
  const userId = useUserId();

  return useInfiniteQuery({
    queryKey: queryKeys.transactionList(userId, filters),
    queryFn: ({ pageParam }) => listTransactions(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/**
 * Flattens the paged result into `SectionList` sections grouped by local day,
 * each with its own income/expense subtotals.
 *
 * Subtotals use `sumAmounts` rather than `+` — over a long history plain float
 * addition drifts, and a day total that is a paisa off is exactly the sort of
 * thing that destroys trust in a finance app.
 */
export function useTransactionSections(filters: TransactionFilters = {}) {
  const query = useTransactions(filters);

  const sections = useMemo(() => {
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return groupByDay(items, (t) => t.occurred_at).map((section) => {
      const income = sumAmounts(
        section.data.filter((t) => t.type === 'income').map((t) => t.amount),
      );
      const expense = sumAmounts(
        section.data.filter((t) => t.type === 'expense').map((t) => t.amount),
      );

      return { ...section, income, expense, net: sumAmounts([income, -expense]) };
    });
  }, [query.data]);

  const isEmpty = !query.isLoading && sections.length === 0;

  return { ...query, sections, isEmpty };
}

export function useTransaction(id: string | undefined) {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.transaction(userId, id ?? ''),
    queryFn: () => getTransaction(id as string),
    enabled: Boolean(id),
  });
}

export function useMonthlySummary(from: string, to: string) {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.monthlySummary(userId, from, to),
    queryFn: () => fetchMonthlySummary(from, to),
  });
}

export function useCategoryBreakdown(
  from: string,
  to: string,
  kind: 'income' | 'expense' = 'expense',
) {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.categoryBreakdown(userId, from, to, kind),
    queryFn: () => fetchCategoryBreakdown(from, to, kind),
  });
}

export function useCreateTransaction() {
  const userId = useUserId();

  return useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(userId, input),
    // Balances, net worth and every summary all move, so invalidate the lot
    // rather than guessing which slices changed.
    onSuccess: () => invalidateLedger(userId),
  });
}

export function useUpdateTransaction() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      updateTransaction(id, userId, input),
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({
        queryKey: queryKeys.transaction(userId, variables.id),
      });
      await invalidateLedger(userId);
    },
  });
}

export function useDeleteTransaction() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: async (_data, id) => {
      client.removeQueries({ queryKey: queryKeys.transaction(userId, id) });
      await invalidateLedger(userId);
    },
  });
}

export type { TransactionWithRelations };
