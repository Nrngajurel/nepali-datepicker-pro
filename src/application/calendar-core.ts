// What the date-time and range controllers have in common, written once:
// listeners, calendar navigation (month / year / view, BS↔AD re-anchoring),
// disabled days, typed-date parsing and its canonical text, validation
// messages, and time-of-day stepping. Each controller keeps only what is its
// own (one day + a time, or two ends + presets) and spreads `core.methods`
// into its public object.
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath, pad2 } from '../date-math/native-date-math.js';
import { buildViewMonthCells, clampViewMonth, clampViewYear, firstOfViewMonth, viewYearBounds, viewYearMonthOf } from './calendar-view.js';
import { isDayDisabled, resolveBound } from './constraints.js';
import type { DayConstraints } from './constraints.js';
import { createDayDecorator, resolveUi } from './ui.js';
import type { DayInfo, UiConfig } from './ui.js';
import { createDateValue, dateValueFromBs } from '../domain/date-value.js';
import { formatDateValue } from '../format/index.js';
import type { TypedTokens } from '../format/parse.js';
import { fill } from '../i18n/strings.js';
import type { CalendarAdapter, CalendarMode, CommonPickerOptions, DateMath, DateValue, DayGridOptions, InvalidReason, TimeValue } from '../types.js';

export type CalendarView = 'day' | 'month' | 'year';

/** The view state both controllers carry. */
export interface CalendarViewState {
  isOpen: boolean;
  mode: CalendarMode;
  allowModeToggle: boolean;
  showSecondaryCalendar: boolean;
  viewYear: number;
  viewMonth: number;
  view: CalendarView;
  yearGroupStart: number;
  timeFormat: '12h' | '24h';
  minuteStep: number;
}

/** The options the shared part reads (both pickers have them). */
export type CoreOptions = CommonPickerOptions & DayGridOptions & DayConstraints & {
  adapter?: CalendarAdapter;
  dateMath?: DateMath;
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  showSecondaryCalendar?: boolean;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  withTime?: boolean;
  locale?: unknown;
};

/** Canonical `YYYY-MM-DD` of a day in the given calendar (what the typed field holds). */
export function dayAscii(value: DateValue, mode: CalendarMode): string {
  return mode === 'BS'
    ? `${value.bs.year}-${pad2(value.bs.month)}-${pad2(value.bs.day)}`
    : `${value.ad.getFullYear()}-${pad2(value.ad.getMonth() + 1)}-${pad2(value.ad.getDate())}`;
}

/** Canonical `HH:mm[:ss]`. */
export function timeAscii(time: { hour: number; minute: number; second?: number }, seconds = false): string {
  return `${pad2(time.hour)}:${pad2(time.minute)}${seconds ? `:${pad2(time.second ?? 0)}` : ''}`;
}

// ---- time of day ------------------------------------------------------------

/** Wrap into [0, size), so stepping rolls over (23:00 + 1h → 00:00). */
export const wrap = (value: number, size: number): number => ((value % size) + size) % size;

/** One unit up or down, rolling over; minutes move by `minuteStep`. */
export function stepTime(time: Required<TimeValue>, unit: 'hour' | 'minute' | 'second', delta: number, minuteStep: number): Required<TimeValue> {
  if (unit === 'hour') return { ...time, hour: wrap(time.hour + delta, 24) };
  if (unit === 'minute') return { ...time, minute: wrap(time.minute + delta * minuteStep, 60) };
  return { ...time, second: wrap(time.second + delta, 60) };
}

/** AM ↔ PM: the same clock time twelve hours on. */
export const flipMeridiem = (time: Required<TimeValue>): Required<TimeValue> => ({ ...time, hour: (time.hour + 12) % 24 });

/** The date-time picker's time limits: minTime / maxTime and disabledTimes. */
export function createTimeRules(options: () => { minTime?: TimeValue; maxTime?: TimeValue; disabledTimes?: (hour: number, minute: number) => boolean }, minuteStep: () => number) {
  const bounds = (): { lo: number; hi: number } => {
    const { minTime, maxTime } = options();
    return {
      lo: minTime ? minTime.hour * 60 + (minTime.minute ?? 0) : 0,
      hi: maxTime ? maxTime.hour * 60 + (maxTime.minute ?? 0) : 24 * 60 - 1,
    };
  };
  return {
    /** Keep a time inside minTime / maxTime. */
    clamp(time: Required<TimeValue>): Required<TimeValue> {
      const { lo, hi } = bounds();
      const t = time.hour * 60 + time.minute;
      const clamped = Math.max(lo, Math.min(hi, t));
      return clamped === t ? time : { hour: Math.floor(clamped / 60), minute: clamped % 60, second: time.second };
    },
    // An hour is disabled when it lies entirely outside minTime / maxTime, or
    // when every step-minute in it is rejected by disabledTimes.
    isHourDisabled(hour: number): boolean {
      const { lo, hi } = bounds();
      if (hour * 60 + 59 < lo || hour * 60 > hi) return true;
      const { disabledTimes } = options();
      if (!disabledTimes) return false;
      for (let m = 0; m < 60; m += minuteStep()) if (!disabledTimes(hour, m)) return false;
      return true;
    },
    isMinuteDisabled(hour: number, minute: number): boolean {
      const { lo, hi } = bounds();
      const t = hour * 60 + minute;
      return t < lo || t > hi || (options().disabledTimes?.(hour, minute) ?? false);
    },
  };
}

// ---- the shared controller part --------------------------------------------

export interface CoreHost<S extends CalendarViewState, O extends CoreOptions> {
  options(): O;
  state(): S;
  setState(patch: Partial<S>): void;
  /** Extra state to re-express when the calendar switches BS ↔ AD. */
  reanchor?(nextMode: CalendarMode, previous: S): Partial<S>;
  /** The viewed month changed by navigation. */
  navigated?(year: number, month: number): void;
}

export function createCalendarCore<S extends CalendarViewState, O extends CoreOptions, R>(host: CoreHost<S, O>) {
  const initial = host.options();
  const adapter = initial.adapter ?? defaultCalendarAdapter;
  const dateMath = initial.dateMath ?? nativeDateMath;
  let ui = resolveUi(initial);
  let changeListeners: Array<(value: R) => void> = [];
  let clearListeners: Array<() => void> = [];
  let stateListeners: Array<() => void> = [];
  const decorator = createDayDecorator(() => host.options(), adapter, () => host.setState({}));

  const subscribe = <T>(list: () => T[], set: (next: T[]) => void) => (cb: T): (() => void) => {
    set([...list(), cb]);
    return () => set(list().filter((listener) => listener !== cb));
  };

  // Re-express the viewed month in another calendar, anchored on the same
  // real month, so toggling BS/AD doesn't jump to an unrelated page.
  function reviewInMode(nextMode: CalendarMode): Partial<S> {
    const state = host.state();
    const anchor = firstOfViewMonth(state.mode, adapter, state.viewYear, state.viewMonth);
    const view = viewYearMonthOf(nextMode, adapter, anchor);
    return {
      ...host.reanchor?.(nextMode, state),
      mode: nextMode,
      viewYear: view.year,
      viewMonth: view.month,
      yearGroupStart: clampViewYear(nextMode, adapter, view.year - 6),
    } as Partial<S>;
  }

  const clampYear = (year: number): number => clampViewYear(host.state().mode, adapter, year);

  function goTo(year: number, month: number, extra: Partial<S> = {}): void {
    const view = clampViewMonth(host.state().mode, adapter, year, month);
    host.setState({ ...extra, viewYear: view.year, viewMonth: view.month } as Partial<S>);
    host.navigated?.(view.year, view.month);
  }

  const core = {
    adapter,
    dateMath,
    decorator,
    ui: () => ui,

    /** The month a date falls in, in the active calendar. */
    viewOf: (date: Date) => viewYearMonthOf(host.state().mode, adapter, date),

    /** Call from every setState: tells the renderer to redraw. */
    notifyState(): void {
      stateListeners.forEach((listener) => listener());
    },
    emitChange(value: R): void {
      changeListeners.forEach((listener) => listener(value));
    },
    emitClear(): void {
      clearListeners.forEach((listener) => listener());
    },

    /** One day from typed tokens, honouring the active calendar; null if it doesn't exist. */
    parseDay(tokens: Pick<TypedTokens, 'year' | 'month' | 'day'>): DateValue | null {
      const { year, month, day } = tokens;
      try {
        if (host.state().mode === 'BS') {
          if (year < adapter.minSupportedYear || year > adapter.maxSupportedYear) return null;
          if (month < 1 || month > 12 || day < 1 || day > adapter.daysInBsMonth(year, month)) return null;
          return dateValueFromBs(adapter, { year, month, day });
        }
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        const ad = new Date(year, month - 1, day);
        // Reject calendar overflow (Feb 30 rolling into March).
        if (ad.getFullYear() !== year || ad.getMonth() !== month - 1 || ad.getDate() !== day) return null;
        return createDateValue(adapter, ad);
      } catch {
        return null;
      }
    },

    /** Which constraint a disabled day breaks, for the validation message. */
    disabledReason(value: DateValue): InvalidReason {
      const options = host.options();
      const min = resolveBound(options.minDate, dateMath);
      if (min && value.ad.getTime() < min.getTime()) return 'before-min';
      const max = resolveBound(options.maxDate, dateMath);
      if (max && value.ad.getTime() > max.getTime()) return 'after-max';
      return 'unavailable';
    },

    /** The validation message for the reasons both pickers share. */
    invalidMessage(reason: InvalidReason): string {
      const options = host.options();
      const s = ui.strings;
      const fmt = (bound: Date | string | null | undefined): string => {
        const date = resolveBound(bound, dateMath);
        return date ? formatDateValue(date, adapter, { mode: host.state().mode, format: 'YYYY-MM-DD', locale: options.language === 'ne' ? 'ne' : 'en' }) : '';
      };
      switch (reason) {
        case 'before-min': return fill(s.beforeMin, { date: fmt(options.minDate) });
        case 'after-max': return fill(s.afterMax, { date: fmt(options.maxDate) });
        case 'unavailable': return s.dateUnavailable;
        case 'time-unavailable': return s.timeUnavailable;
        case 'incomplete': return s.incomplete;
        case 'required': return s.required;
        default: return s.invalidDate;
      }
    },

    /** The state keys every picker resolves the same way, for update(). */
    updatePatch(patch: Partial<O>): Partial<S> {
      const options = host.options();
      ui = resolveUi(options);
      const next: Partial<CalendarViewState> = {};
      if ('mode' in patch && (options.mode ?? 'BS') !== host.state().mode) Object.assign(next, reviewInMode(options.mode ?? 'BS'));
      if ('allowModeToggle' in patch) next.allowModeToggle = options.allowModeToggle !== false;
      if ('showSecondaryCalendar' in patch) next.showSecondaryCalendar = options.showSecondaryCalendar !== false;
      if ('timeFormat' in patch) next.timeFormat = options.timeFormat ?? '12h';
      if ('minuteStep' in patch) next.minuteStep = minuteStepOf(options);
      return next as Partial<S>;
    },

    /** Methods both public controllers expose, identically. */
    methods: {
      getAdapter: (): CalendarAdapter => adapter,
      getUi: (): UiConfig => ui,
      getOptions: (): Readonly<O> => host.options(),
      dayInfo: (value: DateValue): DayInfo => decorator.info(value),
      onChange: subscribe(() => changeListeners, (next) => { changeListeners = next; }),
      onClear: subscribe(() => clearListeners, (next) => { clearListeners = next; }),
      onStateChange: subscribe(() => stateListeners, (next) => { stateListeners = next; }),
      destroy(): void {
        changeListeners = [];
        clearListeners = [];
        stateListeners = [];
      },
      navigateMonth(delta: number): void {
        const state = host.state();
        const total = state.viewYear * 12 + (state.viewMonth - 1) + delta;
        goTo(Math.floor(total / 12), (total % 12) + 1);
      },
      navigateYear(delta: number): void {
        const state = host.state();
        goTo(state.viewYear + delta, state.viewMonth);
      },
      navigateYearGroup(delta: number): void {
        host.setState({ yearGroupStart: clampYear(host.state().yearGroupStart + delta * 12) } as Partial<S>);
      },
      setView(view: CalendarView): void {
        host.setState((view === 'year' ? { view, yearGroupStart: clampYear(host.state().viewYear - 6) } : { view }) as Partial<S>);
      },
      selectMonthView(month: number): void {
        goTo(host.state().viewYear, month, { view: 'day' } as Partial<S>);
      },
      selectYearView(year: number): void {
        goTo(clampYear(year), host.state().viewMonth, { view: 'month' } as Partial<S>);
      },
      toggleMode(): void {
        const state = host.state();
        if (state.allowModeToggle) host.setState(reviewInMode(state.mode === 'BS' ? 'AD' : 'BS'));
      },
      isDisabled(value: DateValue): boolean {
        return isDayDisabled(value.ad, host.options(), dateMath) || decorator.isDisabled(value);
      },
      yearBounds(): { min: number; max: number } {
        return viewYearBounds(host.state().mode, adapter);
      },
      cellForBs(year: number, month: number, day: number): DateValue {
        return dateValueFromBs(adapter, { year, month, day });
      },
      buildMonthCells(year: number, month: number): Array<DateValue | null> {
        const cells = buildViewMonthCells(host.state().mode, adapter, dateMath, year, month, ui.weekStartsOn);
        const days = cells.filter((cell): cell is DateValue => !!cell);
        if (days.length) decorator.load(days[0].ad, days[days.length - 1].ad);
        return cells;
      },
    },
  };
  return core;
}

/** The initial view state for a picker opening on `anchor`. */
export function initialViewState(options: CoreOptions, view: { year: number; month: number }): CalendarViewState {
  return {
    isOpen: false,
    mode: options.mode ?? 'BS',
    allowModeToggle: options.allowModeToggle !== false,
    showSecondaryCalendar: options.showSecondaryCalendar !== false,
    viewYear: view.year,
    viewMonth: view.month,
    view: 'day',
    yearGroupStart: view.year - 6,
    timeFormat: options.timeFormat ?? '12h',
    minuteStep: minuteStepOf(options),
  };
}

function minuteStepOf(options: CoreOptions): number {
  return options.minuteStep && options.minuteStep > 0 ? options.minuteStep : 1;
}
