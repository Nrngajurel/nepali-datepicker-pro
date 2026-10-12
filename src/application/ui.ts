// Presentation settings the render layer reads from a controller: UI strings,
// the script calendar names/numbers are written in, the week layout, and the
// per-day decorations (dayCellProps / beforeShowDay / events). Kept out of the
// controllers' state machines — they only resolve options into this shape.
import { GREGORIAN_MONTHS_NE, GREGORIAN_MONTHS_SHORT, parseLocalDateString } from '../date-math/native-date-math.js';
import { startOfLocalDay } from '../domain/date-value.js';
import { resolveStrings } from '../i18n/strings.js';
import type { PickerStrings, UiLanguage } from '../i18n/strings.js';
import type {
  BsDate,
  CalendarAdapter,
  CalendarEvent,
  CalendarMode,
  CalendarScript,
  CommonPickerOptions,
  DayCellProps,
  DayGridOptions,
  DateValue,
  PickerDensity,
  PickerLocale,
  PickerTheme,
  RangePickerLocale,
  Weekday,
} from '../types.js';

export interface UiConfig {
  language: UiLanguage;
  strings: PickerStrings;
  script: CalendarScript;
  weekStartsOn: Weekday;
  weekendDays: number[];
  density?: PickerDensity;
  theme?: PickerTheme;
  /** Header labels overriding the built-in weekday names, Sunday first. */
  weekdayLabels?: string[];
  /** Names overriding the active calendar's month names. */
  monthNames?: string[];
}

function toWeekday(value: number | undefined): Weekday {
  return (Number.isInteger(value) && value! >= 0 && value! <= 6 ? value : 0) as Weekday;
}

export function resolveUi(options: CommonPickerOptions & DayGridOptions & { locale?: unknown }): UiConfig {
  // The range picker's daterangepicker-style `locale` block doubles as a
  // shorthand for a few strings and the week start.
  const rangeLocale = options.locale && typeof options.locale === 'object' ? options.locale as RangePickerLocale : undefined;
  const fromLocale: Partial<PickerStrings> = {};
  if (rangeLocale?.applyLabel) fromLocale.apply = rangeLocale.applyLabel;
  if (rangeLocale?.cancelLabel) fromLocale.cancel = rangeLocale.cancelLabel;
  if (rangeLocale?.customRangeLabel) fromLocale.presetCustom = rangeLocale.customRangeLabel;
  return {
    language: options.language ?? 'bilingual',
    strings: resolveStrings(options.language, { ...fromLocale, ...options.strings }),
    script: options.script ?? 'auto',
    weekStartsOn: toWeekday(options.weekStartsOn ?? rangeLocale?.firstDay),
    weekendDays: options.weekendDays ?? [6],
    density: options.density,
    theme: options.theme,
    weekdayLabels: rangeLocale?.daysOfWeek?.length === 7 ? rangeLocale.daysOfWeek : undefined,
    monthNames: rangeLocale?.monthNames?.length === 12 ? rangeLocale.monthNames : undefined,
  };
}

// ---- script ---------------------------------------------------------------

/** Which digit/name set a calendar is written in under `script`. */
export function scriptLocale(calendar: CalendarMode, script: CalendarScript): PickerLocale {
  if (script === 'latin') return 'en';
  if (script === 'devanagari') return 'ne';
  return calendar === 'BS' ? 'ne' : 'en';
}

/** Short month names for a calendar, as shown in headers and month grids. */
export function monthNames(calendar: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, primary: CalendarMode): string[] {
  if (ui.monthNames && calendar === primary) return ui.monthNames;
  const locale = scriptLocale(calendar, ui.script);
  if (calendar === 'BS') return adapter.bsMonthNames(locale);
  return locale === 'ne' ? GREGORIAN_MONTHS_NE : GREGORIAN_MONTHS_SHORT;
}

/** A number written in a calendar's script. */
export function digits(n: number | string, calendar: CalendarMode, adapter: CalendarAdapter, ui: UiConfig): string {
  return adapter.toLocaleDigits(n, scriptLocale(calendar, ui.script));
}

/** `items` (Sunday first) reordered to start on `weekStartsOn`. */
export function rotateWeek<T>(items: T[], weekStartsOn: number): T[] {
  return [...items.slice(weekStartsOn), ...items.slice(0, weekStartsOn)];
}

/** Weekday header labels in display order, plus the weekday each column is. */
export function weekdayColumns(adapter: CalendarAdapter, ui: UiConfig, calendar: CalendarMode): Array<{ label: string; full: string; weekday: number }> {
  const short = ui.weekdayLabels ?? adapter.bsWeekdayShort(scriptLocale(calendar, ui.script));
  const full = scriptLocale(calendar, ui.script) === 'ne' ? WEEKDAYS_NE : WEEKDAYS_EN;
  return rotateWeek([0, 1, 2, 3, 4, 5, 6], ui.weekStartsOn).map((weekday) => ({ label: short[weekday], full: full[weekday], weekday }));
}

export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_NE = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार'];

// ---- day decorations ------------------------------------------------------

export interface DayInfo {
  /** Disabled by dayCellProps / beforeShowDay (constraints are checked separately). */
  disabled: boolean;
  className?: string;
  title?: string;
  badge?: string;
  holiday: boolean;
  weekend: boolean;
  events: CalendarEvent[];
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function eventDay(event: CalendarEvent, adapter: CalendarAdapter): Date | null {
  if (event.date instanceof Date) return Number.isNaN(event.date.getTime()) ? null : startOfLocalDay(event.date);
  if ((event.calendar ?? 'AD') === 'BS') {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(event.date.trim());
    if (!m) return null;
    try {
      return adapter.bsToAd(Number(m[1]), Number(m[2]), Number(m[3]));
    } catch {
      return null;
    }
  }
  const parsed = parseLocalDateString(event.date);
  return parsed ? startOfLocalDay(parsed) : null;
}

export interface DayDecorator {
  info(value: DateValue): DayInfo;
  /** Disabled by dayCellProps / beforeShowDay. */
  isDisabled(value: DateValue): boolean;
  /** Make sure events for the AD span of a shown month are loaded. */
  load(start: Date, end: Date): void;
}

/**
 * Resolves per-day decorations from the live options. A function `events`
 * source is called once per shown month; when it resolves, `notify` re-renders.
 */
export function createDayDecorator(
  getOptions: () => DayGridOptions,
  adapter: CalendarAdapter,
  notify: () => void,
): DayDecorator {
  let indexedSource: unknown = null;
  let index = new Map<string, CalendarEvent[]>();
  const loaded = new Map<string, CalendarEvent[]>();
  const pending = new Set<string>();
  let loadedFor: unknown = null;

  function add(target: Map<string, CalendarEvent[]>, events: CalendarEvent[]): void {
    events.forEach((event) => {
      const day = eventDay(event, adapter);
      if (!day) return;
      const key = dayKey(day);
      const existing = target.get(key) ?? [];
      // Loaders may return more than the month asked for (a whole year, a
      // merged static list); the same event twice is kept once.
      if (existing.some((e) => e.label === event.label && e.type === event.type && e.color === event.color)) return;
      target.set(key, [...existing, event]);
    });
  }

  function staticIndex(): Map<string, CalendarEvent[]> {
    const source = getOptions().events;
    if (source !== indexedSource) {
      indexedSource = source;
      index = new Map();
      if (Array.isArray(source)) add(index, source);
    }
    return index;
  }

  function cellProps(value: DateValue): DayCellProps {
    const options = getOptions();
    const props: DayCellProps = { ...(options.dayCellProps?.(new Date(value.ad), { ...value.bs } as BsDate) ?? {}) };
    if (options.beforeShowDay) {
      const legacy = options.beforeShowDay(new Date(value.ad));
      if (legacy) {
        if (legacy.selectable === false) props.disabled = true;
        if (legacy.cssClass) props.className = [props.className, legacy.cssClass].filter(Boolean).join(' ');
        if (legacy.tooltip && !props.title) props.title = legacy.tooltip;
      }
    }
    return props;
  }

  return {
    info(value) {
      const options = getOptions();
      const key = dayKey(value.ad);
      const events = [...(staticIndex().get(key) ?? []), ...(loaded.get(key) ?? [])];
      const props = cellProps(value);
      const holiday = !!props.holiday || events.some((event) => event.type === 'holiday');
      return {
        disabled: !!props.disabled,
        className: props.className,
        title: [props.title, ...events.map((event) => event.label)].filter(Boolean).join(' · ') || undefined,
        badge: props.badge,
        holiday,
        weekend: (options.weekendDays ?? [6]).includes(value.ad.getDay()),
        events,
      };
    },
    isDisabled(value) {
      const options = getOptions();
      if (!options.dayCellProps && !options.beforeShowDay) return false;
      return !!cellProps(value).disabled;
    },
    load(start, end) {
      const source = getOptions().events;
      if (typeof source !== 'function') return;
      if (source !== loadedFor) {
        // A new loader: forget what the old one returned.
        loadedFor = source;
        loaded.clear();
        pending.clear();
      }
      const key = `${dayKey(start)}|${dayKey(end)}`;
      if (pending.has(key)) return;
      pending.add(key);
      const commit = (events: CalendarEvent[] | null | undefined): void => {
        if (source !== loadedFor || !Array.isArray(events)) return;
        add(loaded, events);
        notify();
      };
      try {
        const result = source({ start: new Date(start), end: new Date(end) });
        if (result && typeof (result as Promise<CalendarEvent[]>).then === 'function') {
          (result as Promise<CalendarEvent[]>).then(commit, () => pending.delete(key));
        } else {
          // Synchronous loaders are indexed now; no re-render needed.
          if (Array.isArray(result)) add(loaded, result);
        }
      } catch {
        pending.delete(key);
      }
    },
  };
}
