import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { isDayDisabled } from './constraints.js';
import { createDateValue, dateValueFromBs } from '../domain/date-value.js';
import { formatDateValue } from '../format/index.js';
import type { CalendarMode, DateTimePickerOptions, DateTimeResult, DateValue, PickerInstance, TimeValue } from '../types.js';

export interface DateTimeControllerState {
  isOpen: boolean;
  mode: CalendarMode;
  allowModeToggle: boolean;
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
  selectDay(value: DateValue): void;
  setTime(hour: number, minute: number, second?: number): void;
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
  cellForBs(year: number, month: number, day: number): DateValue;
  buildMonthCells(year: number, month: number): Array<DateValue | null>;
}

export function createDateTimeController(initialOptions: DateTimePickerOptions = {}): DateTimeController {
  let options = { ...initialOptions };
  const adapter = options.adapter ?? defaultCalendarAdapter;
  let listeners: Array<(value: DateTimeResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  const initialDate = options.value ?? options.defaultValue ?? new Date();
  const initialValue = createDateValue(adapter, initialDate);
  const defaultTime = options.defaultTime ?? { hour: initialDate.getHours(), minute: initialDate.getMinutes(), second: initialDate.getSeconds() };

  let state: DateTimeControllerState = {
    isOpen: false,
    mode: options.mode ?? 'BS',
    allowModeToggle: options.allowModeToggle !== false,
    viewYear: initialValue.bs.year,
    viewMonth: initialValue.bs.month,
    selected: options.value === null || options.defaultValue === null ? null : initialValue,
    time: options.withTime ? { hour: defaultTime.hour, minute: defaultTime.minute, second: 0 } : null,
    view: 'day',
    yearGroupStart: initialValue.bs.year - 6,
    timeFormat: options.timeFormat ?? '24h',
    minuteStep: options.minuteStep && options.minuteStep > 0 ? options.minuteStep : 1,
  };

  function setState(patch: Partial<DateTimeControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }

  function clampYear(year: number): number {
    return Math.max(adapter.minSupportedYear, Math.min(adapter.maxSupportedYear, year));
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

  function buildResult(value: DateValue): DateTimeResult {
    const ad = new Date(value.ad);
    if (state.time) ad.setHours(state.time.hour, state.time.minute, state.time.second, 0);
    return {
      ad,
      bs: value.bs,
      time: state.time ?? undefined,
      formatted: formatDateValue(ad, adapter, {
        mode: state.mode,
        format: options.displayFormat ?? (options.withTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'),
        locale: options.locale ?? (state.mode === 'BS' ? 'ne' : 'en'),
      }),
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
      setState({ selected: value ? createDateValue(adapter, value.ad) : null });
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
      if ('mode' in patch) next.mode = options.mode ?? 'BS';
      if ('allowModeToggle' in patch) next.allowModeToggle = options.allowModeToggle !== false;
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
      setState({ selected: value, viewYear: value.bs.year, viewMonth: value.bs.month });
      if (options.closeOnSelect ?? !options.withTime) {
        emit(value);
        controller.hide();
      }
    },
    setTime(hour, minute, second = 0) {
      commitTime({ hour: wrap(hour, 24), minute: wrap(minute, 60), second: wrap(second, 60) });
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
      setState({ mode: state.mode === 'BS' ? 'AD' : 'BS' });
    },
    isDisabled(value) {
      return isDayDisabled(value.ad, options, nativeDateMath);
    },
    cellForBs(year, month, day) {
      return dateValueFromBs(adapter, { year, month, day });
    },
    buildMonthCells(year, month) {
      const days = adapter.daysInBsMonth(year, month);
      const leading = adapter.bsToAd(year, month, 1).getDay();
      const cells: Array<DateValue | null> = Array.from({ length: leading }, () => null);
      for (let day = 1; day <= days; day += 1) cells.push(controller.cellForBs(year, month, day));
      while (cells.length % 7 !== 0) cells.push(null);
      return cells;
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
