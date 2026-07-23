import {
  BS_EPOCH_AD,
  BS_EPOCH_BS,
  BS_MONTH_LENGTHS_BY_YEAR,
  BS_YEAR_MAX,
  BS_YEAR_MIN,
} from '../calendar-data/bs-month-lengths.js';
import type { BsDate, CalendarAdapter, PickerLocale } from '../types.js';

const BS_MONTHS_EN = ['Baisakh', 'Jestha', 'Ashar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const BS_MONTHS_NE = ['बैशाख', 'जेठ', 'अषाढ', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मङ्सिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_NE = ['आ', 'सो', 'मं', 'बु', 'बि', 'शु', 'श'];
const DEVANAGARI_DIGITS: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

function utcDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

function dateFromParts(parts: BsDate): Date {
  return new Date(parts.year, parts.month - 1, parts.day);
}

// Precomputed cumulative day offsets so BS↔AD conversions are O(1)/O(12) lookups
// instead of iterating day-by-day from the epoch. Built once from the vendored
// month-length table at module load.
const YEAR_COUNT = BS_YEAR_MAX - BS_YEAR_MIN + 1;
const MONTH_CUMULATIVE: number[][] = []; // MONTH_CUMULATIVE[yearIndex][m] = days in that year before month m+1
const YEAR_START: number[] = new Array(YEAR_COUNT + 1); // YEAR_START[yearIndex] = days before that year from BS_YEAR_MIN
YEAR_START[0] = 0;
for (let yearIndex = 0; yearIndex < YEAR_COUNT; yearIndex += 1) {
  const row = BS_MONTH_LENGTHS_BY_YEAR[BS_YEAR_MIN + yearIndex];
  const cumulative = [0];
  for (let month = 0; month < 12; month += 1) cumulative.push(cumulative[month] + row[month]);
  MONTH_CUMULATIVE.push(cumulative);
  YEAR_START[yearIndex + 1] = YEAR_START[yearIndex] + cumulative[12];
}
const TOTAL_DAYS = YEAR_START[YEAR_COUNT];

// Absolute day number of a BS date, counting from (BS_YEAR_MIN, 1, 1) === day 0.
function absoluteBsDay(year: number, month: number, day: number): number {
  const yearIndex = year - BS_YEAR_MIN;
  return YEAR_START[yearIndex] + MONTH_CUMULATIVE[yearIndex][month - 1] + (day - 1);
}

const EPOCH_ABSOLUTE = absoluteBsDay(BS_EPOCH_BS.year, BS_EPOCH_BS.month, BS_EPOCH_BS.day);

export class BsAdCalendarAdapter implements CalendarAdapter {
  readonly minSupportedYear = BS_YEAR_MIN;
  readonly maxSupportedYear = BS_YEAR_MAX;

  adToBs(adDate: Date): BsDate {
    this.assertValidAd(adDate);
    const diff = utcDay(adDate) - utcDay(dateFromParts(BS_EPOCH_AD));
    const date = this.bsFromAbsolute(EPOCH_ABSOLUTE + diff);
    this.assertValidBs(date);
    return date;
  }

  bsToAd(year: number, month: number, day: number): Date {
    this.assertValidBs({ year, month, day });
    const diff = absoluteBsDay(year, month, day) - EPOCH_ABSOLUTE;
    const date = dateFromParts(BS_EPOCH_AD);
    date.setDate(date.getDate() + diff);
    return date;
  }

  daysInBsMonth(year: number, month: number): number {
    const row = BS_MONTH_LENGTHS_BY_YEAR[year];
    if (!row || month < 1 || month > 12) {
      throw new RangeError(`Unsupported BS year/month: ${year}-${month}`);
    }
    return row[month - 1];
  }

  todayBs(): BsDate {
    return this.adToBs(new Date());
  }

  bsMonthNames(locale: PickerLocale): string[] {
    return locale === 'ne' ? [...BS_MONTHS_NE] : [...BS_MONTHS_EN];
  }

  bsWeekdayShort(locale: PickerLocale): string[] {
    return locale === 'ne' ? [...WEEKDAYS_NE] : [...WEEKDAYS_EN];
  }

  toLocaleDigits(n: number | string, locale: PickerLocale): string {
    const value = String(n);
    if (locale !== 'ne') return value;
    return value.replace(/[0-9]/g, (digit) => DEVANAGARI_DIGITS[digit] ?? digit);
  }

  // Resolve an absolute day number (from BS_YEAR_MIN,1,1) back to a BS date.
  // Out-of-range inputs yield an out-of-range year so assertValidBs rejects them.
  private bsFromAbsolute(absolute: number): BsDate {
    if (absolute < 0 || absolute >= TOTAL_DAYS) {
      return { year: BS_YEAR_MIN - 1, month: 1, day: 1 };
    }
    let lo = 0;
    let hi = YEAR_COUNT;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (YEAR_START[mid] <= absolute) lo = mid;
      else hi = mid - 1;
    }
    const yearIndex = lo;
    const remaining = absolute - YEAR_START[yearIndex];
    const cumulative = MONTH_CUMULATIVE[yearIndex];
    let month = 1;
    while (month < 12 && cumulative[month] <= remaining) month += 1;
    return { year: BS_YEAR_MIN + yearIndex, month, day: remaining - cumulative[month - 1] + 1 };
  }

  private assertValidAd(adDate: Date): void {
    if (!(adDate instanceof Date) || Number.isNaN(adDate.getTime())) {
      throw new TypeError('Expected a valid AD Date');
    }
  }

  private assertValidBs(date: BsDate): void {
    if (date.year < BS_YEAR_MIN || date.year > BS_YEAR_MAX) {
      throw new RangeError(`BS year ${date.year} is outside supported range ${BS_YEAR_MIN}-${BS_YEAR_MAX}`);
    }
    const maxDay = this.daysInBsMonth(date.year, date.month);
    if (date.day < 1 || date.day > maxDay) {
      throw new RangeError(`Invalid BS date: ${date.year}-${date.month}-${date.day}`);
    }
  }
}

export const defaultCalendarAdapter = new BsAdCalendarAdapter();
