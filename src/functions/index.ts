import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import type { BsDate, CalendarAdapter, DateMath } from '../types.js';

function compareBs(a: BsDate, b: BsDate): number {
  return a.year * 10000 + a.month * 100 + a.day - (b.year * 10000 + b.month * 100 + b.day);
}

function makeNepaliFunctions(adapter: CalendarAdapter, dateMath: DateMath) {
  return {
    AD2BS: (d: Date) => adapter.adToBs(d),
    BS2AD: (yearOrDate: number | BsDate, month?: number, day?: number) => {
      const bs = typeof yearOrDate === 'object' ? yearOrDate : { year: yearOrDate, month: month ?? 1, day: day ?? 1 };
      return adapter.bsToAd(bs.year, bs.month, bs.day);
    },
    ConvertToUnicode: (n: number | string) => adapter.toLocaleDigits(n, 'ne'),
    ConvertToNumber: (value: number | string) => String(value).replace(/[०-९]/g, (char) => '०१२३४५६७८९'.indexOf(char).toString()),
    AD: {
      GetCurrentDate: () => new Date(),
      GetCurrentYear: () => new Date().getFullYear(),
      GetCurrentMonth: () => new Date().getMonth() + 1,
      GetCurrentDay: () => new Date().getDate(),
      GetDaysInMonth: (y: number, m: number) => dateMath.daysInMonth(y, m),
      DatesDiff: (a: Date, b: Date) => dateMath.diff(a, b, 'day'),
      AddDays: (d: Date, n: number) => dateMath.add(d, n, 'day'),
      GetFullDate: (d: Date) => dateMath.format(d, 'DD MMMM YYYY'),
    },
    BS: {
      GetCurrentDate: () => adapter.todayBs(),
      GetCurrentYear: () => adapter.todayBs().year,
      GetCurrentMonth: () => adapter.todayBs().month,
      GetCurrentDay: () => adapter.todayBs().day,
      GetDaysInMonth: (y: number, m: number) => adapter.daysInBsMonth(y, m),
      GetMonths: () => adapter.bsMonthNames('en'),
      GetMonthsInUnicode: () => adapter.bsMonthNames('ne'),
      GetDaysUnicodeShort: () => adapter.bsWeekdayShort('ne'),
      ValidateDate: (y: number, m: number, d: number) => {
        try {
          return d >= 1 && d <= adapter.daysInBsMonth(y, m);
        } catch {
          return false;
        }
      },
      IsEqualTo: (a: BsDate, b: BsDate) => compareBs(a, b) === 0,
      IsGreaterThan: (a: BsDate, b: BsDate) => compareBs(a, b) > 0,
      IsLessThan: (a: BsDate, b: BsDate) => compareBs(a, b) < 0,
      IsBetweenDates: (date: BsDate, start: BsDate, end: BsDate, inclusive = false) => {
        const left = compareBs(date, start);
        const right = compareBs(date, end);
        return inclusive ? left >= 0 && right <= 0 : left > 0 && right < 0;
      },
    },
  };
}

export const nepaliFunctions = makeNepaliFunctions(defaultCalendarAdapter, nativeDateMath);
export { makeNepaliFunctions };
