import { emptyTransactionForm, transactionFormSchema } from '../schema';

/**
 * These tests mirror the `transactions_shape` CHECK constraint in
 * `20260824090000_init_schema.sql`. If the constraint ever changes, one of
 * these should fail — that is the point. The database is the real guard; the
 * schema exists so the user sees the problem before a round trip.
 */

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const CATEGORY = '33333333-3333-4333-8333-333333333333';

const base = {
  accountId: ACCOUNT_A,
  occurredAt: '2026-08-24T10:00:00.000Z',
  note: null,
};

function issuesFor(input: unknown): { path: string; message: string }[] {
  const result = transactionFormSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((i) => ({
    path: String(i.path[0] ?? ''),
    message: i.message,
  }));
}

describe('emptyTransactionForm', () => {
  it('defaults to expense, the most common entry', () => {
    expect(emptyTransactionForm().type).toBe('expense');
  });

  it('carries the preselected account through', () => {
    expect(emptyTransactionForm(ACCOUNT_A).accountId).toBe(ACCOUNT_A);
  });

  it('starts with no amount so the Save button stays disabled', () => {
    expect(emptyTransactionForm().amount).toBe('');
  });
});

describe('amount', () => {
  it('parses the numpad string into a number', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '1250.50',
      categoryId: CATEGORY,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(1250.5);
  });

  it.each(['', '0', '0.00', 'abc', '-5'])('rejects %p', (amount) => {
    const issues = issuesFor({ ...base, type: 'expense', amount, categoryId: CATEGORY });
    expect(issues.some((i) => i.path === 'amount')).toBe(true);
  });

  it('rounds sub-paise input to two decimals, matching numeric(14,2)', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '10.999',
      categoryId: CATEGORY,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(11);
  });
});

describe('income and expense shape', () => {
  it('accepts a categorised expense', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '500',
      categoryId: CATEGORY,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an UNcategorised expense — better recorded than not at all', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '500',
      categoryId: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts income', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'income',
      amount: '50000',
      categoryId: CATEGORY,
    });
    expect(result.success).toBe(true);
  });

  it('requires an account', () => {
    const issues = issuesFor({ ...base, accountId: '', type: 'expense', amount: '500' });
    expect(issues.some((i) => i.path === 'accountId')).toBe(true);
  });

  it('rejects a non-uuid account id', () => {
    const issues = issuesFor({ ...base, accountId: 'cash', type: 'expense', amount: '500' });
    expect(issues.some((i) => i.path === 'accountId')).toBe(true);
  });
});

describe('transfer shape', () => {
  it('accepts a transfer between two different accounts', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'transfer',
      amount: '2000',
      transferAccountId: ACCOUNT_B,
    });
    expect(result.success).toBe(true);
  });

  it('requires a destination account', () => {
    const issues = issuesFor({
      ...base,
      type: 'transfer',
      amount: '2000',
      transferAccountId: null,
    });
    expect(issues.some((i) => i.path === 'transferAccountId')).toBe(true);
  });

  it('rejects a transfer to the same account', () => {
    // Mirrors `transfer_account_id <> account_id` in the CHECK constraint.
    const issues = issuesFor({
      ...base,
      type: 'transfer',
      amount: '2000',
      transferAccountId: ACCOUNT_A,
    });

    const issue = issues.find((i) => i.path === 'transferAccountId');
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/different/i);
  });
});

describe('note', () => {
  it('trims whitespace', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '500',
      note: '  Lunch with team  ',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('Lunch with team');
  });

  it('normalises a whitespace-only note to null rather than storing blanks', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '500',
      note: '   ',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBeNull();
  });

  it('rejects a note over the 500-character column limit', () => {
    const issues = issuesFor({
      ...base,
      type: 'expense',
      amount: '500',
      note: 'x'.repeat(501),
    });
    expect(issues.some((i) => i.path === 'note')).toBe(true);
  });

  it('accepts a note at exactly the limit', () => {
    const result = transactionFormSchema.safeParse({
      ...base,
      type: 'expense',
      amount: '500',
      note: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
  });
});
