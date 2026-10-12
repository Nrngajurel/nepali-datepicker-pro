// A time-of-day picker. The time rules (steps, min/max, disabled times,
// 12/24h, seconds) are the date-time controller's, so it drives an inner one
// fixed on today and only adds "is there a value yet" on top.
import { createDateTimeController } from './date-time-controller.js';
import type { DateTimeController } from './date-time-controller.js';
import { normalizeDigits } from '../format/parse.js';
import type { InvalidReason, PickerInstance, TimePickerOptions, TimeResult, TimeValue } from '../types.js';
import type { UiConfig } from './ui.js';

export interface TimePickerControllerState {
  isOpen: boolean;
  hasValue: boolean;
}

export interface TimePickerController extends PickerInstance<TimeResult, TimePickerOptions, TimeValue> {
  getState(): TimePickerControllerState;
  /** The inner date-time controller the time controls render from. */
  inner(): DateTimeController;
  getUi(): UiConfig;
  getOptions(): Readonly<TimePickerOptions>;
  confirm(): void;
  typedString(): string;
  typedReference(): string;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedError(text: string): InvalidReason | null;
  invalidMessage(reason: InvalidReason): string;
  yearBounds(): { min: number; max: number };
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

function innerOptions(options: TimePickerOptions, time: TimeValue | null | undefined) {
  const now = new Date();
  const value = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time?.hour ?? now.getHours(), time?.minute ?? now.getMinutes(), time?.second ?? 0);
  return {
    language: options.language,
    strings: options.strings,
    density: options.density,
    withTime: true,
    withSeconds: options.withSeconds,
    timeFormat: options.timeFormat,
    minuteStep: options.minuteStep,
    minTime: options.minTime,
    maxTime: options.maxTime,
    disabledTimes: options.disabledTimes,
    timeInputStyle: options.timeInputStyle,
    value,
  };
}

export function createTimePickerController(initialOptions: TimePickerOptions = {}): TimePickerController {
  let options = { ...initialOptions };
  const provided = options.value !== undefined ? options.value : options.defaultValue;
  const dt = createDateTimeController(innerOptions(options, provided));
  let listeners: Array<(value: TimeResult) => void> = [];
  let stateListeners: Array<() => void> = [];
  let clearListeners: Array<() => void> = [];
  let state: TimePickerControllerState = { isOpen: false, hasValue: !!provided };

  function setState(patch: Partial<TimePickerControllerState>): void {
    state = { ...state, ...patch };
    stateListeners.forEach((listener) => listener());
  }
  // Wheel and field changes re-render through the inner controller.
  (dt as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(() => stateListeners.forEach((listener) => listener()));

  const seconds = (): boolean => !!options.withSeconds;

  function build(): TimeResult {
    const t = dt.getState().time!;
    const hour12 = t.hour % 12 || 12;
    const sec = seconds() ? `:${pad2(t.second)}` : '';
    return {
      hour: t.hour,
      minute: t.minute,
      second: seconds() ? t.second : 0,
      formatted: dt.getState().timeFormat === '12h' ? `${pad2(hour12)}:${pad2(t.minute)}${sec} ${t.hour < 12 ? 'AM' : 'PM'}` : `${pad2(t.hour)}:${pad2(t.minute)}${sec}`,
      value: `${pad2(t.hour)}:${pad2(t.minute)}${sec}`,
    };
  }

  function emit(): void {
    const result = build();
    options.onChange?.(result);
    listeners.forEach((listener) => listener(result));
  }

  function parse(text: string): { hour: number; minute: number; second: number } | 'empty' | null {
    const s = normalizeDigits(text).trim();
    if (!s) return 'empty';
    const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
    if (!m) return null;
    const time = { hour: Number(m[1]), minute: Number(m[2]), second: m[3] != null ? Number(m[3]) : 0 };
    if (time.hour > 23 || time.minute > 59 || time.second > 59) return null;
    return time;
  }

  const controller: TimePickerController = {
    getState: () => state,
    inner: () => dt,
    getUi: () => dt.getUi(),
    getOptions: () => options,
    getValue: () => (state.hasValue ? build() : null),
    setValue(value) {
      if (!value) {
        setState({ hasValue: false });
        return;
      }
      dt.setTime(value.hour, value.minute, value.second ?? 0);
      setState({ hasValue: true });
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
    confirm() {
      setState({ hasValue: true });
      emit();
      controller.hide();
    },
    update(patch) {
      options = { ...options, ...patch };
      const { value: _value, ...rest } = innerOptions(options, null);
      dt.update(rest);
      if ('value' in patch) controller.setValue(patch.value ?? null);
      else setState({});
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
      if (!state.hasValue) return;
      setState({ hasValue: false });
      options.onClear?.();
      clearListeners.forEach((listener) => listener());
    },
    onClear(cb) {
      clearListeners.push(cb);
      return () => { clearListeners = clearListeners.filter((listener) => listener !== cb); };
    },
    typedString: () => (state.hasValue ? build().value : ''),
    typedReference: () => build().value,
    validateTyped(text) {
      const parsed = parse(text);
      if (parsed === 'empty') return 'empty';
      return parsed && !dt.isMinuteDisabled(parsed.hour, parsed.minute) ? 'valid' : 'invalid';
    },
    typedError(text) {
      const parsed = parse(text);
      if (parsed === 'empty') return null;
      if (!parsed) return 'invalid';
      return dt.isMinuteDisabled(parsed.hour, parsed.minute) ? 'time-unavailable' : null;
    },
    invalidMessage(reason) {
      const s = dt.getUi().strings;
      if (reason === 'time-unavailable') return s.timeUnavailable;
      if (reason === 'required') return s.required;
      if (reason === 'incomplete') return s.incomplete;
      return s.invalidDate;
    },
    commitTyped(text) {
      const status = controller.validateTyped(text);
      if (status === 'empty') { controller.clear(); return 'empty'; }
      if (status === 'invalid') return 'invalid';
      const time = parse(text) as { hour: number; minute: number; second: number };
      dt.setTime(time.hour, time.minute, time.second);
      setState({ hasValue: true });
      emit();
      return 'valid';
    },
    yearBounds: () => ({ min: 0, max: 0 }),
  };

  (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange = (cb: () => void) => {
    stateListeners.push(cb);
    return () => { stateListeners = stateListeners.filter((listener) => listener !== cb); };
  };

  return controller;
}
