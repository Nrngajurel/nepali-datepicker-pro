// Opt-in sub-export (`nepali-datepicker-pro/holidays`): Nepal's national
// days that fall on a fixed date every year, ready for the `events` option.
//
// Only fixed-date days are included. Festivals that follow the lunar
// calendar (Dashain, Tihar, Holi, Teej, Buddha Jayanti, Chhath, Lhosar, …)
// move every year and are set by the government's annual holiday notice —
// add those yourself and combine both with `mergeEvents`:
//
//   events: nepalFixedHolidays()
//   events: mergeEvents(nepalFixedHolidays(), myFestivalList)
import { defaultCalendarAdapter } from './adapters/bs-ad-calendar-adapter.js';
import type { CalendarAdapter, CalendarEvent, EventsSource } from './types.js';

interface FixedDay {
  calendar: 'BS' | 'AD';
  month: number;
  day: number;
  en: string;
  ne: string;
  type: 'holiday' | 'event';
}

export const NEPAL_FIXED_DAYS: readonly FixedDay[] = [
  { calendar: 'BS', month: 1, day: 1, en: 'Nepali New Year', ne: 'नयाँ वर्ष', type: 'holiday' },
  { calendar: 'BS', month: 1, day: 11, en: 'Loktantra Diwas (Democracy Day)', ne: 'लोकतन्त्र दिवस', type: 'holiday' },
  { calendar: 'AD', month: 5, day: 1, en: 'International Labour Day', ne: 'अन्तर्राष्ट्रिय श्रमिक दिवस', type: 'holiday' },
  { calendar: 'BS', month: 2, day: 15, en: 'Ganatantra Diwas (Republic Day)', ne: 'गणतन्त्र दिवस', type: 'holiday' },
  { calendar: 'BS', month: 6, day: 3, en: 'Constitution Day', ne: 'संविधान दिवस', type: 'holiday' },
  { calendar: 'BS', month: 9, day: 27, en: 'Prithvi Jayanti (National Unity Day)', ne: 'पृथ्वी जयन्ती', type: 'holiday' },
  { calendar: 'AD', month: 12, day: 25, en: 'Christmas Day', ne: 'क्रिसमस', type: 'holiday' },
  { calendar: 'BS', month: 10, day: 16, en: "Martyrs' Day", ne: 'शहीद दिवस', type: 'holiday' },
  { calendar: 'BS', month: 11, day: 7, en: 'Prajatantra Diwas (Democracy Day)', ne: 'प्रजातन्त्र दिवस', type: 'holiday' },
  { calendar: 'AD', month: 3, day: 8, en: "International Women's Day", ne: 'अन्तर्राष्ट्रिय महिला दिवस', type: 'event' },
];

/**
 * Nepal's fixed-date national days for any span the calendar shows, as an
 * `events` loader. `language` picks the label language (default English).
 */
export function nepalFixedHolidays(options: { language?: 'en' | 'ne'; adapter?: CalendarAdapter; holidaysOnly?: boolean } = {}): EventsSource {
  const adapter = options.adapter ?? defaultCalendarAdapter;
  const label = (day: FixedDay) => (options.language === 'ne' ? day.ne : day.en);
  const days = options.holidaysOnly ? NEPAL_FIXED_DAYS.filter((d) => d.type === 'holiday') : NEPAL_FIXED_DAYS;
  return ({ start, end }) => {
    const events: CalendarEvent[] = [];
    const bsFrom = adapter.adToBs(start).year;
    const bsTo = adapter.adToBs(end).year;
    for (let year = bsFrom; year <= bsTo; year += 1) {
      days.filter((d) => d.calendar === 'BS').forEach((d) => events.push({ date: `${year}-${d.month}-${d.day}`, calendar: 'BS', label: label(d), type: d.type }));
    }
    for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
      days.filter((d) => d.calendar === 'AD').forEach((d) => events.push({ date: new Date(year, d.month - 1, d.day), label: label(d), type: d.type }));
    }
    return events;
  };
}

/** Combine event lists and loaders into one `events` source. */
export function mergeEvents(...sources: EventsSource[]): EventsSource {
  return (span) => {
    const parts = sources.map((source) => (typeof source === 'function' ? source(span) : source));
    if (parts.some((part) => part && typeof (part as Promise<CalendarEvent[]>).then === 'function')) {
      return Promise.all(parts).then((lists) => lists.flatMap((list) => list ?? []));
    }
    return (parts as CalendarEvent[][]).flatMap((list) => list ?? []);
  };
}
