// Forgiving parser for pasted dates. The segmented field only takes keystrokes,
// so a whole date pasted from a spreadsheet, an email or another app goes
// through here: ISO and slashed forms, day-first or month-first per the
// display format, Devanagari digits, and month names in either calendar
// ("15 Ashar 2082", "१५ असार २०८२", "Jun 29 2025", "29 June 2025").
import { GREGORIAN_MONTHS, GREGORIAN_MONTHS_NE } from '../date-math/native-date-math.js';
import type { CalendarAdapter, CalendarMode } from '../types.js';
import { normalizeDigits } from './parse.js';

export interface LooseDate {
  /** The calendar the numbers are in. */
  calendar: CalendarMode;
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

// Alternative spellings people actually type for BS months.
const BS_ALIASES: Record<string, number> = {
  baishakh: 1, baisakh: 1, vaisakh: 1, jeth: 2, jestha: 2, jyestha: 2, asar: 3, ashar: 3, asadh: 3, ashadh: 3, shrawan: 4, saun: 4, sawan: 4,
  bhadra: 5, bhadau: 5, ashwin: 6, asoj: 6, kartik: 7, mangsir: 8, poush: 9, push: 9, magh: 10, falgun: 11, phagun: 11, chaitra: 12, chait: 12,
};

function monthByName(word: string, adapter: CalendarAdapter): { calendar: CalendarMode; month: number } | null {
  const w = word.toLowerCase().replace(/\.$/, '');
  if (!w) return null;
  const bsNe = adapter.bsMonthNames('ne').indexOf(word);
  if (bsNe >= 0) return { calendar: 'BS', month: bsNe + 1 };
  const bsEn = adapter.bsMonthNames('en').findIndex((name) => name.toLowerCase() === w);
  if (bsEn >= 0) return { calendar: 'BS', month: bsEn + 1 };
  if (BS_ALIASES[w]) return { calendar: 'BS', month: BS_ALIASES[w] };
  const adNe = GREGORIAN_MONTHS_NE.indexOf(word);
  if (adNe >= 0) return { calendar: 'AD', month: adNe + 1 };
  const ad = GREGORIAN_MONTHS.findIndex((name) => name.toLowerCase() === w || (w.length >= 3 && name.toLowerCase().startsWith(w)));
  if (ad >= 0) return { calendar: 'AD', month: ad + 1 };
  return null;
}

function parseTime(text: string): { hour: number; minute: number; second?: number } | null {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?/i.exec(text);
  if (!m) return null;
  let hour = Number(m[1]);
  const meridiem = m[4]?.toLowerCase().replace(/\./g, '');
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return { hour, minute: Number(m[2]), ...(m[3] != null ? { second: Number(m[3]) } : {}) };
}

/**
 * Parse one pasted date. `mode` is the picker's calendar (numbers without a
 * month name are taken to be in it); `dayFirst` decides `03/04/2082` when the
 * display format is day-first.
 */
export function parseLooseDate(input: string, opts: { mode: CalendarMode; adapter: CalendarAdapter; dayFirst?: boolean; monthFirst?: boolean }): LooseDate | null {
  const text = normalizeDigits(input).trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const time = parseTime(text);
  const dateText = time ? text.replace(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?/i, ' ').trim() : text;
  const withTime = (date: Omit<LooseDate, 'hour' | 'minute' | 'second'>): LooseDate => ({ ...date, ...(time ?? {}) });

  // Numeric: 2082-03-15, 2082/3/15, 15.03.2082, 03/15/2025 …
  const numeric = /^(\d{1,4})[-/.\s](\d{1,2})[-/.\s](\d{1,4})(?:[T\s].*)?$/.exec(dateText.replace(/T/, ' '));
  if (numeric) {
    const [a, b, c] = [numeric[1], numeric[2], numeric[3]];
    if (a.length === 4) return withTime({ calendar: opts.mode, year: +a, month: +b, day: +c });
    if (c.length === 4) {
      // A value over 12 can only be the day, which settles it; otherwise
      // follow the display format, and default to day-first (as written in Nepal).
      let monthFirst: boolean;
      if (+a > 12 && +b <= 12) monthFirst = false;
      else if (+b > 12 && +a <= 12) monthFirst = true;
      else monthFirst = !!opts.monthFirst && !opts.dayFirst;
      return withTime(monthFirst
        ? { calendar: opts.mode, year: +c, month: +a, day: +b }
        : { calendar: opts.mode, year: +c, month: +b, day: +a });
    }
    return null;
  }

  // With a month name: the name picks the calendar.
  const words = dateText.split(/[\s,]+/).filter(Boolean);
  let named: { calendar: CalendarMode; month: number } | null = null;
  const numbers: string[] = [];
  for (const word of words) {
    if (/^\d+$/.test(word)) numbers.push(word);
    else if (!named) named = monthByName(word.replace(/(st|nd|rd|th)$/i, ''), opts.adapter);
  }
  if (!named || numbers.length !== 2) return null;
  const yearToken = numbers.find((n) => n.length === 4);
  const dayToken = numbers.find((n) => n !== yearToken && n.length <= 2);
  if (!yearToken || !dayToken) return null;
  return withTime({ calendar: named.calendar, year: +yearToken, month: named.month, day: +dayToken });
}

/** The AD Date a loose date names, or null if it isn't a real day. */
export function looseToAd(date: LooseDate, adapter: CalendarAdapter): Date | null {
  try {
    if (date.calendar === 'BS') {
      if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > adapter.daysInBsMonth(date.year, date.month)) return null;
      return adapter.bsToAd(date.year, date.month, date.day);
    }
    const ad = new Date(date.year, date.month - 1, date.day);
    if (ad.getFullYear() !== date.year || ad.getMonth() !== date.month - 1 || ad.getDate() !== date.day) return null;
    return ad;
  } catch {
    return null;
  }
}

/** Split pasted range text into its two ends. */
export function splitLooseRange(input: string): [string, string] | null {
  const text = input.trim();
  for (const sep of [/\s+(?:–|—|to|until|देखि|-)\s+/i, /\s*[–—]\s*/]) {
    const parts = text.split(sep);
    if (parts.length === 2 && parts[0] && parts[1]) return [parts[0], parts[1]];
  }
  return null;
}

/** Parse a pasted month ("2082-03", "03/2082", "Ashar 2082", "असार २०८२",
 *  "June 2025") as a BS year/month. An AD month maps to the BS month its
 *  15th falls in. */
export function parseLooseMonth(input: string, adapter: CalendarAdapter): { year: number; month: number } | null {
  const text = normalizeDigits(input).trim();
  let m = /^(\d{4})[-/.\s](\d{1,2})$/.exec(text);
  if (m) return { year: +m[1], month: +m[2] };
  m = /^(\d{1,2})[-/.\s](\d{4})$/.exec(text);
  if (m) return { year: +m[2], month: +m[1] };
  const words = text.split(/[\s,]+/).filter(Boolean);
  const year = words.find((w) => /^\d{4}$/.test(w));
  const named = words.map((w) => monthByName(w, adapter)).find(Boolean);
  if (!year || !named) return null;
  if (named.calendar === 'BS') return { year: +year, month: named.month };
  try {
    const bs = adapter.adToBs(new Date(+year, named.month - 1, 15));
    return { year: bs.year, month: bs.month };
  } catch {
    return null;
  }
}
