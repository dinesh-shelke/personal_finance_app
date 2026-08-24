/**
 * Numpad keypress reducer.
 *
 * Extracted from the `Numpad` component so the input rules can be tested
 * directly — they are fiddlier than they look (leading zeros, a single decimal
 * point, digit caps) and getting them wrong produces amounts the database
 * rejects with an unreadable constraint error.
 */

export type NumpadKey =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace';

export type NumpadLimits = {
  /** Digits allowed after the decimal point. Matches numeric(14,2). */
  maxDecimals?: number;
  /** Digits allowed before it, keeping the value inside numeric(14,2). */
  maxIntegerDigits?: number;
};

/**
 * Returns the next raw input string, or the current one unchanged when the
 * keypress is not allowed. Never returns an unparseable string.
 */
export function applyNumpadKey(
  value: string,
  key: NumpadKey,
  { maxDecimals = 2, maxIntegerDigits = 12 }: NumpadLimits = {},
): string {
  if (key === 'backspace') {
    return value.slice(0, -1);
  }

  if (key === '.') {
    // One decimal point only, and never as the leading character — "." alone
    // is not a number, so it becomes "0.".
    if (value.includes('.')) return value;
    return value === '' ? '0.' : `${value}.`;
  }

  // A single leading zero is replaced rather than accumulated: tapping 0 then 5
  // should give "5", not "05". "0." is left alone — the user is typing "0.99".
  if (value === '0') return key;

  const [whole = '', decimals] = value.split('.');

  if (decimals !== undefined) {
    if (decimals.length >= maxDecimals) return value;
  } else if (whole.length >= maxIntegerDigits) {
    return value;
  }

  return value + key;
}
