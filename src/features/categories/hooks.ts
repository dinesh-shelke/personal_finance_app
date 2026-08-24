import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/SessionProvider';
import { invalidateLedger, queryKeys } from '@/lib/queryClient';
import type { CategoryKind } from '@/types/database';

import {
  countCategoryTransactions,
  createCategory,
  deleteCategory,
  listCategories,
  listCategoriesByKind,
  updateCategory,
  type CategoryInput,
} from './api';

export function useCategories() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.categories(userId),
    queryFn: listCategories,
    // Categories change rarely; keep them warm so the picker opens instantly.
    staleTime: 5 * 60_000,
  });
}

export function useCategoriesByKind(kind: CategoryKind) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.categoriesByKind(userId, kind),
    queryFn: () => listCategoriesByKind(kind),
    staleTime: 5 * 60_000,
  });
}

export function useCategoryTransactionCount(categoryId: string | undefined, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: [...queryKeys.categories(userId), categoryId, 'transaction-count'],
    queryFn: () => countCategoryTransactions(categoryId as string),
    enabled: Boolean(categoryId) && enabled,
  });
}

export function useCreateCategory() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(userId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.categories(userId) }),
  });
}

export function useUpdateCategory() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<CategoryInput, 'kind'>> }) =>
      updateCategory(id, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.categories(userId) });
      // Transaction rows show the category name and colour, so their cached
      // copies are now stale even though no transaction row changed.
      await client.invalidateQueries({ queryKey: queryKeys.transactions(userId) });
    },
  });
}

export function useDeleteCategory() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.categories(userId) });
      // Affected transactions are now Uncategorised, which changes the
      // breakdown as well as the rows themselves.
      await invalidateLedger(userId);
    },
  });
}
