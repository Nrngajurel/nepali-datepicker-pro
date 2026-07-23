import type { BsDate, CalendarAdapter, CalendarMode, PickerLocale, ValueFormat } from '../types.js';

const WEEKDAYS_NE = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Token positions are found in one pass over the *original* format string, so
// a resolved value that happens to contain a token-like substring (e.g. the
// month name "Ashwin" starting with the same letter as the "A" meridiem
// token) is never re-scanned and mangled by a later replace pass — unlike
// chained `.replace(token, value)` calls, which corrupted "Ashwin 2083" into
// "AMshwin 2083" once the "A" replace ran over the already-substituted string.
const TOKEN_PATTERN = /YYYY|MMMM|MM|DD|dddd|HH|hh|mm|ss|A/g;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateValue(date: Date, adapter: CalendarAdapter, options: {
  mode?: CalendarMode;
  format?: string;
  locale?: PickerLocale;
} = {}): string {
  const mode = options.mode ?? 'BS';
  const locale = options.locale ?? 'en';
  const format = options.format ?? 'YYYY-MM-DD';
  const hour12 = date.getHours() % 12 || 12;
  const bs = mode === 'BS' ? adapter.adToBs(date) : null;
  const bsMonths = mode === 'BS' ? adapter.bsMonthNames(locale) : null;
  const adMonths = locale === 'ne' ? adapter.bsMonthNames('ne') : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekdays = locale === 'ne' ? WEEKDAYS_NE : WEEKDAYS_EN;
  const raw = format.replace(TOKEN_PATTERN, (token) => {
    switch (token) {
      case 'YYYY': return String(bs ? bs.year : date.getFullYear());
      case 'MMMM': return bs ? (bsMonths![bs.month - 1] ?? String(bs.month)) : (adMonths[date.getMonth()] ?? String(date.getMonth() + 1));
      case 'MM': return pad2(bs ? bs.month : date.getMonth() + 1);
      case 'DD': return pad2(bs ? bs.day : date.getDate());
      case 'dddd': return weekdays[date.getDay()] ?? '';
      case 'HH': return pad2(date.getHours());
      case 'hh': return pad2(hour12);
      case 'mm': return pad2(date.getMinutes());
      case 'ss': return pad2(date.getSeconds());
      case 'A': return date.getHours() >= 12 ? 'PM' : 'AM';
      default: return token;
    }
  });
  return locale === 'ne' ? adapter.toLocaleDigits(raw, locale) : raw;
}

export function parseDateValue(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRange(start: Date, end: Date, adapter: CalendarAdapter, options: {
  mode?: CalendarMode;
  format?: string;
  separator?: string;
  locale?: PickerLocale;
} = {}): string {
  const separator = options.separator ?? ' – ';
  return [
    formatDateValue(start, adapter, options),
    formatDateValue(end, adapter, options),
  ].join(separator);
}

/** Resolve the machine ("server") value for one date, independent of the
 *  display calendar/format. Defaults to AD ISO. Built from local `ad`
 *  components (no `toISOString()` → no timezone shift). */
export function formatMachineValue(
  parts: { ad: Date; bs: BsDate; time?: { hour: number; minute: number; second?: number } },
  format: ValueFormat,
  adapter: CalendarAdapter,
  withTime = false,
): string | number | Date {
  if (typeof format === 'object') {
    return formatDateValue(parts.ad, adapter, { mode: format.calendar, format: format.format, locale: 'en' });
  }
  if (format === 'timestamp') return parts.ad.getTime();
  if (format === 'date-object') return parts.ad;
  const time = withTime && parts.time ? `${pad2(parts.time.hour)}:${pad2(parts.time.minute)}` : '';
  if (format === 'iso-bs') {
    const date = `${parts.bs.year}-${pad2(parts.bs.month)}-${pad2(parts.bs.day)}`;
    return time ? `${date} ${time}` : date;
  }
  // 'iso' (default) — AD ISO from local components.
  const ad = parts.ad;
  const date = `${ad.getFullYear()}-${pad2(ad.getMonth() + 1)}-${pad2(ad.getDate())}`;
  return time ? `${date}T${time}` : date;
}

/** Coerce a machine value into a string for a DOM/form field (Date → AD ISO). */
export function stringifyMachineValue(value: string | number | Date): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  return String(value);
}
