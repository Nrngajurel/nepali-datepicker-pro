import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { isDayDisabled, resolveBound } from './constraints.js';
import { createDateRange, createDateValue, dateValueFromBs, isSameDateValue } from '../domain/date-value.js';
import { formatRange, formatMachineValue, stringifyMachineValue } from '../format/index.js';
import type { CalendarMode, DateRange, DateRangePickerOptions, DateRangeResult, DateValue, PickerInstance, PresetDefinition } from '../types.js';
import { normalizePresets } from './presets.js';

export interface DateRangeControllerState {
  isOpen: boolean;
  mode: CalendarMode;
  allowModeToggle: boolean;
  viewYear: number;
  viewMonth: number;
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
  isDisabled(value: DateValue): boolean;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedString(): string;
  typedReference(): string;
  yearBounds(): { min: number; max: number };
  cellForBs(year: number, month: number, day: number): DateValue;
  buildMonthCells(year: number, month: number): Array<DateValue | null>;
}

export function createDateRangeController(initialOptions: DateRangePickerOptions = {}): DateRangeController {
  let options = { ...initialOptions };
  const adapter = options.adapter ?? defaultCalendarAdapter;
  const dateMath = options.dateMath ?? nativeDateMath;
  let presets = normalizePresets(options, adapter, dateMath);
  let listeners: Array<(value: DateRangeResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  const today = createDateValue(adapter, new Date());
  // A range is shown only when explicitly provided via value/defaultValue, or
  // when a defaultPresetId names a preset. Otherwise the picker starts empty and
  // the calendar just opens on the current month.
  const providedRange = options.value !== undefined ? options.value : options.defaultValue;
  const initialRange = providedRange ?? (options.defaultPresetId ? resolvePresetRange(options.defaultPresetId) : null);
  const viewAnchor = initialRange ?? resolveInitialRange();

  let state: DateRangeControllerState = {
    isOpen: false,
    mode: options.mode ?? 'BS',
    allowModeToggle: options.allowModeToggle !== false,
    viewYear: adapter.adToBs(viewAnchor.end).year,
    viewMonth: adapter.adToBs(viewAnchor.end).month,
    range: initialRange ? createDateRange(createDateValue(adapter, initialRange.start), createDateValue(adapter, initialRange.end)) : null,
    pendingStart: null,
    hoverDate: null,
    activePresetId: providedRange ? null : (options.defaultPresetId ?? null),
    openSubmenuId: null,
    view: 'day',
    yearGroupStart: adapter.adToBs(viewAnchor.end).year - 6,
    selectionUnit: 'day',
  };

  const firstOfMonth = (year: number, month: number): DateValue => dateValueFromBs(adapter, { year, month, day: 1 });
  const lastOfMonth = (year: number, month: number): DateValue => dateValueFromBs(adapter, { year, month, day: adapter.daysInBsMonth(year, month) });

  const pad2 = (n: number): string => String(n).padStart(2, '0');

  // Mode-aware ASCII `YYYY-MM-DD` for one endpoint.
  function dvToAscii(value: DateValue): string {
    return state.mode === 'BS'
      ? `${value.bs.year}-${pad2(value.bs.month)}-${pad2(value.bs.day)}`
      : `${value.ad.getFullYear()}-${pad2(value.ad.getMonth() + 1)}-${pad2(value.ad.getDate())}`;
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

  // Parse a full `YYYY-MM-DD – YYYY-MM-DD` string into an ordered, allowed range.
  function parseTypedRange(text: string): DateRange | null {
    const m = /^\s*(\d{1,4})-(\d{1,2})-(\d{1,2})\s+–\s+(\d{1,4})-(\d{1,2})-(\d{1,2})\s*$/.exec(text);
    if (!m) return null;
    const start = parseTypedDay(Number(m[1]), Number(m[2]), Number(m[3]));
    const end = parseTypedDay(Number(m[4]), Number(m[5]), Number(m[6]));
    if (!start || !end) return null;
    if (controller.isDisabled(start) || controller.isDisabled(end)) return null;
    return createDateRange(start, end);
  }

  function clampYear(year: number): number {
    return Math.max(adapter.minSupportedYear, Math.min(adapter.maxSupportedYear, year));
  }

  function resolveInitialRange(): { start: Date; end: Date } {
    const firstRange = presets.find((preset) => preset.kind === 'range' && preset.resolve);
    return firstRange?.resolve?.({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath }) ?? { start: new Date(), end: new Date() };
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
    const r = preset.resolve({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath });
    return { start: r.start, end: r.end };
  }

  function setState(patch: Partial<DateRangeControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }

  function toResult(range: DateRange): DateRangeResult {
    const vf = options.valueFormat ?? 'iso';
    const startValue = formatMachineValue({ ad: range.start.ad, bs: range.start.bs }, vf, adapter);
    const endValue = formatMachineValue({ ad: range.end.ad, bs: range.end.bs }, vf, adapter);
    return {
      start: range.start.ad,
      end: range.end.ad,
      startBs: range.start.bs,
      endBs: range.end.bs,
      formatted: formatRange(range.start.ad, range.end.ad, adapter, {
        mode: state.mode,
        format: options.displayFormat ?? options.locale?.format ?? 'YYYY-MM-DD',
        separator: options.locale?.separator,
        locale: state.mode === 'BS' ? 'ne' : 'en',
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

  const controller: DateRangeController = {
    getState: () => state,
    getPresets: () => presets,
    getToday: () => today,
    getValue: () => (state.range ? toResult(state.range) : null),
    setValue(value) {
      setState({
        range: value ? createDateRange(createDateValue(adapter, value.start), createDateValue(adapter, value.end)) : null,
        pendingStart: null,
        hoverDate: null,
      });
    },
    show() {
      if (!state.isOpen) {
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
    update(patch) {
      options = { ...options, ...patch };
      presets = normalizePresets(options, adapter, dateMath);
      const next: Partial<DateRangeControllerState> = {};
      if ('mode' in patch) next.mode = options.mode ?? 'BS';
      if ('allowModeToggle' in patch) next.allowModeToggle = options.allowModeToggle !== false;
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
      if (!state.pendingStart) {
        setState({ pendingStart: value, range: null, activePresetId: null, hoverDate: null });
        options.onChange?.({ start: value.ad });
        return;
      }
      const range = createDateRange(state.pendingStart, value);
      setState({ range, pendingStart: null, hoverDate: null, activePresetId: null });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
      if (options.autoApply) controller.apply();
    },
    hoverDay(value) {
      // Only react when the hovered day actually changes. Without this guard,
      // re-rendering the cell under the cursor makes the browser re-fire
      // mouseenter on the replacement node → an infinite render loop that makes
      // the calendar impossible to click. Also a no-op before the first click.
      const next = state.pendingStart ? value : null;
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
      if (options.autoApply) controller.apply();
    },
    isMonthDisabled(year, month) {
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
      let year = state.viewYear;
      let month = state.viewMonth + delta;
      while (month > 12) { month -= 12; year += 1; }
      while (month < 1) { month += 12; year -= 1; }
      setState({ viewYear: year, viewMonth: month });
    },
    navigateYear(delta) {
      setState({ viewYear: clampYear(state.viewYear + delta) });
    },
    navigateYearGroup(delta) {
      setState({ yearGroupStart: clampYear(state.yearGroupStart + delta * 12) });
    },
    setView(view) {
      setState(view === 'year' ? { view, yearGroupStart: clampYear(state.viewYear - 6) } : { view });
    },
    selectMonthView(month) {
      setState({ viewMonth: month, view: 'day' });
    },
    selectYearView(year) {
      setState({ viewYear: clampYear(year), view: 'month' });
    },
    toggleMode() {
      if (!state.allowModeToggle) return;
      setState({ mode: state.mode === 'BS' ? 'AD' : 'BS' });
    },
    selectPreset(id) {
      const preset = presets.find((item) => item.id === id);
      if (!preset?.resolve) return;
      const resolved = preset.resolve({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath });
      const range = createDateRange(createDateValue(adapter, resolved.start), createDateValue(adapter, resolved.end));
      setState({ range, activePresetId: id, selectionUnit: 'day', pendingStart: null, hoverDate: null, viewYear: range.end.bs.year, viewMonth: range.end.bs.month, openSubmenuId: null });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
    },
    selectSubmenuItem(submenuId, itemId) {
      const item = presets.find((preset) => preset.id === submenuId)?.items?.find((preset) => preset.id === itemId);
      if (!item?.resolve) return;
      const resolved = item.resolve({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath });
      const range = createDateRange(createDateValue(adapter, resolved.start), createDateValue(adapter, resolved.end));
      setState({ range, activePresetId: itemId, selectionUnit: 'day', pendingStart: null, hoverDate: null, viewYear: range.end.bs.year, viewMonth: range.end.bs.month, openSubmenuId: null });
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
      emit(state.range);
      controller.hide();
    },
    isDisabled(value) {
      return isDayDisabled(value.ad, options, dateMath);
    },
    yearBounds() {
      if (state.mode === 'BS') return { min: adapter.minSupportedYear, max: adapter.maxSupportedYear };
      return {
        min: adapter.bsToAd(adapter.minSupportedYear, 1, 1).getFullYear() + 1,
        max: adapter.bsToAd(adapter.maxSupportedYear, 1, 1).getFullYear(),
      };
    },
    typedString: () => (state.range ? `${dvToAscii(state.range.start)} – ${dvToAscii(state.range.end)}` : ''),
    typedReference() {
      const r = state.range ?? { start: today, end: today };
      return `${dvToAscii(r.start)} – ${dvToAscii(r.end)}`;
    },
    // Parse `YYYY-MM-DD – YYYY-MM-DD` (mode-aware); both ends must be valid and
    // allowed. Start after end is tolerated (createDateRange orders them).
    validateTyped(text) {
      if (text.trim() === '') return 'empty';
      return parseTypedRange(text) ? 'valid' : 'invalid';
    },
    commitTyped(text) {
      if (text.trim() === '') {
        if (state.range) setState({ range: null, pendingStart: null, hoverDate: null });
        return 'empty';
      }
      const range = parseTypedRange(text);
      if (!range) return 'invalid';
      setState({ range, pendingStart: null, hoverDate: null, activePresetId: null, selectionUnit: 'day', viewYear: range.end.bs.year, viewMonth: range.end.bs.month });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
      emit(range);
      return 'valid';
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

export function previewRange(state: DateRangeControllerState): DateRange | null {
  if (state.pendingStart && state.hoverDate) return createDateRange(state.pendingStart, state.hoverDate);
  return state.range;
}

export function isRangeBoundary(range: DateRange | null, value: DateValue): 'start' | 'end' | null {
  if (!range) return null;
  if (isSameDateValue(range.start, value)) return 'start';
  if (isSameDateValue(range.end, value)) return 'end';
  return null;
}
