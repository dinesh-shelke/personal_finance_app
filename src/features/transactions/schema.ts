import { z } from 'zod';

import type { TransactionType } from '@/types/database';
import { parseAmountInput } from '@/utils/money';

/**
 * Transaction form validation.
 *
 * Mirrors the `transactions_shape` CHECK constraint from the schema, so the
 * user sees "a transfer needs two different accounts" in the form rather than
 * as a database error after tapping Save.
 */

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

export const transactionFormSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),

    /** Raw numpad text; transformed to a positive number here. */
    amount: z.string().transform((raw, ctx) => {
      const parsed = parseAmountInput(raw);
      if (parsed === null) {
        ctx.addIssue({ code: 'custom', message: 'Enter an amount greater than zero.' });
        return z.NEVER;
      }
      return parsed;
    }),

    accountId: z.string().uuid('Choose an account.'),
    categoryId: z.string().uuid().nullable().optional(),
    transferAccountId: z.string().uuid().nullable().optional(),
    occurredAt: z.string().min(1),
    note: z
      .string()
      .max(500, 'Keep the note under 500 characters.')
      .nullable()
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : null)),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'transfer') {
      if (!values.transferAccountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['transferAccountId'],
          message: 'Choose the account the money goes to.',
        });
      } else if (values.transferAccountId === values.accountId) {
        // The DB rejects this too, but the message there is unreadable.
        ctx.addIssue({
          code: 'custom',
          path: ['transferAccountId'],
          message: 'Pick a different destination account.',
        });
      }
    }
    // A category on income/expense stays optional on purpose: the transaction
    // is more valuable recorded as Uncategorised than not recorded at all.
  });

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionFormOutput = z.output<typeof transactionFormSchema>;

/** Blank form state. Expense first — it is by far the most common entry. */
export function emptyTransactionForm(accountId = ''): TransactionFormValues {
  return {
    type: 'expense',
    amount: '',
    accountId,
    categoryId: null,
    transferAccountId: null,
    occurredAt: new Date().toISOString(),
    note: null,
  };
}
