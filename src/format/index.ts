import type { BsDate, CalendarAdapter, CalendarMode, PickerLocale, ValueFormat } from '../types.js';

const WEEKDAYS_NE = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatBsDate(bs: BsDate, adapter: CalendarAdapter, format = 'YYYY-MM-DD', locale: PickerLocale = 'en'): string {
  const months = adapter.bsMonthNames(locale);
  const raw = format
    .replace(/YYYY/g, String(bs.year))
    .replace(/MMMM/g, months[bs.month - 1] ?? String(bs.month))
    .replace(/MM/g, pad2(bs.month))
    .replace(/DD/g, pad2(bs.day));
  return adapter.toLocaleDigits(raw, locale);
}

function applyTimeTokens(raw: string, date: Date): string {
  const hour12 = date.getHours() % 12 || 12;
  return raw
    .replace(/HH/g, pad2(date.getHours()))
    .replace(/hh/g, pad2(hour12))
    .replace(/mm/g, pad2(date.getMinutes()))
    .replace(/ss/g, pad2(date.getSeconds()))
    .replace(/A/g, date.getHours() >= 12 ? 'PM' : 'AM');
}

export function formatDateValue(date: Date, adapter: CalendarAdapter, options: {
  mode?: CalendarMode;
  format?: string;
  locale?: PickerLocale;
} = {}): string {
  const mode = options.mode ?? 'BS';
  const locale = options.locale ?? 'en';
  const format = options.format ?? 'YYYY-MM-DD';
  if (mode === 'BS') {
    const raw = applyTimeTokens(formatBsDate(adapter.adToBs(date), adapter, format, locale), date);
    return locale === 'ne' ? adapter.toLocaleDigits(raw, locale) : raw;
  }
  const weekdays = locale === 'ne' ? WEEKDAYS_NE : WEEKDAYS_EN;
  const months = locale === 'ne' ? adapter.bsMonthNames('ne') : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const raw = applyTimeTokens(format, date)
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/MMMM/g, months[date.getMonth()] ?? String(date.getMonth() + 1))
    .replace(/MM/g, pad2(date.getMonth() + 1))
    .replace(/DD/g, pad2(date.getDate()))
    .replace(/dddd/g, weekdays[date.getDay()] ?? '');
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
