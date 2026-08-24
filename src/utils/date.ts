import {
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  isThisYear,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';

/**
 * Date helpers for grouping and filtering transactions.
 *
 * Everything crossing the wire is an ISO string in UTC (`timestamptz`);
 * everything shown to the user is in the device's local zone. Convert at the
 * boundary only — never store a formatted string.
 */

export type DateRange = { from: string; to: string };

export function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

/** Inclusive local-time month bounds as ISO strings, for `.gte()`/`.lte()`. */
export function monthRange(anchor: Date = new Date()): DateRange {
  return {
    from: startOfMonth(anchor).toISOString(),
    to: endOfMonth(anchor).toISOString(),
  };
}

export function dayRange(anchor: Date = new Date()): DateRange {
  return {
    from: startOfDay(anchor).toISOString(),
    to: endOfDay(anchor).toISOString(),
  };
}

/** The same calendar month one year… n months back. Used by the month picker. */
export function previousMonth(anchor: Date, monthsBack = 1): Date {
  return startOfMonth(subMonths(anchor, monthsBack));
}

/** "August 2026" — the month-selector header. */
export function formatMonthTitle(anchor: Date): string {
  return format(anchor, 'MMMM yyyy');
}

/** "14 August 2023" — matches the reference's profile subtitle. */
export function formatFullDate(value: string | Date): string {
  return format(toDate(value), 'd MMMM yyyy');
}

/** "10 Aug 23" — the compact form used in the reference's history rows. */
export function formatShortDate(value: string | Date): string {
  return format(toDate(value), 'd MMM yy');
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), 'h:mm a');
}

/**
 * Section headers for the grouped history list: "Today", "Yesterday",
 * "12 August" within this year, "12 August 2025" otherwise.
 */
export function formatSectionHeader(value: string | Date): string {
  const d = toDate(value);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return isThisYear(d) ? format(d, 'd MMMM') : format(d, 'd MMMM yyyy');
}

/** Stable per-day key (local time) so grouping matches what the user sees. */
export function dayKey(value: string | Date): string {
  return format(toDate(value), 'yyyy-MM-dd');
}

export function isSameLocalDay(a: string | Date, b: string | Date): boolean {
  return isSameDay(toDate(a), toDate(b));
}

/**
 * Groups items into consecutive day sections, newest first, preserving the
 * order within each day. Shaped for React Native's `SectionList`.
 */
export function groupByDay<T>(
  items: readonly T[],
  getDate: (item: T) => string | Date,
): { key: string; title: string; date: Date; data: T[] }[] {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const key = dayKey(getDate(item));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return Array.from(buckets.entries())
    .map(([key, data]) => ({
      key,
      title: formatSectionHeader(getDate(data[0])),
      date: toDate(getDate(data[0])),
      data,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
