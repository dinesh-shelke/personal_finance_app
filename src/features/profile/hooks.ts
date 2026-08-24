import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useUserId } from '@/features/auth/SessionProvider';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { formatCompact, formatMoney, type FormatMoneyOptions } from '@/utils/money';

/**
 * Profile settings, and the money formatter derived from them.
 *
 * The profile row is created by the signup trigger, but `maybeSingle` is still
 * used: replication lag means the very first read after signup can miss it, and
 * a crash on the first launch is a terrible first impression.
 */

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId),
    staleTime: 5 * 60_000,
  });
}

export type ProfilePatch = Partial<
  Pick<Profile, 'full_name' | 'currency' | 'locale' | 'hide_balances'>
>;

export function useUpdateProfile() {
  const userId = useUserId();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    // Optimistic: the privacy toggle must feel instant, and a settings write is
    // trivially reversible if it fails.
    onMutate: async (patch) => {
      const key = queryKeys.profile(userId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Profile | null>(key);

      if (previous) client.setQueryData<Profile>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous !== undefined) {
        client.setQueryData(queryKeys.profile(userId), context.previous);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
  });
}

/**
 * The one place currency formatting is configured.
 *
 * Screens call `format(amount)` rather than importing `formatMoney` directly,
 * so a user switching from INR to USD updates every number in the app without
 * any screen knowing about it. Falls back to INR/en-IN until the profile loads.
 */
export function useMoneyFormat() {
  const { data: profile } = useProfile();

  const currency = profile?.currency ?? 'INR';
  const locale = profile?.locale ?? 'en-IN';

  const format = useCallback(
    (amount: number | string | null | undefined, options: FormatMoneyOptions = {}) =>
      formatMoney(amount, { currency, locale, ...options }),
    [currency, locale],
  );

  const compact = useCallback(
    (amount: number | null | undefined) => formatCompact(amount, { currency, locale }),
    [currency, locale],
  );

  return {
    format,
    compact,
    currency,
    locale,
    /** Whether the user has asked for balances to be masked by default. */
    hideBalances: profile?.hide_balances ?? false,
  };
}
