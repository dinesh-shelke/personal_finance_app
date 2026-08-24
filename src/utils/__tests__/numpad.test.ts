import { applyNumpadKey, type NumpadKey } from '../numpad';

/** Types a whole sequence, as a user would. */
function type(keys: string, start = ''): string {
  return keys.split('').reduce((value, key) => applyNumpadKey(value, key as NumpadKey), start);
}

describe('digits', () => {
  it('appends digits in order', () => {
    expect(type('1250')).toBe('1250');
  });

  it('starts from empty', () => {
    expect(applyNumpadKey('', '5')).toBe('5');
  });
});

describe('leading zero', () => {
  it('replaces a lone zero rather than accumulating it', () => {
    // Tapping 0 then 5 must give "5", not "05".
    expect(type('05')).toBe('5');
  });

  it('keeps a zero that is part of a decimal', () => {
    expect(type('0.99')).toBe('0.99');
  });

  it('allows zeros after a nonzero digit', () => {
    expect(type('100')).toBe('100');
  });
});

describe('decimal point', () => {
  it('turns a leading point into "0."', () => {
    expect(applyNumpadKey('', '.')).toBe('0.');
  });

  it('appends a point after digits', () => {
    expect(type('12.')).toBe('12.');
  });

  it('ignores a second decimal point', () => {
    expect(type('12.5.')).toBe('12.5');
    expect(type('1.2.3')).toBe('1.23');
  });
});

describe('decimal digit cap', () => {
  it('accepts exactly two decimal places', () => {
    expect(type('12.34')).toBe('12.34');
  });

  it('ignores a third decimal place, matching numeric(14,2)', () => {
    expect(type('12.345')).toBe('12.34');
  });

  it('honours a custom cap', () => {
    expect(applyNumpadKey('12.3', '4', { maxDecimals: 1 })).toBe('12.3');
  });
});

describe('integer digit cap', () => {
  it('accepts up to the cap', () => {
    expect(type('123456789012')).toBe('123456789012');
  });

  it('ignores digits beyond the cap', () => {
    // A 13th integer digit would overflow numeric(14,2).
    expect(type('1234567890123')).toBe('123456789012');
  });

  it('still allows decimals once the integer part is full', () => {
    const full = '123456789012';
    expect(applyNumpadKey(full, '.')).toBe(`${full}.`);
    expect(applyNumpadKey(`${full}.`, '5')).toBe(`${full}.5`);
  });

  it('honours a custom cap', () => {
    expect(applyNumpadKey('999', '9', { maxIntegerDigits: 3 })).toBe('999');
  });
});

describe('backspace', () => {
  it('removes the last character', () => {
    expect(applyNumpadKey('1250', 'backspace')).toBe('125');
  });

  it('can remove the decimal point', () => {
    expect(applyNumpadKey('12.', 'backspace')).toBe('12');
  });

  it('is a no-op on an empty value rather than throwing', () => {
    expect(applyNumpadKey('', 'backspace')).toBe('');
  });

  it('clears the field when pressed repeatedly', () => {
    expect(type(''.repeat(0), '12')).toBe('12');
    let value = '12.34';
    for (let i = 0; i < 10; i += 1) value = applyNumpadKey(value, 'backspace');
    expect(value).toBe('');
  });

  it('lets a decimal point be re-added after being deleted', () => {
    const afterDelete = applyNumpadKey('12.5', 'backspace'); // "12."
    expect(applyNumpadKey(afterDelete, 'backspace')).toBe('12');
    expect(applyNumpadKey('12', '.')).toBe('12.');
  });
});

describe('every result stays parseable', () => {
  it('never produces a string with two points or a bare point', () => {
    const keys: NumpadKey[] = ['1', '.', '.', '0', '5', '.', '9', 'backspace', '.', '2'];
    let value = '';

    for (const key of keys) {
      value = applyNumpadKey(value, key);
      // '' and trailing '.' are valid intermediate states; anything else must
      // parse as a number.
      if (value !== '' && !value.endsWith('.')) {
        expect(Number.isNaN(Number(value))).toBe(false);
      }
      expect(value.split('.').length).toBeLessThanOrEqual(2);
    }
  });
});
