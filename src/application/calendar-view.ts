import { createDateValue, dateValueFromBs } from '../domain/date-value.js';
import type { CalendarAdapter, CalendarMode, DateMath, DateValue } from '../types.js';

export interface ViewYearMonth {
  year: number;
  month: number;
}

// Year/month of an AD Date, expressed in whichever calendar the active mode
// navigates — this is what a controller's `viewYear`/`viewMonth` mean.
export function viewYearMonthOf(mode: CalendarMode, adapter: CalendarAdapter, date: Date): ViewYearMonth {
  if (mode === 'AD') return { year: date.getFullYear(), month: date.getMonth() + 1 };
  const bs = adapter.adToBs(date);
  return { year: bs.year, month: bs.month };
}

// AD Date of the 1st of (year, month) as named in the active mode's calendar.
export function firstOfViewMonth(mode: CalendarMode, adapter: CalendarAdapter, year: number, month: number): Date {
  return mode === 'AD' ? new Date(year, month - 1, 1) : adapter.bsToAd(year, month, 1);
}

export function daysInViewMonth(mode: CalendarMode, adapter: CalendarAdapter, dateMath: DateMath, year: number, month: number): number {
  return mode === 'AD' ? dateMath.daysInMonth(year, month) : adapter.daysInBsMonth(year, month);
}

// AD Date of the last day of (year, month) as named in the active mode's calendar.
export function lastOfViewMonth(mode: CalendarMode, adapter: CalendarAdapter, dateMath: DateMath, year: number, month: number): Date {
  const days = daysInViewMonth(mode, adapter, dateMath, year, month);
  return mode === 'AD' ? new Date(year, month - 1, days) : adapter.bsToAd(year, month, days);
}

// Mode-aware year bounds, for clamping navigation and validating typed input.
export function viewYearBounds(mode: CalendarMode, adapter: CalendarAdapter): { min: number; max: number } {
  if (mode === 'BS') return { min: adapter.minSupportedYear, max: adapter.maxSupportedYear };
  return {
    min: adapter.bsToAd(adapter.minSupportedYear, 1, 1).getFullYear() + 1,
    max: adapter.bsToAd(adapter.maxSupportedYear, 1, 1).getFullYear(),
  };
}

export function clampViewYear(mode: CalendarMode, adapter: CalendarAdapter, year: number): number {
  const { min, max } = viewYearBounds(mode, adapter);
  return Math.max(min, Math.min(max, year));
}

export interface MonthSpan {
  start: ViewYearMonth;
  end: ViewYearMonth;
}

// The span of months in the *other* calendar that (year, month) in `mode`
// overlaps. A BS month starts and ends mid-Gregorian-month (and vice versa),
// so a single "anchor" month name undersells what a viewed month actually
// covers — this returns both ends so the UI can show e.g. "April/May".
export function crossCalendarMonthSpan(mode: CalendarMode, adapter: CalendarAdapter, dateMath: DateMath, year: number, month: number): MonthSpan {
  const other: CalendarMode = mode === 'AD' ? 'BS' : 'AD';
  const first = firstOfViewMonth(mode, adapter, year, month);
  const last = lastOfViewMonth(mode, adapter, dateMath, year, month);
  return { start: viewYearMonthOf(other, adapter, first), end: viewYearMonthOf(other, adapter, last) };
}

// Full day-grid for one viewed month, walking the active mode's calendar
// rather than always BS. Always pads to a fixed 6 rows (42 cells) — not just
// to a whole week — so the grid (and the popup around it) doesn't change
// height as you navigate between a 5-row month and a 6-row one.
export function buildViewMonthCells(mode: CalendarMode, adapter: CalendarAdapter, dateMath: DateMath, year: number, month: number): Array<DateValue | null> {
  const days = daysInViewMonth(mode, adapter, dateMath, year, month);
  const leading = firstOfViewMonth(mode, adapter, year, month).getDay();
  const cells: Array<DateValue | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(mode === 'AD' ? createDateValue(adapter, new Date(year, month - 1, day)) : dateValueFromBs(adapter, { year, month, day }));
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}
