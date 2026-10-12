import { clampViewMonth, firstOfViewMonth, lastOfViewMonth, viewYearMonthOf } from './calendar-view.js';
import type { ViewYearMonth } from './calendar-view.js';
import { createCalendarCore, dayAscii, flipMeridiem, initialViewState, stepTime, timeAscii } from './calendar-core.js';
import type { CalendarViewState } from './calendar-core.js';
import { resolveBound } from './constraints.js';
import type { DayInfo, UiConfig } from './ui.js';
import { createDateRange, createDateValue, isSameDateValue, startOfLocalDay } from '../domain/date-value.js';
import { formatRange, formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { normalizeDigits, tokenizeTyped } from '../format/parse.js';
import { fill } from '../i18n/strings.js';
import type { CalendarAdapter, CalendarMode, DateRange, DateRangePickerOptions, DateRangeResult, DateValue, InvalidReason, PickerInstance, PresetContext, PresetDefinition, TimeValue } from '../types.js';
import { normalizePresets } from './presets.js';

export type RangeEnd = 'start' | 'end';

export interface DateRangeControllerState extends CalendarViewState {
  /** The second month when `numberOfMonths: 2` and `linkedCalendars: false`;
   *  null when it simply follows the first. */
  secondView: ViewYearMonth | null;
  range: DateRange | null;
  pendingStart: DateValue | null;
  hoverDate: DateValue | null;
  activePresetId: string | null;
  openSubmenuId: string | null;
  // Internal: 'month' while the "Pick a Month" preset is active (whole-month
  // selection). Driven by the preset rail, not a public option.
  selectionUnit: 'day' | 'month';
  /** Times of day for the two ends, when `withTime` is on. */
  startTime: Required<TimeValue> | null;
  endTime: Required<TimeValue> | null;
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
  // eslint-disable-next-line prefer-const -- assigned once the core exists (it needs the adapter)
  let state: DateRangeControllerState;
  const core = createCalendarCore<DateRangeControllerState, DateRangePickerOptions, DateRangeResult>({
    options: () => options,
    state: () => state,
    setState,
    // The unlinked second month follows the calendar switch too.
    reanchor: (nextMode: CalendarMode, previous: DateRangeControllerState): Partial<DateRangeControllerState> => ({
      secondView: previous.secondView ? viewYearMonthOf(nextMode, adapter, firstOfViewMonth(previous.mode, adapter, previous.secondView.year, previous.secondView.month)) : null,
    }),
  });
  const { adapter, dateMath } = core;
  let presets = normalizePresets(options, adapter, dateMath);
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

  const timeOf = (date: Date | undefined, fallback: Required<TimeValue>): Required<TimeValue> => (
    date ? { hour: date.getHours(), minute: date.getMinutes(), second: 0 } : fallback
  );

  state = {
    ...initialViewState(options, anchorView(options.mode ?? 'BS', viewAnchor)),
    secondView: null,
    range: initialRange ? createDateRange(createDateValue(adapter, initialRange.start), createDateValue(adapter, initialRange.end)) : null,
    pendingStart: null,
    hoverDate: null,
    activePresetId: providedRange ? null : (options.defaultPresetId ?? null),
    openSubmenuId: null,
    selectionUnit: 'day',
    startTime: options.withTime ? timeOf(providedRange?.start, { hour: 0, minute: 0, second: 0 }) : null,
    endTime: options.withTime ? timeOf(providedRange?.end, { hour: 23, minute: 59, second: 0 }) : null,
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

  // Mode-aware ASCII `YYYY-MM-DD[ HH:mm]` for one endpoint.
  const dvToAscii = (value: DateValue, time: Required<TimeValue> | null): string => (
    options.withTime && time ? `${dayAscii(value, state.mode)} ${timeAscii(time)}` : dayAscii(value, state.mode)
  );

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
    const invalid = { error: 'invalid' as InvalidReason };
    const ends = normalizeDigits(text).trim().split(/\s+–\s+/);
    if (ends.length !== 2) return invalid;
    const [a, b] = ends.map(tokenizeTyped);
    // Each end is a date, with a time exactly when the picker has times.
    const shaped = (t: typeof a) => t && t !== 'empty' && (t.hour != null) === !!options.withTime && t.second == null ? t : null;
    const ta = shaped(a);
    const tb = shaped(b);
    if (!ta || !tb) return invalid;
    const start = core.parseDay(ta);
    const end = core.parseDay(tb);
    if (!start || !end) return invalid;
    if (controller.isDisabled(start)) return { error: core.disabledReason(start) };
    if (controller.isDisabled(end)) return { error: core.disabledReason(end) };
    const span = spanError(start, end);
    if (span) return { error: span };
    let startTime: Required<TimeValue> | null = null;
    let endTime: Required<TimeValue> | null = null;
    if (options.withTime) {
      if (ta.hour! > 23 || ta.minute! > 59 || tb.hour! > 23 || tb.minute! > 59) return invalid;
      startTime = { hour: ta.hour!, minute: ta.minute!, second: 0 };
      endTime = { hour: tb.hour!, minute: tb.minute!, second: 0 };
    }
    const range = createDateRange(start, end);
    // createDateRange orders the ends; keep each time with its own end.
    if (range.start !== start) [startTime, endTime] = [endTime, startTime];
    return { range, startTime, endTime };
  }

  function presetContext(): PresetContext {
    return { today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath, mode: currentMode, weekStartsOn: core.ui().weekStartsOn };
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
    core.notifyState();
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
    core.emitChange(result);
  }

  // A new range from the calendar, a preset or the field: select it, drop any
  // half-picked one, and report the change.
  function setRange(range: DateRange, extra: Partial<DateRangeControllerState> = {}): void {
    setState({ ...extra, range, pendingStart: null, hoverDate: null });
    options.onChange?.({ start: range.start.ad, end: range.end.ad });
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
    setRange(range, { activePresetId: activeId, selectionUnit: 'day', viewYear: view.year, viewMonth: view.month, secondView: null, openSubmenuId: null });
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

  const timeKey = (which: RangeEnd): 'startTime' | 'endTime' => (which === 'start' ? 'startTime' : 'endTime');
  const setTimeOf = (which: RangeEnd, time: Required<TimeValue>): void => setState({ [timeKey(which)]: time } as Partial<DateRangeControllerState>);

  const controller: DateRangeController = {
    ...core.methods,
    getState: () => state,
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
      boundsCache = null;
      presets = normalizePresets(options, adapter, dateMath);
      const next = core.updatePatch(patch);
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
    clear() {
      if (!state.range && !state.pendingStart) return;
      setState({ range: null, pendingStart: null, hoverDate: null });
      options.onClear?.();
      core.emitClear();
    },
    selectDay(value) {
      if (!controller.isSelectable(value)) return;
      if (!state.pendingStart) {
        setState({ pendingStart: value, range: null, activePresetId: null, hoverDate: null });
        options.onChange?.({ start: value.ad });
        return;
      }
      setRange(createDateRange(state.pendingStart, value), { activePresetId: null });
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
    // A single click selects the whole month: the range spans its first day
    // to its last day. This is the "quickly pick a month" shortcut.
    selectMonth(year, month) {
      if (controller.isMonthDisabled(year, month)) return;
      setRange(createDateRange(firstOfMonth(year, month), lastOfMonth(year, month)), { viewYear: year, viewMonth: month });
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
    navigateMonthAt(index, delta) {
      if (index === 0 || (options.linkedCalendars ?? true)) {
        controller.navigateMonth(delta);
        return;
      }
      const [, second] = controller.visibleMonths();
      setState({ secondView: shiftMonth(state.mode, second, delta) });
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
    isSelectable(value) {
      if (controller.isDisabled(value)) return false;
      const start = state.pendingStart;
      if (!start) return true;
      const t = startOfLocalDay(value.ad).getTime();
      const { lo, hi } = pendingBounds(start);
      if (t < lo || t > hi) return false;
      const minSpan = options.minRangeSpanDays;
      return !(minSpan && Math.abs(dayDiff(start.ad, value.ad)) + 1 < minSpan);
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
      setTimeOf(which, { hour, minute, second: 0 });
      return true;
    },
    stepRangeTime(which, unit, delta) {
      const time = state[timeKey(which)];
      if (time) setTimeOf(which, stepTime(time, unit, delta, state.minuteStep));
    },
    toggleRangeMeridiem(which) {
      const time = state[timeKey(which)];
      if (time) setTimeOf(which, flipMeridiem(time));
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
      const s = core.ui().strings;
      if (reason === 'unavailable') return s.rangeHasDisabled;
      if (reason === 'span') {
        return options.maxRangeSpanDays
          ? fill(s.maxSpan, { n: options.maxRangeSpanDays })
          : fill(s.minSpan, { n: options.minRangeSpanDays ?? 1 });
      }
      return core.invalidMessage(reason);
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
      setRange(range, {
        activePresetId: null,
        selectionUnit: 'day',
        viewYear: view.year,
        viewMonth: view.month,
        ...(options.withTime ? { startTime: parsed.startTime, endTime: parsed.endTime } : {}),
      });
      emit(range);
      return 'valid';
    },
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
