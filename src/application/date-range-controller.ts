import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { buildViewMonthCells, clampViewMonth, clampViewYear, firstOfViewMonth, lastOfViewMonth, viewYearBounds, viewYearMonthOf } from './calendar-view.js';
import type { ViewYearMonth } from './calendar-view.js';
import { isDayDisabled, resolveBound } from './constraints.js';
import { createDayDecorator, resolveUi } from './ui.js';
import type { DayInfo, UiConfig } from './ui.js';
import { createDateRange, createDateValue, dateValueFromBs, isSameDateValue, startOfLocalDay } from '../domain/date-value.js';
import { formatRange, formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { normalizeDigits } from '../format/parse.js';
import { fill } from '../i18n/strings.js';
import type { CalendarAdapter, CalendarMode, DateRange, DateRangePickerOptions, DateRangeResult, DateValue, InvalidReason, PickerInstance, PresetContext, PresetDefinition, TimeValue } from '../types.js';
import { normalizePresets } from './presets.js';

export type RangeEnd = 'start' | 'end';

export interface DateRangeControllerState {
  isOpen: boolean;
  mode: CalendarMode;
  allowModeToggle: boolean;
  showSecondaryCalendar: boolean;
  viewYear: number;
  viewMonth: number;
  /** The second month when `numberOfMonths: 2` and `linkedCalendars: false`;
   *  null when it simply follows the first. */
  secondView: ViewYearMonth | null;
  range: DateRange | null;
  pendingStart: DateValue | null;
  hoverDate: DateValue | null;
  activePresetId: string | null;
  openSubmenuId: string | null;
  view: 'day' | 'month' | 'year';
  yearGroupStart: number;
  // Internal: 'month' while the "Pick a Month" preset is active (whole-month
  // selection). Driven by the preset rail, not a public option.
  selectionUnit: 'day' | 'month';
  /** Times of day for the two ends, when `withTime` is on. */
  startTime: Required<TimeValue> | null;
  endTime: Required<TimeValue> | null;
  timeFormat: '12h' | '24h';
  minuteStep: number;
}

export interface DateRangeController extends PickerInstance<DateRangeResult, DateRangePickerOptions> {
  getState(): DateRangeControllerState;
  getPresets(): PresetDefinition[];
  getToday(): DateValue;
  selectDay(value: DateValue): void;
  hoverDay(value: DateValue | null): void;
  selectMonth(year: number, month: number): void;
  isMonthDisabled(year: number, month: number): boolean;
  startMonthSelect(): void;
  navigateMonth(delta: number): void;
  /** Page one of two unlinked months (index 1 is the right-hand one). */
  navigateMonthAt(index: number, delta: number): void;
  navigateYear(delta: number): void;
  navigateYearGroup(delta: number): void;
  setView(view: 'day' | 'month' | 'year'): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
  toggleMode(): void;
  selectPreset(id: string): void;
  selectSubmenuItem(submenuId: string, itemId: string): void;
  toggleSubmenu(id: string): void;
  startCustomRange(): void;
  apply(): void;
  /** Discard changes made since the popup opened, and close it. */
  cancel(): void;
  isDisabled(value: DateValue): boolean;
  /** Whether a day can be clicked right now — false for disabled days and,
   *  while the end is being picked, for days a span limit or a disabled day in
   *  between rules out. */
  isSelectable(value: DateValue): boolean;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedError(text: string): InvalidReason | null;
  invalidMessage(reason: InvalidReason): string;
  /** The calendar adapter in use (the `adapter` option, or the built-in one) — the render layer draws with it. */
  getAdapter(): CalendarAdapter;
  getUi(): UiConfig;
  getOptions(): Readonly<DateRangePickerOptions>;
  dayInfo(value: DateValue): DayInfo;
  /** The months shown, left to right. */
  visibleMonths(): ViewYearMonth[];
  setRangeTime(which: RangeEnd, hour: number, minute: number): boolean;
  stepRangeTime(which: RangeEnd, unit: 'hour' | 'minute', delta: number): void;
  toggleRangeMeridiem(which: RangeEnd): void;
  typedString(): string;
  typedReference(): string;
  yearBounds(): { min: number; max: number };
  cellForBs(year: number, month: number, day: number): DateValue;
  buildMonthCells(year: number, month: number): Array<DateValue | null>;
}

const DAY_MS = 86_400_000;

// Whole days from a to b (local calendar days, DST-safe).
function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()) / DAY_MS);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function createDateRangeController(initialOptions: DateRangePickerOptions = {}): DateRangeController {
  let options = { ...initialOptions };
  const adapter = options.adapter ?? defaultCalendarAdapter;
  const dateMath = options.dateMath ?? nativeDateMath;
  let presets = normalizePresets(options, adapter, dateMath);
  let ui = resolveUi(options);
  let listeners: Array<(value: DateRangeResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  let clearListeners: Array<() => void> = [];
  const decorator = createDayDecorator(() => options, adapter, () => setState({}));
  const today = createDateValue(adapter, new Date());
  // The active calendar, readable before `state` exists (presets resolve
  // while the initial state is being built).
  let currentMode: CalendarMode = options.mode ?? 'BS';
  // A range is shown only when explicitly provided via value/defaultValue, or
  // when a defaultPresetId names a preset. Otherwise the picker starts empty and
  // the calendar just opens on the current month.
  const providedRange = options.value !== undefined ? options.value : options.defaultValue;
  const initialRange = providedRange ?? (options.defaultPresetId ? resolvePresetRange(options.defaultPresetId) : null);
  const viewAnchor = initialRange ?? resolveInitialRange();
  const initialMode: CalendarMode = options.mode ?? 'BS';
  const initialView = anchorView(initialMode, viewAnchor);

  const timeOf = (date: Date | undefined, fallback: Required<TimeValue>): Required<TimeValue> => (
    date ? { hour: date.getHours(), minute: date.getMinutes(), second: 0 } : fallback
  );

  let state: DateRangeControllerState = {
    isOpen: false,
    mode: initialMode,
    allowModeToggle: options.allowModeToggle !== false,
    showSecondaryCalendar: options.showSecondaryCalendar !== false,
    viewYear: initialView.year,
    viewMonth: initialView.month,
    secondView: null,
    range: initialRange ? createDateRange(createDateValue(adapter, initialRange.start), createDateValue(adapter, initialRange.end)) : null,
    pendingStart: null,
    hoverDate: null,
    activePresetId: providedRange ? null : (options.defaultPresetId ?? null),
    openSubmenuId: null,
    view: 'day',
    yearGroupStart: initialView.year - 6,
    selectionUnit: 'day',
    startTime: options.withTime ? timeOf(providedRange?.start, { hour: 0, minute: 0, second: 0 }) : null,
    endTime: options.withTime ? timeOf(providedRange?.end, { hour: 23, minute: 59, second: 0 }) : null,
    timeFormat: options.timeFormat ?? '12h',
    minuteStep: options.minuteStep && options.minuteStep > 0 ? options.minuteStep : 1,
  };

  // What the popup showed when it opened — Cancel goes back to it.
  let snapshot: Pick<DateRangeControllerState, 'range' | 'startTime' | 'endTime' | 'activePresetId' | 'selectionUnit'> | null = null;

  // The month to open on for a range: its end, or with two months the month
  // before the end — unless the whole range fits in the end's month.
  function anchorView(mode: CalendarMode, range: { start: Date; end: Date }): ViewYearMonth {
    const end = viewYearMonthOf(mode, adapter, range.end);
    if ((options.numberOfMonths ?? 1) < 2) return end;
    const start = viewYearMonthOf(mode, adapter, range.start);
    if (start.year === end.year && start.month === end.month) return end;
    return shiftMonth(mode, end, -1);
  }

  function shiftMonth(mode: CalendarMode, from: ViewYearMonth, delta: number): ViewYearMonth {
    const total = from.year * 12 + (from.month - 1) + delta;
    return clampViewMonth(mode, adapter, Math.floor(total / 12), (total % 12) + 1);
  }

  // Mode-aware: "Pick a Month" spans a whole BS month when mode is BS, or a
  // whole Gregorian month when mode is AD — whichever calendar is active.
  const firstOfMonth = (year: number, month: number): DateValue => createDateValue(adapter, firstOfViewMonth(state.mode, adapter, year, month));
  const lastOfMonth = (year: number, month: number): DateValue => createDateValue(adapter, lastOfViewMonth(state.mode, adapter, dateMath, year, month));

  const pad2 = (n: number): string => String(n).padStart(2, '0');

  // Mode-aware ASCII `YYYY-MM-DD[ HH:mm]` for one endpoint.
  function dvToAscii(value: DateValue, time: Required<TimeValue> | null): string {
    const date = state.mode === 'BS'
      ? `${value.bs.year}-${pad2(value.bs.month)}-${pad2(value.bs.day)}`
      : `${value.ad.getFullYear()}-${pad2(value.ad.getMonth() + 1)}-${pad2(value.ad.getDate())}`;
    return options.withTime && time ? `${date} ${pad2(time.hour)}:${pad2(time.minute)}` : date;
  }

  // Build one endpoint from typed parts (mode-aware), or null if impossible.
  function parseTypedDay(year: number, month: number, day: number): DateValue | null {
    try {
      if (state.mode === 'BS') {
        if (year < adapter.minSupportedYear || year > adapter.maxSupportedYear) return null;
        if (month < 1 || month > 12) return null;
        if (day < 1 || day > adapter.daysInBsMonth(year, month)) return null;
        return dateValueFromBs(adapter, { year, month, day });
      }
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      const ad = new Date(year, month - 1, day);
      if (ad.getFullYear() !== year || ad.getMonth() !== month - 1 || ad.getDate() !== day) return null;
      return createDateValue(adapter, ad);
    } catch {
      return null;
    }
  }

  // Which constraint a disabled endpoint breaks.
  function disabledReason(value: DateValue): InvalidReason {
    const min = resolveBound(options.minDate, dateMath);
    if (min && value.ad.getTime() < min.getTime()) return 'before-min';
    const max = resolveBound(options.maxDate, dateMath);
    if (max && value.ad.getTime() > max.getTime()) return 'after-max';
    return 'unavailable';
  }

  // Span and in-between rules for a start → end pair (either order).
  function spanError(a: DateValue, b: DateValue): InvalidReason | null {
    const days = Math.abs(dayDiff(a.ad, b.ad)) + 1;
    if (options.maxRangeSpanDays && days > options.maxRangeSpanDays) return 'span';
    if (options.minRangeSpanDays && days < options.minRangeSpanDays) return 'span';
    if (!options.allowDisabledInRange) {
      const [lo, hi] = a.ad.getTime() <= b.ad.getTime() ? [a.ad, b.ad] : [b.ad, a.ad];
      for (let day = addDays(lo, 1); day.getTime() < startOfLocalDay(hi).getTime(); day = addDays(day, 1)) {
        if (controller.isDisabled(createDateValue(adapter, day))) return 'unavailable';
      }
    }
    return null;
  }

  // Parse `YYYY-MM-DD[ HH:mm] – YYYY-MM-DD[ HH:mm]` into an ordered, allowed range.
  function parseTypedRange(text: string): { range: DateRange; startTime: Required<TimeValue> | null; endTime: Required<TimeValue> | null } | { error: InvalidReason } {
    const day = '(\\d{1,4})-(\\d{1,2})-(\\d{1,2})';
    const time = options.withTime ? '\\s+(\\d{1,2}):(\\d{1,2})' : '';
    const m = new RegExp(`^\\s*${day}${time}\\s+–\\s+${day}${time}\\s*$`).exec(normalizeDigits(text));
    if (!m) return { error: 'invalid' };
    const n = m.slice(1).map(Number);
    const step = options.withTime ? 5 : 3;
    const start = parseTypedDay(n[0], n[1], n[2]);
    const end = parseTypedDay(n[step], n[step + 1], n[step + 2]);
    if (!start || !end) return { error: 'invalid' };
    if (controller.isDisabled(start)) return { error: disabledReason(start) };
    if (controller.isDisabled(end)) return { error: disabledReason(end) };
    const span = spanError(start, end);
    if (span) return { error: span };
    let startTime: Required<TimeValue> | null = null;
    let endTime: Required<TimeValue> | null = null;
    if (options.withTime) {
      if (n[3] > 23 || n[4] > 59 || n[8] > 23 || n[9] > 59) return { error: 'invalid' };
      startTime = { hour: n[3], minute: n[4], second: 0 };
      endTime = { hour: n[8], minute: n[9], second: 0 };
    }
    const range = createDateRange(start, end);
    // createDateRange orders the ends; keep each time with its own end.
    if (range.start !== start) [startTime, endTime] = [endTime, startTime];
    return { range, startTime, endTime };
  }

  function clampYear(year: number): number {
    return clampViewYear(state.mode, adapter, year);
  }

  // Re-express the currently viewed month in a new mode, anchored on the same
  // real month so toggling BS/AD doesn't jump the calendar to an unrelated page.
  function reviewInMode(nextMode: CalendarMode): Pick<DateRangeControllerState, 'mode' | 'viewYear' | 'viewMonth' | 'yearGroupStart' | 'secondView'> {
    const anchor = firstOfViewMonth(state.mode, adapter, state.viewYear, state.viewMonth);
    const view = viewYearMonthOf(nextMode, adapter, anchor);
    const second = state.secondView ? viewYearMonthOf(nextMode, adapter, firstOfViewMonth(state.mode, adapter, state.secondView.year, state.secondView.month)) : null;
    return { mode: nextMode, viewYear: view.year, viewMonth: view.month, yearGroupStart: clampViewYear(nextMode, adapter, view.year - 6), secondView: second };
  }

  function presetContext(): PresetContext {
    return { today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath, mode: currentMode, weekStartsOn: ui.weekStartsOn };
  }

  function resolveInitialRange(): { start: Date; end: Date } {
    const firstRange = presets.find((preset) => preset.kind === 'range' && preset.resolve);
    return firstRange?.resolve?.(presetContext()) ?? { start: new Date(), end: new Date() };
  }

  // Resolve a named preset (top-level or submenu item) to its range, or null.
  function resolvePresetRange(id: string): { start: Date; end: Date } | null {
    const find = (list: PresetDefinition[]): PresetDefinition | null => {
      for (const preset of list) {
        if (preset.id === id && preset.resolve) return preset;
        const nested = preset.items ? find(preset.items) : null;
        if (nested) return nested;
      }
      return null;
    };
    const preset = find(presets);
    if (!preset?.resolve) return null;
    const r = preset.resolve(presetContext());
    return { start: r.start, end: r.end };
  }

  function setState(patch: Partial<DateRangeControllerState>): void {
    state = { ...state, ...patch };
    currentMode = state.mode;
    stateListeners.forEach((listener) => listener());
  }

  function withTimeOf(date: Date, time: Required<TimeValue> | null): Date {
    const out = new Date(date);
    if (time) out.setHours(time.hour, time.minute, 0, 0);
    return out;
  }

  function toResult(range: DateRange): DateRangeResult {
    const vf = options.valueFormat ?? 'iso';
    const withTime = !!options.withTime;
    const start = withTimeOf(range.start.ad, withTime ? state.startTime : null);
    const end = withTimeOf(range.end.ad, withTime ? state.endTime : null);
    const startValue = formatMachineValue({ ad: start, bs: range.start.bs, time: state.startTime ?? undefined }, vf, adapter, withTime);
    const endValue = formatMachineValue({ ad: end, bs: range.end.bs, time: state.endTime ?? undefined }, vf, adapter, withTime);
    const timeFormat = state.timeFormat === '12h' ? ' hh:mm A' : ' HH:mm';
    return {
      start,
      end,
      startBs: range.start.bs,
      endBs: range.end.bs,
      formatted: formatRange(start, end, adapter, {
        mode: state.mode,
        format: options.displayFormat ?? options.locale?.format ?? `YYYY-MM-DD${withTime ? timeFormat : ''}`,
        separator: options.locale?.separator,
        locale: options.language === 'ne' ? 'ne' : 'en',
      }),
      startValue,
      endValue,
      value: `${stringifyMachineValue(startValue)},${stringifyMachineValue(endValue)}`,
    };
  }

  function emit(range: DateRange): void {
    const result = toResult(range);
    options.onApply?.(result);
    listeners.forEach((listener) => listener(result));
  }

  // Shared by quick presets and submenu items (fiscal years): resolve against
  // today, trim to minDate/maxDate (a preset reaching past a bound is cut to
  // it; one entirely outside is ignored), select it and report the change.
  function applyPreset(preset: PresetDefinition | undefined, activeId: string): void {
    if (!preset?.resolve) return;
    const resolved = preset.resolve(presetContext());
    const min = resolveBound(options.minDate, dateMath);
    const max = resolveBound(options.maxDate, dateMath);
    const start = min && resolved.start.getTime() < min.getTime() ? min : resolved.start;
    const end = max && resolved.end.getTime() > max.getTime() ? max : resolved.end;
    if (start.getTime() > end.getTime()) return;
    const range = createDateRange(createDateValue(adapter, start), createDateValue(adapter, end));
    const view = anchorView(state.mode, { start: range.start.ad, end: range.end.ad });
    setState({ range, activePresetId: activeId, selectionUnit: 'day', pendingStart: null, hoverDate: null, viewYear: view.year, viewMonth: view.month, secondView: null, openSubmenuId: null });
    options.onChange?.({ start: range.start.ad, end: range.end.ad });
  }

  // While the end is being picked: the first and last day it can be, from
  // the span limits and (unless allowed) the nearest disabled day each way.
  // Cached per pending start, as every cell asks.
  let boundsCache: { key: number; lo: number; hi: number } | null = null;
  function pendingBounds(start: DateValue): { lo: number; hi: number } {
    const key = start.ad.getTime();
    if (boundsCache?.key === key) return boundsCache;
    const maxSpan = options.maxRangeSpanDays ?? null;
    const reach = maxSpan ? maxSpan - 1 : 3660;
    let lo = addDays(start.ad, -reach).getTime();
    let hi = addDays(start.ad, reach).getTime();
    // Only min/max can disable a day: the bounds are those, no day-by-day walk.
    const onlyBounds = !options.disabledDates && !options.disabledWeekdays?.length && !options.dayCellProps && !options.beforeShowDay;
    if (onlyBounds) {
      const min = resolveBound(options.minDate, dateMath);
      const max = resolveBound(options.maxDate, dateMath);
      if (min) lo = Math.max(lo, min.getTime());
      if (max) hi = Math.min(hi, max.getTime());
    } else if (!options.allowDisabledInRange) {
      for (let i = 1; i <= reach; i += 1) {
        const day = addDays(start.ad, -i);
        if (controller.isDisabled(createDateValue(adapter, day))) { lo = addDays(day, 1).getTime(); break; }
      }
      for (let i = 1; i <= reach; i += 1) {
        const day = addDays(start.ad, i);
        if (controller.isDisabled(createDateValue(adapter, day))) { hi = addDays(day, -1).getTime(); break; }
      }
    }
    boundsCache = { key, lo, hi };
    return boundsCache;
  }

  function clampRangeTime(time: Required<TimeValue>): Required<TimeValue> {
    return { hour: ((time.hour % 24) + 24) % 24, minute: ((time.minute % 60) + 60) % 60, second: 0 };
  }

  const timeKey = (which: RangeEnd): 'startTime' | 'endTime' => (which === 'start' ? 'startTime' : 'endTime');

  const controller: DateRangeController = {
    getState: () => state,
    getAdapter: () => adapter,
    getUi: () => ui,
    getOptions: () => options,
    dayInfo: (value) => decorator.info(value),
    getPresets: () => presets,
    getToday: () => today,
    getValue: () => (state.range ? toResult(state.range) : null),
    setValue(value) {
      setState({
        range: value ? createDateRange(createDateValue(adapter, value.start), createDateValue(adapter, value.end)) : null,
        pendingStart: null,
        hoverDate: null,
        ...(options.withTime && value ? { startTime: timeOf(value.start, state.startTime!), endTime: timeOf(value.end, state.endTime!) } : {}),
      });
    },
    show() {
      if (!state.isOpen) {
        snapshot = { range: state.range, startTime: state.startTime, endTime: state.endTime, activePresetId: state.activePresetId, selectionUnit: state.selectionUnit };
        setState({ isOpen: true });
        options.onOpen?.();
      }
    },
    hide() {
      if (state.isOpen) {
        setState({ isOpen: false, pendingStart: null, hoverDate: null, openSubmenuId: null });
        options.onClose?.();
      }
    },
    cancel() {
      if (snapshot) setState({ ...snapshot, pendingStart: null, hoverDate: null });
      snapshot = null;
      options.onCancel?.();
      controller.hide();
    },
    update(patch) {
      options = { ...options, ...patch };
      ui = resolveUi(options);
      boundsCache = null;
      presets = normalizePresets(options, adapter, dateMath);
      const next: Partial<DateRangeControllerState> = {};
      if ('mode' in patch) {
        const nextMode = options.mode ?? 'BS';
        if (nextMode !== state.mode) Object.assign(next, reviewInMode(nextMode));
      }
      if ('allowModeToggle' in patch) next.allowModeToggle = options.allowModeToggle !== false;
      if ('showSecondaryCalendar' in patch) next.showSecondaryCalendar = options.showSecondaryCalendar !== false;
      if ('timeFormat' in patch) next.timeFormat = options.timeFormat ?? '12h';
      if ('minuteStep' in patch) next.minuteStep = options.minuteStep && options.minuteStep > 0 ? options.minuteStep : 1;
      if ('linkedCalendars' in patch || 'numberOfMonths' in patch) next.secondView = null;
      if ('withTime' in patch) {
        next.startTime = options.withTime ? state.startTime ?? { hour: 0, minute: 0, second: 0 } : null;
        next.endTime = options.withTime ? state.endTime ?? { hour: 23, minute: 59, second: 0 } : null;
      }
      setState(next);
      // `value` is controlled: a new value passed through update() (React/Vue
      // props) replaces the current one, silently — like setValue.
      if ('value' in patch) controller.setValue((patch.value ?? null) as never);
    },
    destroy() {
      listeners = [];
      stateListeners = [];
      clearListeners = [];
    },
    onChange(cb) {
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((listener) => listener !== cb);
      };
    },
    clear() {
      if (!state.range && !state.pendingStart) return;
      setState({ range: null, pendingStart: null, hoverDate: null });
      options.onClear?.();
      clearListeners.forEach((listener) => listener());
    },
    onClear(cb) {
      clearListeners.push(cb);
      return () => {
        clearListeners = clearListeners.filter((listener) => listener !== cb);
      };
    },
    selectDay(value) {
      if (!controller.isSelectable(value)) return;
      if (!state.pendingStart) {
        setState({ pendingStart: value, range: null, activePresetId: null, hoverDate: null });
        options.onChange?.({ start: value.ad });
        return;
      }
      const range = createDateRange(state.pendingStart, value);
      setState({ range, pendingStart: null, hoverDate: null, activePresetId: null });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
      if (options.autoApply && !options.withTime) controller.apply();
    },
    hoverDay(value) {
      // Only react when the hovered day actually changes. Without this guard,
      // re-rendering the cell under the cursor makes the browser re-fire
      // mouseenter on the replacement node → an infinite render loop that makes
      // the calendar impossible to click. Also a no-op before the first click.
      const next = state.pendingStart && value && controller.isSelectable(value) ? value : null;
      if (next === state.hoverDate) return;
      if (next && state.hoverDate && isSameDateValue(next, state.hoverDate)) return;
      setState({ hoverDate: next });
    },
    // A single click selects the whole BS month: the range spans its first day
    // to its last day. This is the "quickly pick a month" shortcut.
    selectMonth(year, month) {
      if (controller.isMonthDisabled(year, month)) return;
      const range = createDateRange(firstOfMonth(year, month), lastOfMonth(year, month));
      setState({ range, pendingStart: null, hoverDate: null, viewYear: year, viewMonth: month });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
      if (options.autoApply && !options.withTime) controller.apply();
    },
    isMonthDisabled(year, month) {
      const inRange = clampViewMonth(state.mode, adapter, year, month);
      if (inRange.year !== year || inRange.month !== month) return true; // past the calendar table's ends
      const min = resolveBound(options.minDate, dateMath);
      const max = resolveBound(options.maxDate, dateMath);
      if (min && lastOfMonth(year, month).ad.getTime() < min.getTime()) return true;
      if (max && firstOfMonth(year, month).ad.getTime() > max.getTime()) return true;
      return false;
    },
    // Activated by the "Pick a Month" entry in the presets rail: switch the grid
    // to whole-month selection.
    startMonthSelect() {
      setState({ activePresetId: 'month', selectionUnit: 'month', pendingStart: null, hoverDate: null, range: null, openSubmenuId: null, view: 'day' });
    },
    navigateMonth(delta) {
      const { year, month } = shiftMonth(state.mode, { year: state.viewYear, month: state.viewMonth }, delta);
      setState({ viewYear: year, viewMonth: month });
    },
    navigateMonthAt(index, delta) {
      if (index === 0 || (options.linkedCalendars ?? true)) {
        controller.navigateMonth(delta);
        return;
      }
      const [, second] = controller.visibleMonths();
      setState({ secondView: shiftMonth(state.mode, second, delta) });
    },
    navigateYear(delta) {
      const { year, month } = clampViewMonth(state.mode, adapter, state.viewYear + delta, state.viewMonth);
      setState({ viewYear: year, viewMonth: month });
    },
    navigateYearGroup(delta) {
      setState({ yearGroupStart: clampYear(state.yearGroupStart + delta * 12) });
    },
    setView(view) {
      setState(view === 'year' ? { view, yearGroupStart: clampYear(state.viewYear - 6) } : { view });
    },
    selectMonthView(month) {
      const view = clampViewMonth(state.mode, adapter, state.viewYear, month);
      setState({ viewYear: view.year, viewMonth: view.month, view: 'day' });
    },
    selectYearView(year) {
      const view = clampViewMonth(state.mode, adapter, clampYear(year), state.viewMonth);
      setState({ viewYear: view.year, viewMonth: view.month, view: 'month' });
    },
    toggleMode() {
      if (!state.allowModeToggle) return;
      setState(reviewInMode(state.mode === 'BS' ? 'AD' : 'BS'));
    },
    selectPreset(id) {
      applyPreset(presets.find((item) => item.id === id), id);
    },
    selectSubmenuItem(submenuId, itemId) {
      applyPreset(presets.find((preset) => preset.id === submenuId)?.items?.find((preset) => preset.id === itemId), itemId);
    },
    toggleSubmenu(id) {
      setState({ openSubmenuId: state.openSubmenuId === id ? null : id });
    },
    startCustomRange() {
      setState({
        activePresetId: 'custom',
        selectionUnit: 'day',
        pendingStart: null,
        hoverDate: null,
        range: null,
        openSubmenuId: null,
      });
      options.onChange?.({});
    },
    apply() {
      if (!state.range) return;
      snapshot = null;
      emit(state.range);
      controller.hide();
    },
    isDisabled(value) {
      return isDayDisabled(value.ad, options, dateMath) || decorator.isDisabled(value);
    },
    isSelectable(value) {
      if (controller.isDisabled(value)) return false;
      const start = state.pendingStart;
      if (!start) return true;
      const t = startOfLocalDay(value.ad).getTime();
      const { lo, hi } = pendingBounds(start);
      if (t < lo || t > hi) return false;
      const minSpan = options.minRangeSpanDays;
      if (minSpan && Math.abs(dayDiff(start.ad, value.ad)) + 1 < minSpan) return false;
      return true;
    },
    yearBounds() {
      return viewYearBounds(state.mode, adapter);
    },
    visibleMonths() {
      const first = { year: state.viewYear, month: state.viewMonth };
      if ((options.numberOfMonths ?? 1) < 2 || state.selectionUnit === 'month' || state.view !== 'day') return [first];
      const linked = options.linkedCalendars ?? true;
      const next = shiftMonth(state.mode, first, 1);
      // At the calendar table's very end the next month can't move on.
      const second = !linked && state.secondView ? state.secondView : next;
      return [first, second];
    },
    setRangeTime(which, hour, minute) {
      if (!state[timeKey(which)] || !Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
      setState({ [timeKey(which)]: { hour, minute, second: 0 } } as Partial<DateRangeControllerState>);
      return true;
    },
    stepRangeTime(which, unit, delta) {
      const time = state[timeKey(which)];
      if (!time) return;
      const next = unit === 'hour' ? { ...time, hour: time.hour + delta } : { ...time, minute: time.minute + delta * state.minuteStep };
      setState({ [timeKey(which)]: clampRangeTime(next) } as Partial<DateRangeControllerState>);
    },
    toggleRangeMeridiem(which) {
      const time = state[timeKey(which)];
      if (!time) return;
      setState({ [timeKey(which)]: { ...time, hour: (time.hour + 12) % 24 } } as Partial<DateRangeControllerState>);
    },
    typedString: () => (state.range ? `${dvToAscii(state.range.start, state.startTime)} – ${dvToAscii(state.range.end, state.endTime)}` : ''),
    typedReference() {
      const r = state.range ?? { start: today, end: today };
      return `${dvToAscii(r.start, state.startTime)} – ${dvToAscii(r.end, state.endTime)}`;
    },
    // Parse `YYYY-MM-DD – YYYY-MM-DD` (mode-aware); both ends must be valid and
    // allowed. Start after end is tolerated (createDateRange orders them).
    validateTyped(text) {
      if (text.trim() === '') return 'empty';
      return 'error' in parseTypedRange(text) ? 'invalid' : 'valid';
    },
    typedError(text) {
      if (text.trim() === '') return null;
      const parsed = parseTypedRange(text);
      return 'error' in parsed ? parsed.error : null;
    },
    invalidMessage(reason) {
      const fmt = (bound: Date | string | null | undefined): string => {
        const date = resolveBound(bound, dateMath);
        return date ? formatRange(date, date, adapter, { mode: state.mode, format: 'YYYY-MM-DD', locale: options.language === 'ne' ? 'ne' : 'en' }).split(' – ')[0] : '';
      };
      switch (reason) {
        case 'before-min': return fill(ui.strings.beforeMin, { date: fmt(options.minDate) });
        case 'after-max': return fill(ui.strings.afterMax, { date: fmt(options.maxDate) });
        case 'unavailable': return ui.strings.rangeHasDisabled;
        case 'span':
          return options.maxRangeSpanDays
            ? fill(ui.strings.maxSpan, { n: options.maxRangeSpanDays })
            : fill(ui.strings.minSpan, { n: options.minRangeSpanDays ?? 1 });
        case 'incomplete': return ui.strings.incomplete;
        case 'required': return ui.strings.required;
        default: return ui.strings.invalidDate;
      }
    },
    commitTyped(text) {
      if (text.trim() === '') {
        controller.clear();
        return 'empty';
      }
      const parsed = parseTypedRange(text);
      if ('error' in parsed) return 'invalid';
      const { range } = parsed;
      const view = anchorView(state.mode, { start: range.start.ad, end: range.end.ad });
      setState({
        range,
        pendingStart: null,
        hoverDate: null,
        activePresetId: null,
        selectionUnit: 'day',
        viewYear: view.year,
        viewMonth: view.month,
        ...(options.withTime ? { startTime: parsed.startTime, endTime: parsed.endTime } : {}),
      });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
      emit(range);
      return 'valid';
    },
    cellForBs(year, month, day) {
      return dateValueFromBs(adapter, { year, month, day });
    },
    buildMonthCells(year, month) {
      const cells = buildViewMonthCells(state.mode, adapter, dateMath, year, month, ui.weekStartsOn);
      const days = cells.filter((cell): cell is DateValue => !!cell);
      if (days.length) decorator.load(days[0].ad, days[days.length - 1].ad);
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

export function previewRange(state: DateRangeControllerState): DateRange | null {
  if (state.pendingStart) return createDateRange(state.pendingStart, state.hoverDate ?? state.pendingStart);
  return state.range;
}

export function isRangeBoundary(range: DateRange | null, value: DateValue): 'start' | 'end' | null {
  if (!range) return null;
  if (isSameDateValue(range.start, value)) return 'start';
  if (isSameDateValue(range.end, value)) return 'end';
  return null;
}
