import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { buildViewMonthCells, clampViewYear, firstOfViewMonth, viewYearBounds, viewYearMonthOf } from './calendar-view.js';
import { isDayDisabled } from './constraints.js';
import { createDateValue, dateValueFromBs } from '../domain/date-value.js';
import { formatDateValue, formatMachineValue } from '../format/index.js';
import { tokenizeTyped } from '../format/parse.js';
import type { CalendarMode, DateTimePickerOptions, DateTimeResult, DateValue, PickerInstance, TimeValue } from '../types.js';

export interface DateTimeControllerState {
  isOpen: boolean;
  mode: CalendarMode;
  allowModeToggle: boolean;
  showSecondaryCalendar: boolean;
  viewYear: number;
  viewMonth: number;
  selected: DateValue | null;
  time: Required<TimeValue> | null;
  view: 'day' | 'month' | 'year';
  yearGroupStart: number;
  timeFormat: '12h' | '24h';
  minuteStep: number;
}

export interface DateTimeController extends PickerInstance<DateTimeResult, DateTimePickerOptions> {
  getState(): DateTimeControllerState;
  /**
   * Accepts a raw AD `Date` (mirrors the `value` option and what framework
   * wrappers hold), a result-shaped `{ ad: Date }` (what `getValue()` returns,
   * so the value round-trips), or `null` to clear.
   */
  setValue(value: Date | DateTimeResult | { ad: Date } | null): void;
  selectDay(value: DateValue): void;
  setTime(hour: number, minute: number, second?: number): void;
  setHour(hour24: number): boolean;
  setMinute(minute: number): boolean;
  stepHour(delta: number): void;
  stepMinute(delta: number): void;
  toggleMeridiem(): void;
  setTimeToNow(): void;
  confirm(): void;
  clear(): void;
  navigateMonth(delta: number): void;
  navigateYear(delta: number): void;
  navigateYearGroup(delta: number): void;
  setView(view: 'day' | 'month' | 'year'): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
  toggleMode(): void;
  isDisabled(value: DateValue): boolean;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedString(): string;
  typedReference(): string;
  yearBounds(): { min: number; max: number };
  isHourDisabled(hour: number): boolean;
  isMinuteDisabled(hour: number, minute: number): boolean;
  cellForBs(year: number, month: number, day: number): DateValue;
  buildMonthCells(year: number, month: number): Array<DateValue | null>;
}

export function createDateTimeController(initialOptions: DateTimePickerOptions = {}): DateTimeController {
  let options = { ...initialOptions };
  const adapter = options.adapter ?? defaultCalendarAdapter;
  let listeners: Array<(value: DateTimeResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  // A value is selected only when `value`/`defaultValue` is explicitly provided;
  // otherwise the field starts empty. The calendar still opens on today's month.
  const providedValue = options.value !== undefined ? options.value : options.defaultValue;
  const initialDate = providedValue ?? new Date();
  const initialValue = createDateValue(adapter, initialDate);
  const defaultTime = options.defaultTime ?? { hour: initialDate.getHours(), minute: initialDate.getMinutes(), second: initialDate.getSeconds() };
  const initialMode: CalendarMode = options.mode ?? 'BS';
  const initialView = viewYearMonthOf(initialMode, adapter, initialValue.ad);

  let state: DateTimeControllerState = {
    isOpen: false,
    mode: initialMode,
    allowModeToggle: options.allowModeToggle !== false,
    showSecondaryCalendar: options.showSecondaryCalendar !== false,
    viewYear: initialView.year,
    viewMonth: initialView.month,
    selected: providedValue ? initialValue : null,
    time: options.withTime ? { hour: defaultTime.hour, minute: defaultTime.minute, second: 0 } : null,
    view: 'day',
    yearGroupStart: initialView.year - 6,
    timeFormat: options.timeFormat ?? '24h',
    minuteStep: options.minuteStep && options.minuteStep > 0 ? options.minuteStep : 1,
  };

  function setState(patch: Partial<DateTimeControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }

  function clampYear(year: number): number {
    return clampViewYear(state.mode, adapter, year);
  }

  // Re-express the currently viewed month in a new mode, anchored on the same
  // real month so toggling BS/AD doesn't jump the calendar to an unrelated page.
  function reviewInMode(nextMode: CalendarMode): Pick<DateTimeControllerState, 'mode' | 'viewYear' | 'viewMonth' | 'yearGroupStart'> {
    const anchor = firstOfViewMonth(state.mode, adapter, state.viewYear, state.viewMonth);
    const view = viewYearMonthOf(nextMode, adapter, anchor);
    return { mode: nextMode, viewYear: view.year, viewMonth: view.month, yearGroupStart: clampViewYear(nextMode, adapter, view.year - 6) };
  }

  // Wrap a value into [0, size) so spinners roll over (23:00 + 1h → 00:00).
  function wrap(value: number, size: number): number {
    return ((value % size) + size) % size;
  }

  // Keep a time within optional minTime/maxTime bounds (absolute, per spec).
  function clampTime(time: Required<TimeValue>): Required<TimeValue> {
    if (!options.minTime && !options.maxTime) return time;
    const minutesOfDay = time.hour * 60 + time.minute;
    const lo = options.minTime ? options.minTime.hour * 60 + (options.minTime.minute ?? 0) : 0;
    const hi = options.maxTime ? options.maxTime.hour * 60 + (options.maxTime.minute ?? 0) : 24 * 60 - 1;
    const clamped = Math.max(lo, Math.min(hi, minutesOfDay));
    if (clamped === minutesOfDay) return time;
    return { hour: Math.floor(clamped / 60), minute: clamped % 60, second: time.second };
  }

  function commitTime(next: Required<TimeValue>): void {
    setState({ time: clampTime(next) });
  }

  // Absolute minute-of-day bounds from minTime/maxTime (per clampTime).
  function timeBounds(): { lo: number; hi: number } {
    const lo = options.minTime ? options.minTime.hour * 60 + (options.minTime.minute ?? 0) : 0;
    const hi = options.maxTime ? options.maxTime.hour * 60 + (options.maxTime.minute ?? 0) : 24 * 60 - 1;
    return { lo, hi };
  }

  // Parse typed text into a concrete DateValue (+ optional time), honouring the
  // active BS/AD mode and all date/time constraints. Returns a status sentinel
  // for blank ('empty') or unparseable/out-of-range/disabled ('invalid') input.
  function parseTyped(text: string): { value: DateValue; time: { hour: number; minute: number } | null } | 'empty' | 'invalid' {
    const tokens = tokenizeTyped(text);
    if (tokens === 'empty') return 'empty';
    if (!tokens) return 'invalid';
    let value: DateValue;
    try {
      if (state.mode === 'BS') {
        if (tokens.year < adapter.minSupportedYear || tokens.year > adapter.maxSupportedYear) return 'invalid';
        if (tokens.month < 1 || tokens.month > 12) return 'invalid';
        if (tokens.day < 1 || tokens.day > adapter.daysInBsMonth(tokens.year, tokens.month)) return 'invalid';
        value = dateValueFromBs(adapter, { year: tokens.year, month: tokens.month, day: tokens.day });
      } else {
        if (tokens.month < 1 || tokens.month > 12 || tokens.day < 1 || tokens.day > 31) return 'invalid';
        const ad = new Date(tokens.year, tokens.month - 1, tokens.day);
        // Reject calendar overflow (e.g. Feb 30 rolling into March).
        if (ad.getFullYear() !== tokens.year || ad.getMonth() !== tokens.month - 1 || ad.getDate() !== tokens.day) return 'invalid';
        value = createDateValue(adapter, ad);
      }
    } catch {
      return 'invalid';
    }
    if (controller.isDisabled(value)) return 'invalid';
    if (options.withTime && tokens.hour != null) {
      if (tokens.hour > 23 || (tokens.minute ?? 0) > 59) return 'invalid';
      return { value, time: { hour: tokens.hour, minute: tokens.minute ?? 0 } };
    }
    return { value, time: null };
  }

  function pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  // Mode-aware canonical ASCII string for a value (+ current time when withTime).
  function toAscii(value: DateValue): string {
    const date = state.mode === 'BS'
      ? `${value.bs.year}-${pad2(value.bs.month)}-${pad2(value.bs.day)}`
      : `${value.ad.getFullYear()}-${pad2(value.ad.getMonth() + 1)}-${pad2(value.ad.getDate())}`;
    if (!options.withTime) return date;
    const now = new Date();
    const t = state.time ?? { hour: now.getHours(), minute: now.getMinutes() };
    return `${date} ${pad2(t.hour)}:${pad2(t.minute)}`;
  }

  // Shared state mutation for preview/commit of a parsed typed value.
  function applyParsed(parsed: { value: DateValue; time: { hour: number; minute: number } | null }): void {
    const view = viewYearMonthOf(state.mode, adapter, parsed.value.ad);
    const patch: Partial<DateTimeControllerState> = {
      selected: parsed.value,
      viewYear: view.year,
      viewMonth: view.month,
    };
    if (parsed.time && state.time) {
      patch.time = clampTime({ hour: parsed.time.hour, minute: parsed.time.minute, second: 0 });
    }
    setState(patch);
  }

  function buildResult(value: DateValue): DateTimeResult {
    const ad = new Date(value.ad);
    if (state.time) ad.setHours(state.time.hour, state.time.minute, state.time.second, 0);
    return {
      ad,
      bs: value.bs,
      time: state.time ?? undefined,
      formatted: formatDateValue(ad, adapter, {
        mode: state.mode,
        format: options.displayFormat ?? (options.withTime
          ? (state.timeFormat === '12h' ? 'YYYY-MM-DD hh:mm A' : 'YYYY-MM-DD HH:mm')
          : 'YYYY-MM-DD'),
        locale: options.locale ?? 'en',
      }),
      value: formatMachineValue({ ad, bs: value.bs, time: state.time ?? undefined }, options.valueFormat ?? 'iso', adapter, !!options.withTime),
    };
  }

  function emit(value: DateValue): void {
    const result = buildResult(value);
    options.onChange?.(result);
    listeners.forEach((listener) => listener(result));
  }

  const controller: DateTimeController = {
    getState: () => state,
    getValue: () => (state.selected ? buildResult(state.selected) : null),
    setValue(value) {
      const ad = value instanceof Date ? value : value?.ad ?? null;
      setState({ selected: ad ? createDateValue(adapter, ad) : null });
    },
    show() {
      if (!state.isOpen) {
        setState({ isOpen: true });
        options.onOpen?.();
      }
    },
    hide() {
      if (state.isOpen) {
        setState({ isOpen: false });
        options.onClose?.();
      }
    },
    update(patch) {
      options = { ...options, ...patch };
      const next: Partial<DateTimeControllerState> = {};
      if ('mode' in patch) {
        const nextMode = options.mode ?? 'BS';
        if (nextMode !== state.mode) Object.assign(next, reviewInMode(nextMode));
      }
      if ('allowModeToggle' in patch) next.allowModeToggle = options.allowModeToggle !== false;
      if ('showSecondaryCalendar' in patch) next.showSecondaryCalendar = options.showSecondaryCalendar !== false;
      if ('timeFormat' in patch) next.timeFormat = options.timeFormat ?? '24h';
      if ('minuteStep' in patch) next.minuteStep = options.minuteStep && options.minuteStep > 0 ? options.minuteStep : 1;
      if (('minTime' in patch || 'maxTime' in patch) && state.time) next.time = clampTime(state.time);
      if ('withTime' in patch) {
        if (options.withTime && !state.time) {
          const now = new Date();
          const dt = options.defaultTime ?? { hour: now.getHours(), minute: now.getMinutes() };
          next.time = { hour: dt.hour, minute: dt.minute, second: 0 };
        } else if (!options.withTime) {
          next.time = null;
        }
      }
      setState(next);
    },
    destroy() {
      listeners = [];
      stateListeners = [];
    },
    onChange(cb) {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((listener) => listener !== cb);
      };
    },
    selectDay(value) {
      if (controller.isDisabled(value)) return;
      const view = viewYearMonthOf(state.mode, adapter, value.ad);
      setState({ selected: value, viewYear: view.year, viewMonth: view.month });
      if (options.closeOnSelect ?? !options.withTime) {
        emit(value);
        controller.hide();
      }
    },
    setTime(hour, minute, second = 0) {
      commitTime({ hour: wrap(hour, 24), minute: wrap(minute, 60), second: wrap(second, 60) });
    },
    // Validated absolute setters for typed entry: reject out-of-range or
    // disabled values (so the field can flag them) instead of wrapping, and
    // skip a redundant re-render when the value is unchanged.
    setHour(hour24) {
      if (!state.time || !Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) return false;
      if (controller.isHourDisabled(hour24)) return false;
      if (state.time.hour !== hour24) commitTime({ ...state.time, hour: hour24 });
      return true;
    },
    setMinute(minute) {
      if (!state.time || !Number.isInteger(minute) || minute < 0 || minute > 59) return false;
      if (controller.isMinuteDisabled(state.time.hour, minute)) return false;
      if (state.time.minute !== minute) commitTime({ ...state.time, minute });
      return true;
    },
    stepHour(delta) {
      if (!state.time) return;
      commitTime({ ...state.time, hour: wrap(state.time.hour + delta, 24) });
    },
    stepMinute(delta) {
      if (!state.time) return;
      commitTime({ ...state.time, minute: wrap(state.time.minute + delta * state.minuteStep, 60) });
    },
    toggleMeridiem() {
      if (!state.time) return;
      const hour = state.time.hour < 12 ? state.time.hour + 12 : state.time.hour - 12;
      commitTime({ ...state.time, hour });
    },
    setTimeToNow() {
      if (!state.time) return;
      const now = new Date();
      commitTime({ hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() });
    },
    confirm() {
      if (state.selected) emit(state.selected);
      controller.hide();
    },
    clear() {
      setState({ selected: null });
    },
    navigateMonth(delta) {
      let year = state.viewYear;
      let month = state.viewMonth + delta;
      while (month > 12) { month -= 12; year += 1; }
      while (month < 1) { month += 12; year -= 1; }
      setState({ viewYear: year, viewMonth: month });
      options.onChangeMonthYear?.(year, month);
    },
    navigateYear(delta) {
      const year = clampYear(state.viewYear + delta);
      setState({ viewYear: year });
      options.onChangeMonthYear?.(year, state.viewMonth);
    },
    navigateYearGroup(delta) {
      setState({ yearGroupStart: clampYear(state.yearGroupStart + delta * 12) });
    },
    setView(view) {
      setState(view === 'year' ? { view, yearGroupStart: clampYear(state.viewYear - 6) } : { view });
    },
    selectMonthView(month) {
      setState({ viewMonth: month, view: 'day' });
      options.onChangeMonthYear?.(state.viewYear, month);
    },
    selectYearView(year) {
      const y = clampYear(year);
      setState({ viewYear: y, view: 'month' });
      options.onChangeMonthYear?.(y, state.viewMonth);
    },
    toggleMode() {
      if (!state.allowModeToggle) return;
      setState(reviewInMode(state.mode === 'BS' ? 'AD' : 'BS'));
    },
    isDisabled(value) {
      return isDayDisabled(value.ad, options, nativeDateMath);
    },
    // Non-mutating check used to flag the input as valid/invalid while typing.
    validateTyped(text) {
      const parsed = parseTyped(text);
      return parsed === 'empty' ? 'empty' : parsed === 'invalid' ? 'invalid' : 'valid';
    },
    // Parse + apply typed text: select the date, sync the calendar view and
    // emit; on blank, clear the selection. Invalid input is a no-op.
    commitTyped(text) {
      const parsed = parseTyped(text);
      if (parsed === 'empty') {
        if (state.selected) setState({ selected: null });
        return 'empty';
      }
      if (parsed === 'invalid') return 'invalid';
      applyParsed(parsed);
      emit(parsed.value);
      return 'valid';
    },
    // Canonical ASCII `YYYY-MM-DD[ HH:mm]` of the current selection (active
    // calendar mode), or '' when nothing is selected — seeds the typed editor.
    typedString() {
      return state.selected ? toAscii(state.selected) : '';
    },
    // Same, but falls back to today when nothing is selected — used to seed a
    // section the first time it is stepped with the arrow keys.
    typedReference() {
      return toAscii(state.selected ?? createDateValue(adapter, new Date()));
    },
    yearBounds() {
      return viewYearBounds(state.mode, adapter);
    },
    // An hour is disabled when it lies entirely outside min/max, or when every
    // step-minute in it is rejected by disabledTimes.
    isHourDisabled(hour) {
      const { lo, hi } = timeBounds();
      if (hour * 60 + 59 < lo || hour * 60 > hi) return true;
      if (options.disabledTimes) {
        const step = state.minuteStep > 0 ? state.minuteStep : 1;
        for (let m = 0; m < 60; m += step) if (!options.disabledTimes(hour, m)) return false;
        return true;
      }
      return false;
    },
    isMinuteDisabled(hour, minute) {
      const { lo, hi } = timeBounds();
      const t = hour * 60 + minute;
      if (t < lo || t > hi) return true;
      return options.disabledTimes?.(hour, minute) ?? false;
    },
    cellForBs(year, month, day) {
      return dateValueFromBs(adapter, { year, month, day });
    },
    buildMonthCells(year, month) {
      return buildViewMonthCells(state.mode, adapter, nativeDateMath, year, month);
    },
  };

  (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange = (cb: () => void) => {
    stateListeners.push(cb);
    return () => {
      stateListeners = stateListeners.filter((listener) => listener !== cb);
    };
  };

  return controller;
}

export { nativeDateMath };
