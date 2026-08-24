import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/SessionProvider';
import { invalidateLedger, queryKeys } from '@/lib/queryClient';

import {
  countAccountTransactions,
  createAccount,
  deleteAccount,
  getAccountBalance,
  getNetWorth,
  listAccountBalances,
  listAllAccounts,
  reorderAccounts,
  setAccountArchived,
  updateAccount,
  type AccountInput,
} from './api';

/**
 * Account queries and mutations.
 *
 * Anything that changes an account also changes derived figures — the balance
 * view, net worth, the dashboard — so mutations invalidate via
 * `invalidateLedger` rather than picking individual keys and inevitably
 * forgetting one.
 */

export function useAccountBalances() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.accountBalances(userId),
    queryFn: listAccountBalances,
  });
}

export function useAllAccounts() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.accounts(userId),
    queryFn: listAllAccounts,
  });
}

export function useAccountBalance(accountId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: [...queryKeys.accountBalances(userId), accountId],
    queryFn: () => getAccountBalance(accountId as string),
    enabled: Boolean(accountId),
  });
}

export function useNetWorth() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.netWorth(userId),
    queryFn: getNetWorth,
  });
}

/** Transaction count for a delete confirmation. Only fetched when asked for. */
export function useAccountTransactionCount(accountId: string | undefined, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: [...queryKeys.accounts(userId), accountId, 'transaction-count'],
    queryFn: () => countAccountTransactions(accountId as string),
    enabled: Boolean(accountId) && enabled,
  });
}

export function useCreateAccount() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(userId, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      await invalidateLedger(userId);
    },
  });
}

export function useUpdateAccount() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AccountInput> }) =>
      updateAccount(id, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      // opening_balance may have moved, so balances must be recomputed.
      await invalidateLedger(userId);
    },
  });
}

export function useSetAccountArchived() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      setAccountArchived(id, archived),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      await invalidateLedger(userId);
    },
  });
}

export function useDeleteAccount() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      // The cascade took transactions with it, so the whole ledger is stale.
      await invalidateLedger(userId);
    },
  });
}

export function useReorderAccounts() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderAccounts(orderedIds),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      await client.invalidateQueries({ queryKey: queryKeys.accountBalances(userId) });
    },
  });
}
