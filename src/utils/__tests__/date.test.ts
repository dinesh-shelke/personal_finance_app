import {
  dayKey,
  dayRange,
  formatFullDate,
  formatMonthTitle,
  formatSectionHeader,
  formatShortDate,
  groupByDay,
  isSameLocalDay,
  monthRange,
  previousMonth,
} from '../date';

describe('monthRange', () => {
  it('spans the whole anchor month', () => {
    const { from, to } = monthRange(new Date(2026, 7, 24, 13, 30));
    expect(new Date(from).getMonth()).toBe(7);
    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(to).getMonth()).toBe(7);
    expect(new Date(to).getDate()).toBe(31);
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
  });

  it('handles February in a leap year', () => {
    const { to } = monthRange(new Date(2028, 1, 10));
    expect(new Date(to).getDate()).toBe(29);
  });
});

describe('dayRange', () => {
  it('covers midnight to end of day', () => {
    const { from, to } = dayRange(new Date(2026, 7, 24, 13, 30));
    expect(new Date(from).getHours()).toBe(0);
    expect(new Date(to).getHours()).toBe(23);
  });
});

describe('previousMonth', () => {
  it('steps back across a year boundary', () => {
    const d = previousMonth(new Date(2026, 0, 15), 1);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(1);
  });
});

describe('formatters', () => {
  const d = new Date(2023, 7, 14, 9, 41);

  it('formats a month title', () => {
    expect(formatMonthTitle(d)).toBe('August 2023');
  });

  it('formats a full date like the reference', () => {
    expect(formatFullDate(d)).toBe('14 August 2023');
  });

  it('formats a short date like the reference history rows', () => {
    expect(formatShortDate(d)).toBe('14 Aug 23');
  });
});

describe('formatSectionHeader', () => {
  it('labels today and yesterday in words', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    expect(formatSectionHeader(now)).toBe('Today');
    expect(formatSectionHeader(yesterday)).toBe('Yesterday');
  });

  it('omits the year for dates in the current year', () => {
    const thisYear = new Date(new Date().getFullYear(), 0, 12);
    expect(formatSectionHeader(thisYear)).toBe('12 January');
  });

  it('includes the year for older dates', () => {
    expect(formatSectionHeader(new Date(2021, 0, 12))).toBe('12 January 2021');
  });
});

describe('dayKey / isSameLocalDay', () => {
  it('keys by local calendar day', () => {
    expect(dayKey(new Date(2026, 7, 24, 23, 59))).toBe('2026-08-24');
  });

  it('treats different times on one day as the same day', () => {
    expect(isSameLocalDay(new Date(2026, 7, 24, 1), new Date(2026, 7, 24, 23))).toBe(true);
    expect(isSameLocalDay(new Date(2026, 7, 24), new Date(2026, 7, 25))).toBe(false);
  });
});

describe('groupByDay', () => {
  type Txn = { id: string; occurred_at: string };
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();

  it('groups into day sections, newest day first', () => {
    const items: Txn[] = [
      { id: 'a', occurred_at: at(2026, 7, 22) },
      { id: 'b', occurred_at: at(2026, 7, 24, 9) },
      { id: 'c', occurred_at: at(2026, 7, 24, 18) },
    ];

    const sections = groupByDay(items, (t) => t.occurred_at);

    expect(sections.map((s) => s.key)).toEqual(['2026-08-24', '2026-08-22']);
    expect(sections[0].data.map((t) => t.id)).toEqual(['b', 'c']);
    expect(sections[1].data.map((t) => t.id)).toEqual(['a']);
  });

  it('preserves input order within a day', () => {
    const items: Txn[] = [
      { id: 'late', occurred_at: at(2026, 7, 24, 20) },
      { id: 'early', occurred_at: at(2026, 7, 24, 6) },
    ];
    const [section] = groupByDay(items, (t) => t.occurred_at);
    expect(section.data.map((t) => t.id)).toEqual(['late', 'early']);
  });

  it('returns an empty array for no items', () => {
    expect(groupByDay([], (t: { occurred_at: string }) => t.occurred_at)).toEqual([]);
  });
});
