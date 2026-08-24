/**
 * Money helpers.
 *
 * Postgres stores amounts as `numeric(14,2)`, which is exact, and every total
 * the app displays is aggregated in SQL (see the `account_balances` view and
 * `monthly_summary` RPC). PostgREST hands those values to JS as `number`, so
 * any arithmetic we do *here* is float arithmetic and can drift
 * (0.1 + 0.2 !== 0.3).
 *
 * Rule: never use `+` on two money values. Use `sumAmounts`, which converts to
 * integer minor units (paise/cents) first. Everything else in this file only
 * formats or parses.
 */

/** Smallest unit multiplier. Two decimal places covers INR, USD, EUR, GBP. */
const MINOR = 100;

/**
 * 1234.56 -> 123456. Rounds half away from zero, like a cash register.
 *
 * The `toFixed(4)` step is not decoration: `1.005 * 100` evaluates to
 * 100.49999999999999 in binary floating point, so a bare `Math.round` would
 * round a half *down*. Re-reading the product at 4 decimal places snaps it back
 * to 100.5 before rounding. `Math.round` also breaks ties toward +Infinity
 * (`Math.round(-100.5) === -100`), so the sign is applied separately.
 */
export function toMinor(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const scaled = Number((amount * MINOR).toFixed(4));
  return Math.sign(scaled) * Math.round(Math.abs(scaled));
}

/** 123456 -> 1234.56 */
export function fromMinor(minor: number): number {
  return minor / MINOR;
}

/**
 * Exact sum of money values. Converts each to integer paise, adds, converts
 * back — so `sumAmounts([0.1, 0.2])` is exactly `0.3`.
 */
export function sumAmounts(amounts: readonly (number | string | null | undefined)[]): number {
  let totalMinor = 0;
  for (const raw of amounts) {
    if (raw === null || raw === undefined || raw === '') continue;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    if (!Number.isFinite(n)) continue;
    totalMinor += toMinor(n);
  }
  return fromMinor(totalMinor);
}

/** Exact `a - b` for money. */
export function subtractAmounts(a: number, b: number): number {
  return fromMinor(toMinor(a) - toMinor(b));
}

/**
 * How a transaction moves the balance of the account it belongs to.
 * Transfers leave the *net worth* unchanged, so callers that total across all
 * accounts must skip them — see `isBalanceNeutral`.
 */
export type TxnType = 'income' | 'expense' | 'transfer';

/** `income` -> +amount, `expense`/`transfer` (outgoing leg) -> -amount. */
export function signedAmount(type: TxnType, amount: number): number {
  return type === 'income' ? amount : -amount;
}

/** Transfers move money between the user's own accounts; net worth is unchanged. */
export function isBalanceNeutral(type: TxnType): boolean {
  return type === 'transfer';
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale: string, maximumFractionDigits: number) {
  const key = `${locale}|${currency}|${maximumFractionDigits}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    });
    formatterCache.set(key, f);
  }
  return f;
}

export type FormatMoneyOptions = {
  currency?: string;
  locale?: string;
  /** Drop the ".00" tail. Used for chips and axis labels. */
  hideDecimals?: boolean;
  /** Always show a leading + or −. Used in transaction rows. */
  showSign?: boolean;
};

/**
 * `formatMoney(21535)` -> "₹21,535.00" (INR/en-IN default).
 * Note en-IN groups lakhs: 1234567 -> "₹12,34,567.00".
 */
export function formatMoney(
  amount: number | string | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  const { currency = 'INR', locale = 'en-IN', hideDecimals = false, showSign = false } = options;
  const n = typeof amount === 'string' ? Number(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;

  const formatted = getFormatter(currency, locale, hideDecimals ? 0 : 2).format(Math.abs(safe));
  if (!showSign) return safe < 0 ? `-${formatted}` : formatted;
  if (safe < 0) return `\u2212${formatted}`;
  if (safe > 0) return `+${formatted}`;
  return formatted;
}

/** "₹1.2L" / "₹45.3K" for tight spaces like account cards. */
export function formatCompact(
  amount: number | null | undefined,
  options: { currency?: string; locale?: string } = {},
): string {
  const { currency = 'INR', locale = 'en-IN' } = options;
  const n = Number.isFinite(amount as number) ? (amount as number) : 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

/** Bare currency symbol, for the numpad screen where the amount is typed. */
export function currencySymbol(currency = 'INR', locale = 'en-IN'): string {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

/**
 * Parses what the numpad produced. Accepts grouping separators and a single
 * decimal point; rejects anything else. Returns `null` when there is no usable
 * number, so callers can keep the Save button disabled.
 */
export function parseAmountInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s,\u00A0\u202F]/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Clamp to numeric(14,2) and round away sub-paise input.
  return Math.min(fromMinor(toMinor(n)), 999_999_999_999.99);
}

/** Percent change from `previous` to `current`, or null when undefined. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** "2%" / "12.4%" — matches the badge style in the reference. */
export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 10 || Number.isInteger(abs) ? 0 : 1;
  return `${abs.toFixed(digits)}%`;
}
