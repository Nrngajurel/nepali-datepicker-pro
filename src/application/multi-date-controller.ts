// Pick several days. Navigation, views, BS/AD mode, constraints and day
// decorations are the date picker's, so an inner date-only controller drives
// the calendar; this adds the set of picked days on top.
import { createDateTimeController } from './date-time-controller.js';
import type { DateTimeController } from './date-time-controller.js';
import { createDateValue } from '../domain/date-value.js';
import { formatDateValue, formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { fill } from '../i18n/strings.js';
import type { DateTimePickerOptions, DateValue, InvalidReason, MultiDatePickerOptions, MultiDateResult, PickerInstance } from '../types.js';

export interface MultiDateControllerState {
  isOpen: boolean;
  selected: DateValue[];
}

export interface MultiDateController extends PickerInstance<MultiDateResult, MultiDatePickerOptions, Date[]> {
  getState(): MultiDateControllerState & { mode: 'BS' | 'AD' };
  /** The inner date controller that drives the calendar. */
  inner(): DateTimeController;
  toggleDay(value: DateValue): void;
  isSelected(value: DateValue): boolean;
  getUi(): ReturnType<DateTimeController['getUi']>;
  toggleMode(): void;
  typedString(): string;
  typedReference(): string;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedError(text: string): InvalidReason | null;
  invalidMessage(reason: InvalidReason): string;
  yearBounds(): { min: number; max: number };
}

const key = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export function createMultiDateController(initialOptions: MultiDatePickerOptions = {}): MultiDateController {
  let options = { ...initialOptions };
  const provided = (options.value !== undefined ? options.value : options.defaultValue) ?? [];
  // The inner controller gets the calendar options only — not the value or
  // the callbacks, which are this picker's.
  const calendarOptions = (o: Partial<MultiDatePickerOptions>): DateTimePickerOptions => {
    const { value: _v, defaultValue: _d, onChange: _c, onClear: _cl, onOpen: _o, onClose: _cs, maxDates: _m, valueSeparator: _s, submitName: _n, altField: _a, ...rest } = o;
    return rest as DateTimePickerOptions;
  };
  const dt = createDateTimeController({ ...calendarOptions(options), value: provided[provided.length - 1] ?? null, withTime: false, closeOnSelect: false });
  const adapter = dt.getAdapter();
  let listeners: Array<(value: MultiDateResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  let clearListeners: Array<() => void> = [];
  let state: MultiDateControllerState = { isOpen: false, selected: sortUnique(provided.map((d) => createDateValue(adapter, d))) };

  function sortUnique(values: DateValue[]): DateValue[] {
    const seen = new Map<number, DateValue>();
    values.forEach((v) => seen.set(key(v.ad), v));
    return [...seen.values()].sort((a, b) => a.ad.getTime() - b.ad.getTime());
  }

  function setState(patch: Partial<MultiDateControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }
  (dt as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(() => stateListeners.forEach((listener) => listener()));

  function build(): MultiDateResult {
    const mode = dt.getState().mode;
    const locale = options.locale ?? 'en';
    const format = options.displayFormat ?? 'YYYY-MM-DD';
    const values = state.selected.map((v) => formatMachineValue({ ad: v.ad, bs: v.bs }, options.valueFormat ?? 'iso', adapter));
    const shown = state.selected.map((v) => formatDateValue(v.ad, adapter, { mode, format, locale }));
    return {
      dates: state.selected.map((v) => new Date(v.ad)),
      bs: state.selected.map((v) => ({ ...v.bs })),
      // A long list doesn't fit a field: past three, a count.
      formatted: shown.length > 3 ? fill(dt.getUi().strings.datesSelected, { n: adapter.toLocaleDigits(shown.length, locale) }) : shown.join(', '),
      values,
      value: values.map(stringifyMachineValue).join(options.valueSeparator ?? ','),
    };
  }

  function emit(): void {
    const result = build();
    options.onChange?.(result);
    listeners.forEach((listener) => listener(result));
  }

  const controller: MultiDateController = {
    getState: () => ({ ...state, mode: dt.getState().mode }),
    inner: () => dt,
    getUi: () => dt.getUi(),
    getValue: () => (state.selected.length ? build() : null),
    setValue(value) {
      setState({ selected: sortUnique((value ?? []).map((d) => createDateValue(adapter, d))) });
    },
    isSelected: (value) => state.selected.some((v) => key(v.ad) === key(value.ad)),
    toggleDay(value) {
      if (dt.isDisabled(value)) return;
      if (controller.isSelected(value)) {
        setState({ selected: state.selected.filter((v) => key(v.ad) !== key(value.ad)) });
      } else {
        if (options.maxDates && state.selected.length >= options.maxDates) return;
        setState({ selected: sortUnique([...state.selected, value]) });
      }
      if (state.selected.length) emit();
      else {
        options.onClear?.();
        clearListeners.forEach((listener) => listener());
      }
    },
    toggleMode: () => dt.toggleMode(),
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
      dt.update(calendarOptions(patch));
      if ('value' in patch) controller.setValue(patch.value ?? null);
    },
    destroy() {
      listeners = [];
      stateListeners = [];
      clearListeners = [];
      dt.destroy();
    },
    onChange(cb) {
      listeners.push(cb);
      return () => { listeners = listeners.filter((listener) => listener !== cb); };
    },
    clear() {
      if (!state.selected.length) return;
      setState({ selected: [] });
      options.onClear?.();
      clearListeners.forEach((listener) => listener());
    },
    onClear(cb) {
      clearListeners.push(cb);
      return () => { clearListeners = clearListeners.filter((listener) => listener !== cb); };
    },
    // The field is read-only (a list of dates isn't typed segment by segment).
    typedString: () => '',
    typedReference: () => '',
    validateTyped: () => 'empty',
    commitTyped: () => 'empty',
    typedError: () => null,
    invalidMessage: (reason) => dt.invalidMessage(reason),
    yearBounds: () => dt.yearBounds(),
  };

  (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange = (cb: () => void) => {
    stateListeners.push(cb);
    return () => { stateListeners = stateListeners.filter((listener) => listener !== cb); };
  };

  return controller;
}
