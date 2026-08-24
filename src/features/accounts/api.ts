import { supabase } from '@/lib/supabase';
import type {
  Account,
  AccountBalance,
  AccountType,
  NetWorth,
  TablesUpdate,
} from '@/types/database';

/**
 * Account data access.
 *
 * Every function throws a plain `Error` on failure so TanStack Query can put
 * the mutation or query into its error state; callers never inspect the raw
 * PostgrestError.
 *
 * Note none of these filter by `user_id` on reads — RLS already does, and
 * adding a redundant filter would hide a policy regression rather than expose
 * it. Writes DO set `user_id` explicitly, because the insert policy's
 * `with check` requires it.
 */

export type AccountInput = {
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  icon: string;
};

/** Raised when the unique (user_id, name) constraint rejects a write. */
export class DuplicateAccountNameError extends Error {
  constructor(name: string) {
    super(`You already have an account called "${name}".`);
    this.name = 'DuplicateAccountNameError';
  }
}

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';

/** Balances for every non-archived account, in the user's chosen order. */
export async function listAccountBalances(): Promise<AccountBalance[]> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Includes archived accounts. For the management screen only. */
export async function listAllAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('is_archived', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAccountBalance(accountId: string): Promise<AccountBalance | null> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Total across all non-archived accounts.
 *
 * The view groups by user, so a user with no accounts produces no row at all —
 * hence `maybeSingle` and the zero fallback rather than a crash on first launch.
 */
export async function getNetWorth(): Promise<NetWorth> {
  const { data, error } = await supabase.from('net_worth').select('*').maybeSingle();

  if (error) throw new Error(error.message);

  return (
    data ?? {
      user_id: null,
      total_balance: 0,
      total_assets: 0,
      total_liabilities: 0,
      account_count: 0,
    }
  );
}

export async function createAccount(userId: string, input: AccountInput): Promise<Account> {
  // New accounts go to the end of the list.
  const { data: last } = await supabase
    .from('accounts')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      type: input.type,
      opening_balance: input.openingBalance,
      color: input.color,
      icon: input.icon,
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new DuplicateAccountNameError(input.name.trim());
    throw new Error(error.message);
  }
  return data;
}

export async function updateAccount(
  accountId: string,
  input: Partial<AccountInput>,
): Promise<Account> {
  // Typed as TablesUpdate so a column renamed in a migration fails the build
  // here rather than silently no-op'ing at runtime.
  const patch: TablesUpdate<'accounts'> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.openingBalance !== undefined) patch.opening_balance = input.openingBalance;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;

  const { data, error } = await supabase
    .from('accounts')
    .update(patch)
    .eq('id', accountId)
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION && input.name) {
      throw new DuplicateAccountNameError(input.name.trim());
    }
    throw new Error(error.message);
  }
  return data;
}

/**
 * Archiving hides an account without touching its transactions, which keeps
 * historical reports intact. This is the safe default — see `deleteAccount`.
 */
export async function setAccountArchived(accountId: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: archived })
    .eq('id', accountId);

  if (error) throw new Error(error.message);
}

/**
 * Permanently deletes an account AND every transaction on it, via the
 * `on delete cascade` foreign keys. Destructive; the UI must confirm with the
 * transaction count first (see `countAccountTransactions`).
 */
export async function deleteAccount(accountId: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw new Error(error.message);
}

/**
 * How many transactions a delete would take with it, counting both the
 * account's own entries and transfers that land in it.
 */
export async function countAccountTransactions(accountId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Persists a drag-to-reorder. Written as one upsert so the list never tears. */
export async function reorderAccounts(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('accounts')
      .update({ sort_order: (index + 1) * 10 })
      .eq('id', id),
  );

  const results = await Promise.all(updates);
  const failure = results.find((r) => r.error);
  if (failure?.error) throw new Error(failure.error.message);
}
