import type { DateMath, DateMathUnit } from '../types.js';

const TOKEN_PATTERN = /YYYY|MMMM|MM|DD|HH|hh|mm|ss|A|dddd/g;
export const GREGORIAN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const GREGORIAN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Gregorian month names as written in Nepali. */
export const GREGORIAN_MONTHS_NE = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
const MONTHS = GREGORIAN_MONTHS;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function clone(date: Date): Date {
  return new Date(date.getTime());
}

/** Two digits: 7 → "07". The one copy every layer imports. */
export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `new Date('2025-01-05')` is UTC midnight — the previous day anywhere west of
 *  UTC. A date-only ISO string names a calendar day, so read it as local
 *  midnight; anything else (with a time or zone) goes to the Date parser. */
export function parseLocalDateString(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.getMonth() === Number(m) - 1 ? date : null; // reject 2025-02-30
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const nativeDateMath: DateMath = {
  add(date: Date, amount: number, unit: DateMathUnit): Date {
    const next = clone(date);
    if (unit === 'day') next.setDate(next.getDate() + amount);
    if (unit === 'month' || unit === 'year') {
      // Clamp to the target month's last day: Jan 31 + 1 month is Feb 28/29,
      // not Mar 3 (setMonth overflows) — which also broke endOf('month').
      const day = next.getDate();
      next.setDate(1);
      if (unit === 'month') next.setMonth(next.getMonth() + amount);
      else next.setFullYear(next.getFullYear() + amount);
      next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
    }
    return next;
  },
  diff(a: Date, b: Date): number {
    const left = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const right = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((left - right) / 86400000);
  },
  format(date: Date, format: string): string {
    const hour12 = date.getHours() % 12 || 12;
    return format.replace(TOKEN_PATTERN, (token) => {
      switch (token) {
        case 'YYYY': return String(date.getFullYear());
        case 'MMMM': return MONTHS[date.getMonth()];
        case 'MM': return pad2(date.getMonth() + 1);
        case 'DD': return pad2(date.getDate());
        case 'dddd': return WEEKDAYS[date.getDay()];
        case 'HH': return pad2(date.getHours());
        case 'hh': return pad2(hour12);
        case 'mm': return pad2(date.getMinutes());
        case 'ss': return pad2(date.getSeconds());
        case 'A': return date.getHours() >= 12 ? 'PM' : 'AM';
        default: return token;
      }
    });
  },
  parse(value: Date | string | number): Date | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : clone(value);
    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const relative = value.match(/^([+-])(\d+)([dmy])$/);
    if (value === 'today') return new Date();
    if (relative) {
      const [, sign, rawAmount, rawUnit] = relative;
      const amount = Number(rawAmount) * (sign === '-' ? -1 : 1);
      const unit = rawUnit === 'd' ? 'day' : rawUnit === 'm' ? 'month' : 'year';
      return nativeDateMath.add(new Date(), amount, unit);
    }
    return parseLocalDateString(value);
  },
  startOf(date: Date, unit: DateMathUnit): Date {
    const next = clone(date);
    if (unit === 'year') next.setMonth(0, 1);
    if (unit === 'month') next.setDate(1);
    next.setHours(0, 0, 0, 0);
    return next;
  },
  endOf(date: Date, unit: DateMathUnit): Date {
    const next = nativeDateMath.startOf(nativeDateMath.add(date, 1, unit), unit);
    next.setMilliseconds(-1);
    return next;
  },
  daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  },
};
