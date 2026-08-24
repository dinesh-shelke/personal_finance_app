import { accountFormSchema, accountTypeIcon, accountTypeLabel } from '../schema';

const base = {
  name: 'HDFC Savings',
  type: 'bank' as const,
  color: '#0B3B4C',
  icon: 'business-outline',
};

function parse(input: Record<string, unknown>) {
  return accountFormSchema.safeParse({ ...base, openingBalance: '', ...input });
}

describe('name', () => {
  it('trims surrounding whitespace', () => {
    const result = parse({ name: '  Cash  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Cash');
  });

  it.each(['', '   '])('rejects a blank name (%p)', (name) => {
    // Mirrors the accounts_name_not_blank CHECK.
    expect(parse({ name }).success).toBe(false);
  });

  it('rejects a name over the 60-character column limit', () => {
    expect(parse({ name: 'x'.repeat(61) }).success).toBe(false);
  });
});

describe('openingBalance', () => {
  it('treats an empty field as zero rather than an error', () => {
    const result = parse({ openingBalance: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(0);
  });

  it('parses a positive balance', () => {
    const result = parse({ openingBalance: '1000.50' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(1000.5);
  });

  it('accepts a NEGATIVE balance — a credit card starts in debt', () => {
    // This is the one place a negative amount is legitimate, which is why
    // openingBalance is not parsed with parseAmountInput (that rejects <= 0).
    const result = parse({ openingBalance: '-12500' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(-12500);
  });

  it('accepts a negative balance with decimals', () => {
    const result = parse({ openingBalance: '-1250.75' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(-1250.75);
  });

  it('accepts an explicit zero', () => {
    const result = parse({ openingBalance: '0' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(0);
  });

  it('treats a lone minus sign mid-typing as zero, not an error', () => {
    const result = parse({ openingBalance: '-' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(0);
  });

  it('strips grouping separators', () => {
    const result = parse({ openingBalance: '1,00,000' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.openingBalance).toBe(100000);
  });

  it.each(['abc', '1.2.3', '10x'])('rejects junk (%p)', (openingBalance) => {
    expect(parse({ openingBalance }).success).toBe(false);
  });
});

describe('color', () => {
  it('accepts a 6-digit hex colour', () => {
    expect(parse({ color: '#12B76A' }).success).toBe(true);
  });

  it.each(['#FFF', 'red', '12B76A', '#GGGGGG'])('rejects %p', (color) => {
    // Mirrors the accounts_color_is_hex CHECK.
    expect(parse({ color }).success).toBe(false);
  });
});

describe('type', () => {
  it.each(['cash', 'bank', 'credit_card', 'wallet', 'investment'])('accepts %p', (type) => {
    expect(parse({ type }).success).toBe(true);
  });

  it('rejects a type outside the enum', () => {
    expect(parse({ type: 'crypto' }).success).toBe(false);
  });
});

describe('labels and icons', () => {
  it('gives every enum value a human label', () => {
    expect(accountTypeLabel('credit_card')).toBe('Credit card');
    expect(accountTypeLabel('cash')).toBe('Cash');
  });

  it('gives every enum value an icon', () => {
    expect(accountTypeIcon('credit_card')).toBe('card-outline');
  });

  it('falls back rather than rendering blank for an unknown value', () => {
    // Guards against a future enum value added in SQL before the UI catches up.
    // @ts-expect-error deliberately outside the union
    expect(accountTypeLabel('crypto')).toBe('crypto');
    // @ts-expect-error deliberately outside the union
    expect(accountTypeIcon('crypto')).toBe('wallet-outline');
  });
});
