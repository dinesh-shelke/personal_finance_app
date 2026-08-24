import {
  currencySymbol,
  formatCompact,
  formatMoney,
  formatPercent,
  fromMinor,
  isBalanceNeutral,
  parseAmountInput,
  percentChange,
  signedAmount,
  subtractAmounts,
  sumAmounts,
  toMinor,
} from '../money';

describe('minor-unit conversion', () => {
  it('round-trips a two-decimal amount', () => {
    expect(toMinor(1234.56)).toBe(123456);
    expect(fromMinor(123456)).toBe(1234.56);
  });

  it('rounds half away from zero rather than truncating', () => {
    expect(toMinor(0.005)).toBe(1);
    // 1.005 * 100 is 100.49999999999999 in binary float; a naive Math.round
    // would give 100. The classic 2.675 case has the same shape.
    expect(toMinor(1.005)).toBe(101);
    expect(toMinor(2.675)).toBe(268);
    expect(toMinor(0.145)).toBe(15);
  });

  it('rounds negative halves away from zero too', () => {
    // Math.round(-100.5) is -100, so the sign must be handled separately.
    expect(toMinor(-1.005)).toBe(-101);
    expect(toMinor(-0.005)).toBe(-1);
  });

  it('treats non-finite input as zero instead of producing NaN', () => {
    expect(toMinor(NaN)).toBe(0);
    expect(toMinor(Infinity)).toBe(0);
  });
});

describe('sumAmounts', () => {
  it('is exact where float addition is not', () => {
    // The whole reason this helper exists: 0.1 + 0.2 === 0.30000000000000004
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('does not drift over many additions', () => {
    const hundred = Array.from({ length: 100 }, () => 0.07);
    expect(sumAmounts(hundred)).toBe(7);
  });

  it('accepts the numeric strings PostgREST can return', () => {
    expect(sumAmounts(['1500.50', '2499.50'])).toBe(4000);
  });

  it('skips null, undefined, empty and unparseable entries', () => {
    expect(sumAmounts([100, null, undefined, '', 'abc', 50])).toBe(150);
  });

  it('returns 0 for an empty list', () => {
    expect(sumAmounts([])).toBe(0);
  });

  it('handles mixed signs', () => {
    expect(sumAmounts([1000, -250.25, -749.75])).toBe(0);
  });
});

describe('subtractAmounts', () => {
  it('is exact', () => {
    expect(subtractAmounts(0.3, 0.1)).toBe(0.2);
    expect(subtractAmounts(1000.1, 1000.05)).toBe(0.05);
  });
});

describe('transaction sign conventions', () => {
  it('adds income and deducts expense', () => {
    expect(signedAmount('income', 500)).toBe(500);
    expect(signedAmount('expense', 500)).toBe(-500);
  });

  it('treats a transfer as an outflow from its own account', () => {
    expect(signedAmount('transfer', 500)).toBe(-500);
  });

  it('marks only transfers as net-worth neutral', () => {
    expect(isBalanceNeutral('transfer')).toBe(true);
    expect(isBalanceNeutral('income')).toBe(false);
    expect(isBalanceNeutral('expense')).toBe(false);
  });
});

describe('formatMoney', () => {
  it('formats INR with lakh grouping', () => {
    // en-IN groups 2,2,3 rather than 3,3,3.
    expect(formatMoney(1234567)).toBe('₹12,34,567.00');
  });

  it('formats a plain amount', () => {
    expect(formatMoney(21535)).toBe('₹21,535.00');
  });

  it('can drop decimals', () => {
    expect(formatMoney(21535, { hideDecimals: true })).toBe('₹21,535');
  });

  it('supports other currencies', () => {
    expect(formatMoney(1500, { currency: 'USD', locale: 'en-US' })).toBe('$1,500.00');
  });

  it('shows an explicit sign when asked', () => {
    expect(formatMoney(500, { showSign: true })).toBe('+₹500.00');
    expect(formatMoney(-500, { showSign: true })).toBe('\u2212₹500.00');
    expect(formatMoney(0, { showSign: true })).toBe('₹0.00');
  });

  it('prefixes a minus for negatives when signs are off', () => {
    expect(formatMoney(-500)).toBe('-₹500.00');
  });

  it('coerces null, undefined and NaN to zero rather than rendering "NaN"', () => {
    expect(formatMoney(null)).toBe('₹0.00');
    expect(formatMoney(undefined)).toBe('₹0.00');
    expect(formatMoney(Number.NaN)).toBe('₹0.00');
  });

  it('accepts numeric strings from the database', () => {
    expect(formatMoney('2500.5')).toBe('₹2,500.50');
  });
});

describe('formatCompact', () => {
  it('shortens large amounts', () => {
    expect(formatCompact(120000)).toMatch(/1\.2\s?L/);
  });
});

describe('currencySymbol', () => {
  it('returns the bare symbol', () => {
    expect(currencySymbol('INR', 'en-IN')).toBe('₹');
    expect(currencySymbol('USD', 'en-US')).toBe('$');
  });
});

describe('parseAmountInput', () => {
  it('parses plain and grouped digits', () => {
    expect(parseAmountInput('200')).toBe(200);
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
    expect(parseAmountInput('12 500')).toBe(12500);
  });

  it('rejects empty, zero and negative input', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('.')).toBeNull();
    expect(parseAmountInput('0')).toBeNull();
    expect(parseAmountInput('-5')).toBeNull();
  });

  it('rejects junk', () => {
    expect(parseAmountInput('12a')).toBeNull();
    expect(parseAmountInput('1.2.3')).toBeNull();
    // @ts-expect-error guarding against a non-string slipping through
    expect(parseAmountInput(200)).toBeNull();
  });

  it('rounds sub-paise input to two decimals', () => {
    expect(parseAmountInput('10.999')).toBe(11);
    expect(parseAmountInput('10.994')).toBe(10.99);
  });

  it('accepts a trailing decimal point mid-typing', () => {
    expect(parseAmountInput('12.')).toBe(12);
  });
});

describe('percentChange / formatPercent', () => {
  it('computes change relative to the previous value', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(90, 100)).toBeCloseTo(-10);
  });

  it('returns null when there is no baseline to compare against', () => {
    expect(percentChange(100, 0)).toBeNull();
  });

  it('uses the magnitude of the baseline so a shrinking loss reads as positive', () => {
    expect(percentChange(-50, -100)).toBeCloseTo(50);
  });

  it('formats without a sign and with adaptive precision', () => {
    expect(formatPercent(2)).toBe('2%');
    expect(formatPercent(-1.24)).toBe('1.2%');
    expect(formatPercent(12.35)).toBe('12%');
    expect(formatPercent(null)).toBe('—');
  });
});
