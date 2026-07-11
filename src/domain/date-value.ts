import type { BsDate, CalendarAdapter, DateRange, DateValue } from '../types.js';

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function createDateValue(adapter: CalendarAdapter, adDate: Date): DateValue {
  if (!(adDate instanceof Date) || Number.isNaN(adDate.getTime())) {
    throw new TypeError('DateValue requires a valid Date');
  }
  const ad = startOfLocalDay(adDate);
  return Object.freeze({ ad, bs: adapter.adToBs(ad) });
}

export function dateValueFromBs(adapter: CalendarAdapter, bs: BsDate): DateValue {
  return createDateValue(adapter, adapter.bsToAd(bs.year, bs.month, bs.day));
}

export function compareDateValue(a: DateValue, b: DateValue): number {
  return a.ad.getTime() - b.ad.getTime();
}

export function isSameDateValue(a: DateValue | null | undefined, b: DateValue | null | undefined): boolean {
  return !!a && !!b && a.ad.getTime() === b.ad.getTime();
}

export function createDateRange(start: DateValue, end: DateValue): DateRange {
  return compareDateValue(start, end) <= 0
    ? Object.freeze({ start, end })
    : Object.freeze({ start: end, end: start });
}

export function isWithinRange(range: DateRange, date: DateValue): boolean {
  return date.ad.getTime() >= range.start.ad.getTime() && date.ad.getTime() <= range.end.ad.getTime();
}
