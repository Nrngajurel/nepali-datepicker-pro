import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { createDateRange, createDateValue, dateValueFromBs, isSameDateValue } from '../domain/date-value.js';
import { formatRange } from '../format/index.js';
import type { CalendarMode, DateRange, DateRangePickerOptions, DateRangeResult, DateValue, PickerInstance, PresetDefinition } from '../types.js';
import { normalizePresets } from './presets.js';

export interface DateRangeControllerState {
  isOpen: boolean;
  mode: CalendarMode;
  viewYear: number;
  viewMonth: number;
  range: DateRange | null;
  pendingStart: DateValue | null;
  hoverDate: DateValue | null;
  activePresetId: string | null;
  openSubmenuId: string | null;
  view: 'day' | 'month' | 'year';
  yearGroupStart: number;
}

export interface DateRangeController extends PickerInstance<DateRangeResult, DateRangePickerOptions> {
  getState(): DateRangeControllerState;
  getPresets(): PresetDefinition[];
  getToday(): DateValue;
  selectDay(value: DateValue): void;
  hoverDay(value: DateValue | null): void;
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
  const defaultRange = options.value ?? options.defaultValue ?? resolveInitialRange();

  let state: DateRangeControllerState = {
    isOpen: false,
    mode: options.mode ?? 'BS',
    viewYear: adapter.adToBs(defaultRange.end).year,
    viewMonth: adapter.adToBs(defaultRange.end).month,
    range: createDateRange(createDateValue(adapter, defaultRange.start), createDateValue(adapter, defaultRange.end)),
    pendingStart: null,
    hoverDate: null,
    activePresetId: options.defaultPresetId ?? null,
    openSubmenuId: null,
    view: 'day',
    yearGroupStart: adapter.adToBs(defaultRange.end).year - 6,
  };

  function clampYear(year: number): number {
    return Math.max(adapter.minSupportedYear, Math.min(adapter.maxSupportedYear, year));
  }

  function resolveInitialRange(): { start: Date; end: Date } {
    const firstRange = presets.find((preset) => preset.kind === 'range' && preset.resolve);
    return firstRange?.resolve?.({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath }) ?? { start: new Date(), end: new Date() };
  }

  function setState(patch: Partial<DateRangeControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }

  function toResult(range: DateRange): DateRangeResult {
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
      setState({});
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
      setState({ mode: state.mode === 'BS' ? 'AD' : 'BS' });
    },
    selectPreset(id) {
      const preset = presets.find((item) => item.id === id);
      if (!preset?.resolve) return;
      const resolved = preset.resolve({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath });
      const range = createDateRange(createDateValue(adapter, resolved.start), createDateValue(adapter, resolved.end));
      setState({ range, activePresetId: id, pendingStart: null, hoverDate: null, viewYear: range.end.bs.year, viewMonth: range.end.bs.month, openSubmenuId: null });
      options.onChange?.({ start: range.start.ad, end: range.end.ad });
    },
    selectSubmenuItem(submenuId, itemId) {
      const item = presets.find((preset) => preset.id === submenuId)?.items?.find((preset) => preset.id === itemId);
      if (!item?.resolve) return;
      const resolved = item.resolve({ today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath });
      const range = createDateRange(createDateValue(adapter, resolved.start), createDateValue(adapter, resolved.end));
      setState({ range, activePresetId: itemId, pendingStart: null, hoverDate: null, viewYear: range.end.bs.year, viewMonth: range.end.bs.month, openSubmenuId: null });
    },
    toggleSubmenu(id) {
      setState({ openSubmenuId: state.openSubmenuId === id ? null : id });
    },
    startCustomRange() {
      setState({
        activePresetId: 'custom',
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
