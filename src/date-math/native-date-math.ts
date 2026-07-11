import type { DateMath, DateMathUnit } from '../types.js';

const TOKEN_PATTERN = /YYYY|MMMM|MM|DD|HH|hh|mm|ss|A|dddd/g;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function clone(date: Date): Date {
  return new Date(date.getTime());
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export const nativeDateMath: DateMath = {
  add(date: Date, amount: number, unit: DateMathUnit): Date {
    const next = clone(date);
    if (unit === 'day') next.setDate(next.getDate() + amount);
    if (unit === 'month') next.setMonth(next.getMonth() + amount);
    if (unit === 'year') next.setFullYear(next.getFullYear() + amount);
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
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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
