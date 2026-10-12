import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { normalizeDigits } from '../format/parse.js';
import { fill } from '../i18n/strings.js';
import { firstOfViewMonth, lastOfViewMonth, viewYearBounds, viewYearMonthOf } from './calendar-view.js';
import { resolveUi } from './ui.js';
import type { UiConfig } from './ui.js';
import type { CalendarAdapter, CalendarMode, InvalidReason, PickerInstance, YearPickerOptions, YearResult } from '../types.js';

export interface YearPickerControllerState {
  isOpen: boolean;
  mode: CalendarMode;
  allowModeToggle: boolean;
  showSecondaryCalendar: boolean;
  view: 'year';
  /** The year the grid centers on (the selection, or this year). */
  viewYear: number;
  viewMonth: number;
  selected: number | null;
}

export interface YearPickerController extends PickerInstance<YearResult, YearPickerOptions, number> {
  getState(): YearPickerControllerState;
  getAdapter(): CalendarAdapter;
  getUi(): UiConfig;
  getOptions(): Readonly<YearPickerOptions>;
  navigateMonth(delta: number): void;
  navigateYear(delta: number): void;
  setView(view: 'day' | 'month' | 'year'): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
  toggleMode(): void;
  isYearDisabled(year: number): boolean;
  yearBounds(): { min: number; max: number };
  typedString(): string;
  typedReference(): string;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedError(text: string): InvalidReason | null;
  invalidMessage(reason: InvalidReason): string;
}

export function createYearPickerController(initialOptions: YearPickerOptions = {}): YearPickerController {
  let options = { ...initialOptions };
  const adapter = options.adapter ?? defaultCalendarAdapter;
  let ui = resolveUi(options);
  let listeners: Array<(value: YearResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  let clearListeners: Array<() => void> = [];
  const mode0: CalendarMode = options.mode ?? 'BS';
  const provided = options.value !== undefined ? options.value : options.defaultValue;
  const thisYear = viewYearMonthOf(mode0, adapter, new Date()).year;

  let state: YearPickerControllerState = {
    isOpen: false,
    mode: mode0,
    allowModeToggle: options.allowModeToggle !== false,
    showSecondaryCalendar: options.showSecondaryCalendar !== false,
    view: 'year',
    viewYear: provided ?? thisYear,
    viewMonth: 1,
    selected: provided ?? null,
  };

  function setState(patch: Partial<YearPickerControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }

  function bounds(): { min: number; max: number } {
    const table = viewYearBounds(state.mode, adapter);
    return { min: Math.max(table.min, options.minYear ?? table.min), max: Math.min(table.max, options.maxYear ?? table.max) };
  }

  function buildResult(year: number): YearResult {
    const start = firstOfViewMonth(state.mode, adapter, year, 1);
    const end = lastOfViewMonth(state.mode, adapter, nativeDateMath, year, 12);
    const vf = options.valueFormat ?? 'iso';
    const startValue = formatMachineValue({ ad: start, bs: adapter.adToBs(start) }, vf, adapter);
    const endValue = formatMachineValue({ ad: end, bs: adapter.adToBs(end) }, vf, adapter);
    return {
      year,
      mode: state.mode,
      start,
      end,
      formatted: adapter.toLocaleDigits(year, options.locale ?? 'en'),
      startValue,
      endValue,
      value: `${stringifyMachineValue(startValue)},${stringifyMachineValue(endValue)}`,
    };
  }

  function emit(year: number): void {
    const result = buildResult(year);
    options.onChange?.(result);
    listeners.forEach((listener) => listener(result));
  }

  function parse(text: string): number | null | 'empty' {
    const s = normalizeDigits(text).trim();
    if (!s) return 'empty';
    return /^\d{4}$/.test(s) ? Number(s) : null;
  }

  const controller: YearPickerController = {
    getState: () => state,
    getAdapter: () => adapter,
    getUi: () => ui,
    getOptions: () => options,
    getValue: () => (state.selected != null ? buildResult(state.selected) : null),
    setValue(value) {
      setState({ selected: value ?? null, viewYear: value ?? state.viewYear });
    },
    show() {
      if (!state.isOpen) {
        setState({ isOpen: true, viewYear: state.selected ?? state.viewYear });
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
      ui = resolveUi(options);
      const next: Partial<YearPickerControllerState> = {};
      if ('allowModeToggle' in patch) next.allowModeToggle = options.allowModeToggle !== false;
      if ('showSecondaryCalendar' in patch) next.showSecondaryCalendar = options.showSecondaryCalendar !== false;
      setState(next);
      if ('mode' in patch && (options.mode ?? 'BS') !== state.mode) controller.toggleMode();
      if ('value' in patch) controller.setValue(patch.value ?? null);
    },
    destroy() {
      listeners = [];
      stateListeners = [];
      clearListeners = [];
    },
    onChange(cb) {
      listeners.push(cb);
      return () => { listeners = listeners.filter((listener) => listener !== cb); };
    },
    clear() {
      if (state.selected == null) return;
      setState({ selected: null });
      options.onClear?.();
      clearListeners.forEach((listener) => listener());
    },
    onClear(cb) {
      clearListeners.push(cb);
      return () => { clearListeners = clearListeners.filter((listener) => listener !== cb); };
    },
    navigateMonth() {},
    navigateYear(delta) {
      const { min, max } = bounds();
      setState({ viewYear: Math.max(min, Math.min(max, state.viewYear + delta)) });
    },
    setView() {},
    selectMonthView() {},
    selectYearView(year) {
      if (controller.isYearDisabled(year)) return;
      setState({ selected: year, viewYear: year });
      emit(year);
      controller.hide();
    },
    // The same real year re-expressed in the other calendar: the one its
    // first day falls in (BS and AD years overlap by about 8½ months).
    toggleMode() {
      if (!state.allowModeToggle && state.mode === (options.mode ?? 'BS')) return;
      const next: CalendarMode = state.mode === 'BS' ? 'AD' : 'BS';
      const map = (year: number) => viewYearMonthOf(next, adapter, firstOfViewMonth(state.mode, adapter, year, 1)).year;
      const selected = state.selected != null ? map(state.selected) : null;
      setState({ mode: next, selected, viewYear: map(state.viewYear) });
      if (selected != null) emit(selected);
    },
    isYearDisabled(year) {
      const { min, max } = bounds();
      return year < min || year > max || !!options.disabledYears?.(year);
    },
    yearBounds: bounds,
    typedString: () => (state.selected != null ? String(state.selected) : ''),
    typedReference: () => String(state.selected ?? thisYear),
    validateTyped(text) {
      const parsed = parse(text);
      if (parsed === 'empty') return 'empty';
      return parsed != null && !controller.isYearDisabled(parsed) ? 'valid' : 'invalid';
    },
    typedError(text) {
      const parsed = parse(text);
      if (parsed === 'empty') return null;
      if (parsed == null) return 'invalid';
      if (parsed < bounds().min) return 'before-min';
      if (parsed > bounds().max) return 'after-max';
      return controller.isYearDisabled(parsed) ? 'unavailable' : null;
    },
    invalidMessage(reason) {
      switch (reason) {
        case 'before-min': return fill(ui.strings.beforeMin, { date: bounds().min });
        case 'after-max': return fill(ui.strings.afterMax, { date: bounds().max });
        case 'unavailable': return ui.strings.dateUnavailable;
        case 'required': return ui.strings.required;
        case 'incomplete': return ui.strings.incomplete;
        default: return ui.strings.invalidDate;
      }
    },
    commitTyped(text) {
      const status = controller.validateTyped(text);
      if (status === 'empty') { controller.clear(); return 'empty'; }
      if (status === 'invalid') return 'invalid';
      const year = parse(text) as number;
      setState({ selected: year, viewYear: year });
      emit(year);
      return 'valid';
    },
  };

  (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange = (cb: () => void) => {
    stateListeners.push(cb);
    return () => { stateListeners = stateListeners.filter((listener) => listener !== cb); };
  };

  return controller;
}
