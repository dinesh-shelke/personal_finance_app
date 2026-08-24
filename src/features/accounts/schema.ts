import { z } from 'zod';

import type { AccountType } from '@/types/database';
import { parseAmountInput } from '@/utils/money';

/**
 * Form validation for accounts.
 *
 * Deliberately mirrors the database CHECK constraints in
 * `20260824090000_init_schema.sql` — the schema is the real guard, this just
 * lets the user see the problem before a round trip.
 */

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'wallet-outline' },
  { value: 'bank', label: 'Bank', icon: 'business-outline' },
  { value: 'credit_card', label: 'Credit card', icon: 'card-outline' },
  { value: 'wallet', label: 'Wallet / UPI', icon: 'phone-portrait-outline' },
  { value: 'investment', label: 'Investment', icon: 'stats-chart-outline' },
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Opening balance is the one field where a negative value is legitimate — a
 * credit card starts in debt — so it is parsed separately from
 * `parseAmountInput`, which rejects anything <= 0 for transaction amounts.
 */
const openingBalanceSchema = z
  .string()
  .trim()
  .transform((raw, ctx) => {
    if (raw === '' || raw === '-') return 0;

    const negative = raw.startsWith('-');
    const magnitude = negative ? raw.slice(1) : raw;

    // Zero is valid here even though parseAmountInput rejects it.
    if (/^0*\.?0*$/.test(magnitude.replace(/[\s,]/g, ''))) return 0;

    const parsed = parseAmountInput(magnitude);
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid amount.' });
      return z.NEVER;
    }
    return negative ? -parsed : parsed;
  });

export const accountFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the account a name.')
    .max(60, 'Keep the name under 60 characters.'),
  type: z.enum(['cash', 'bank', 'credit_card', 'wallet', 'investment']),
  openingBalance: openingBalanceSchema,
  color: z.string().regex(HEX_COLOR, 'Pick a colour.'),
  icon: z.string().min(1),
});

export type AccountFormValues = z.input<typeof accountFormSchema>;
export type AccountFormOutput = z.output<typeof accountFormSchema>;

export const accountTypeLabel = (type: AccountType): string =>
  ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;

export const accountTypeIcon = (type: AccountType): string =>
  ACCOUNT_TYPES.find((t) => t.value === type)?.icon ?? 'wallet-outline';
