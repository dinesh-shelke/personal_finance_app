import { supabase } from '@/lib/supabase';
import type {
  CategoryBreakdownRow,
  MonthlySummary,
  Transaction,
  TransactionType,
} from '@/types/database';

/**
 * Transaction data access — the ledger.
 *
 * Reads join the account and category names in a single request (PostgREST
 * embedded resources) so a 50-row history list is one round trip, not 101.
 * RLS applies to the embedded tables too, so a joined row can never leak
 * another user's account name.
 */

/** A transaction with its account and category resolved, as the list shows it. */
export type TransactionWithRelations = Transaction & {
  account: { id: string; name: string; color: string; icon: string } | null;
  category: { id: string; name: string; color: string; icon: string } | null;
  transfer_account: { id: string; name: string; color: string; icon: string } | null;
};

/**
 * The embedded select. Each `!fk_name` disambiguates which foreign key to
 * follow — without it PostgREST cannot tell `account_id` from
 * `transfer_account_id`, since both point at `accounts`.
 */
const SELECT_WITH_RELATIONS = `
  *,
  account:accounts!transactions_account_same_user(id, name, color, icon),
  category:categories!transactions_category_same_user(id, name, color, icon),
  transfer_account:accounts!transactions_transfer_account_same_user(id, name, color, icon)
`;

export type TransactionFilters = {
  /** Inclusive ISO bounds. Usually a month from `monthRange()`. */
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  /** Matched against the note, case-insensitively. */
  search?: string;
};

export type TransactionPage = {
  items: TransactionWithRelations[];
  /** Offset to pass as `cursor` for the next page, or null when exhausted. */
  nextCursor: number | null;
};

export const PAGE_SIZE = 30;

export async function listTransactions(
  filters: TransactionFilters = {},
  cursor = 0,
  pageSize = PAGE_SIZE,
): Promise<TransactionPage> {
  let query = supabase
    .from('transactions')
    .select(SELECT_WITH_RELATIONS)
    // `id` as a tiebreaker keeps paging stable when several rows share a
    // timestamp — without it a row can appear on two pages or on neither.
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(cursor, cursor + pageSize - 1);

  if (filters.from) query = query.gte('occurred_at', filters.from);
  if (filters.to) query = query.lte('occurred_at', filters.to);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.type) query = query.eq('type', filters.type);

  // An account filter must include transfers that land in the account, not just
  // rows it owns, or money arriving there looks like it vanished.
  if (filters.accountId) {
    query = query.or(
      `account_id.eq.${filters.accountId},transfer_account_id.eq.${filters.accountId}`,
    );
  }

  if (filters.search?.trim()) {
    // Escape PostgREST's pattern metacharacters so a user typing "%" searches
    // for a literal percent sign instead of matching everything.
    const escaped = filters.search.trim().replace(/[%_\\]/g, (m) => `\\${m}`);
    query = query.ilike('note', `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items = (data ?? []) as unknown as TransactionWithRelations[];
  return {
    items,
    // A short page means we reached the end.
    nextCursor: items.length < pageSize ? null : cursor + items.length,
  };
}

export async function getTransaction(id: string): Promise<TransactionWithRelations | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT_WITH_RELATIONS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as TransactionWithRelations | null;
}

export type TransactionInput = {
  type: TransactionType;
  amount: number;
  accountId: string;
  /** Required for income/expense, must be absent for a transfer. */
  categoryId?: string | null;
  /** Required for a transfer, must be absent otherwise. */
  transferAccountId?: string | null;
  occurredAt: string;
  note?: string | null;
};

/**
 * Normalises a form value into a row the `transactions_shape` CHECK accepts.
 *
 * Doing this in one place means a user switching the segmented control from
 * Transfer to Expense cannot leave a stale `transfer_account_id` behind and
 * trip a constraint violation they have no way to interpret.
 */
function toRow(userId: string, input: TransactionInput) {
  const isTransfer = input.type === 'transfer';

  return {
    user_id: userId,
    type: input.type,
    amount: input.amount,
    account_id: input.accountId,
    category_id: isTransfer ? null : (input.categoryId ?? null),
    transfer_account_id: isTransfer ? (input.transferAccountId ?? null) : null,
    occurred_at: input.occurredAt,
    note: input.note?.trim() ? input.note.trim() : null,
  };
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(toRow(userId, input))
    .select()
    .single();

  if (error) throw new Error(describeWriteError(error.message));
  return data;
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(toRow(userId, input))
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(describeWriteError(error.message));
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Turns a constraint name into something a person can act on. Raw Postgres
 * text like 'violates check constraint "transactions_shape"' is not a
 * user-facing message.
 */
function describeWriteError(message: string): string {
  if (message.includes('transactions_amount_positive')) {
    return 'The amount must be greater than zero.';
  }
  if (message.includes('transactions_shape')) {
    return 'A transfer needs two different accounts and no category.';
  }
  if (message.includes('transactions_note_length')) {
    return 'The note is too long (500 characters maximum).';
  }
  if (message.includes('transactions_amount_sane')) {
    return 'That amount is too large to record.';
  }
  return message;
}

export async function fetchMonthlySummary(from: string, to: string): Promise<MonthlySummary> {
  const { data, error } = await supabase.rpc('monthly_summary', { p_from: from, p_to: to });
  if (error) throw new Error(error.message);

  // The function returns a set; an empty period yields no rows at all.
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? { income: 0, expense: 0, net: 0, transaction_count: 0 };
}

export async function fetchCategoryBreakdown(
  from: string,
  to: string,
  kind: 'income' | 'expense' = 'expense',
): Promise<CategoryBreakdownRow[]> {
  const { data, error } = await supabase.rpc('category_breakdown', {
    p_from: from,
    p_to: to,
    p_kind: kind,
  });

  if (error) throw new Error(error.message);
  return data ?? [];
}
