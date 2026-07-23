import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatDateValue, formatMachineValue, stringifyMachineValue } from '../format/index.js';
import type { MonthPickerOptions, MonthResult, MonthValue, PickerInstance, PickerLocale } from '../types.js';

export interface MonthPickerControllerState {
  isOpen: boolean;
  view: 'month' | 'year';
  viewYear: number;
  viewMonth: number;
  yearGroupStart: number;
  selected: MonthValue | null;
}

export interface MonthPickerController extends PickerInstance<MonthResult, MonthPickerOptions> {
  getState(): MonthPickerControllerState;
  navigateMonth(delta: number): void;
  navigateYear(delta: number): void;
  navigateYearGroup(delta: number): void;
  setView(view: 'day' | 'month' | 'year'): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedString(): string;
  typedReference(): string;
  yearBounds(): { min: number; max: number };
}

export function createMonthPickerController(initialOptions: MonthPickerOptions = {}): MonthPickerController {
  let options = { ...initialOptions };
  const adapter = options.adapter ?? defaultCalendarAdapter;
  // Read live so a runtime `update({ locale })` re-labels the month grid.
  const currentLocale = (): PickerLocale => options.locale ?? 'en';
  let listeners: Array<(value: MonthResult) => void> = [];
  let stateListeners: Array<() => void> = [];

  // Selected only when a month is explicitly provided; otherwise empty. The
  // grid still opens on the current BS month.
  const providedMonth = options.value !== undefined ? options.value : options.defaultValue;
  const initial = providedMonth ?? adapter.todayBs();

  let state: MonthPickerControllerState = {
    isOpen: false,
    view: 'month',
    viewYear: initial.year,
    viewMonth: initial.month,
    yearGroupStart: initial.year - 6,
    selected: providedMonth ? { year: providedMonth.year, month: providedMonth.month } : null,
  };

  function setState(patch: Partial<MonthPickerControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }

  function clampYear(year: number): number {
    const lo = options.minYear ?? adapter.minSupportedYear;
    const hi = options.maxYear ?? adapter.maxSupportedYear;
    return Math.max(lo, Math.min(hi, year));
  }

  function buildResult(year: number, month: number): MonthResult {
    const days = adapter.daysInBsMonth(year, month);
    const start = adapter.bsToAd(year, month, 1);
    const end = adapter.bsToAd(year, month, days);
    // A month is a from→to date range: first day → last day.
    const vf = options.valueFormat ?? 'iso';
    const startValue = formatMachineValue({ ad: start, bs: { year, month, day: 1 } }, vf, adapter);
    const endValue = formatMachineValue({ ad: end, bs: { year, month, day: days } }, vf, adapter);
    return {
      year,
      month,
      bs: { year, month },
      monthName: adapter.bsMonthNames(currentLocale())[month - 1],
      start,
      end,
      formatted: formatDateValue(start, adapter, { mode: 'BS', format: options.displayFormat ?? 'MMMM YYYY', locale: currentLocale() }),
      startValue,
      endValue,
      value: `${stringifyMachineValue(startValue)},${stringifyMachineValue(endValue)}`,
    };
  }

  function emit(result: MonthResult): void {
    options.onChange?.(result);
    listeners.forEach((listener) => listener(result));
  }

  const controller: MonthPickerController = {
    getState: () => state,
    getValue: () => (state.selected ? buildResult(state.selected.year, state.selected.month) : null),
    setValue(value) {
      setState({ selected: value ? { year: value.year, month: value.month } : null, viewYear: value?.year ?? state.viewYear, viewMonth: value?.month ?? state.viewMonth });
    },
    show() {
      if (!state.isOpen) {
        setState({ isOpen: true, view: 'month' });
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
    navigateMonth() {
      // Month picker never shows a day view; kept for ViewControls compatibility.
    },
    navigateYear(delta) {
      setState({ viewYear: clampYear(state.viewYear + delta) });
    },
    navigateYearGroup(delta) {
      setState({ yearGroupStart: clampYear(state.yearGroupStart + delta * 12) });
    },
    setView(view) {
      // No day view here — treat a drill-down out of the year grid as "month".
      if (view === 'year') setState({ view: 'year', yearGroupStart: clampYear(state.viewYear - 6) });
      else setState({ view: 'month' });
    },
    selectMonthView(month) {
      const selected = { year: state.viewYear, month };
      setState({ selected, viewMonth: month });
      emit(buildResult(selected.year, month));
      controller.hide();
    },
    selectYearView(year) {
      setState({ viewYear: clampYear(year), view: 'month' });
    },
    yearBounds: () => ({ min: options.minYear ?? adapter.minSupportedYear, max: options.maxYear ?? adapter.maxSupportedYear }),
    typedString: () => (state.selected ? `${state.selected.year}-${String(state.selected.month).padStart(2, '0')}` : ''),
    typedReference() {
      const v = state.selected ?? adapter.todayBs();
      return `${v.year}-${String(v.month).padStart(2, '0')}`;
    },
    // Parse `YYYY-MM`; a month is valid when the year is in range and month 1–12.
    validateTyped(text) {
      const m = /^\s*(\d{1,4})-(\d{1,2})\s*$/.exec(text);
      if (text.trim() === '') return 'empty';
      if (!m) return 'invalid';
      const year = Number(m[1]);
      const month = Number(m[2]);
      const { min, max } = controller.yearBounds();
      return year >= min && year <= max && month >= 1 && month <= 12 ? 'valid' : 'invalid';
    },
    commitTyped(text) {
      const status = controller.validateTyped(text);
      if (status === 'empty') { if (state.selected) setState({ selected: null }); return 'empty'; }
      if (status === 'invalid') return 'invalid';
      const m = /^\s*(\d{1,4})-(\d{1,2})\s*$/.exec(text)!;
      const year = Number(m[1]);
      const month = Number(m[2]);
      setState({ selected: { year, month }, viewYear: year, viewMonth: month });
      emit(buildResult(year, month));
      return 'valid';
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
