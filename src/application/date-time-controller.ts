import { nativeDateMath } from '../date-math/native-date-math.js';
import { viewYearMonthOf } from './calendar-view.js';
import { createCalendarCore, createTimeRules, dayAscii, flipMeridiem, initialViewState, stepTime, timeAscii, wrap } from './calendar-core.js';
import type { CalendarViewState } from './calendar-core.js';
import type { DayInfo, UiConfig } from './ui.js';
import { createDateValue } from '../domain/date-value.js';
import { formatDateValue, formatMachineValue } from '../format/index.js';
import { tokenizeTyped } from '../format/parse.js';
import type { CalendarAdapter, CalendarMode, DateTimePickerOptions, DateTimeResult, DateValue, InvalidReason, PickerInstance, TimeValue } from '../types.js';

export interface DateTimeControllerState extends CalendarViewState {
  selected: DateValue | null;
  time: Required<TimeValue> | null;
  /** Which step a phone-width (bottom sheet) date-time panel shows: the
   *  calendar, then the time. Wider panels show both side by side and ignore it. */
  panelStep: 'date' | 'time';
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
  goToday(): void;
  setTime(hour: number, minute: number, second?: number): void;
  setHour(hour24: number): boolean;
  setMinute(minute: number): boolean;
  setSecond(second: number): boolean;
  stepHour(delta: number): void;
  stepMinute(delta: number): void;
  stepSecond(delta: number): void;
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
  /** Why typed text is invalid, or null when it's valid or empty. */
  typedError(text: string): InvalidReason | null;
  /** The user-facing message for a validation failure. */
  invalidMessage(reason: InvalidReason): string;
  typedString(): string;
  typedReference(): string;
  yearBounds(): { min: number; max: number };
  isHourDisabled(hour: number): boolean;
  isMinuteDisabled(hour: number, minute: number): boolean;
  setPanelStep(step: 'date' | 'time'): void;
  /** The calendar adapter in use (the `adapter` option, or the built-in one) — the render layer draws with it. */
  getAdapter(): CalendarAdapter;
  /** Resolved UI strings, script and week layout — the render layer reads it. */
  getUi(): UiConfig;
  /** Decorations for one day cell (dayCellProps, events, weekend). */
  dayInfo(value: DateValue): DayInfo;
  /** Current options (read-only view). */
  getOptions(): Readonly<DateTimePickerOptions>;
  cellForBs(year: number, month: number, day: number): DateValue;
  buildMonthCells(year: number, month: number): Array<DateValue | null>;
}

export function createDateTimeController(initialOptions: DateTimePickerOptions = {}): DateTimeController {
  let options = { ...initialOptions };
  // A value is selected only when `value`/`defaultValue` is explicitly provided;
  // otherwise the field starts empty. The calendar still opens on today's month.
  const providedValue = options.value !== undefined ? options.value : options.defaultValue;
  const initialDate = providedValue ?? new Date();
  const defaultTime = options.defaultTime ?? { hour: initialDate.getHours(), minute: initialDate.getMinutes(), second: initialDate.getSeconds() };
  const withSeconds = (): boolean => !!options.withTime && !!options.withSeconds;

  // eslint-disable-next-line prefer-const -- assigned once the core exists (it needs the adapter)
  let state: DateTimeControllerState;
  const core = createCalendarCore<DateTimeControllerState, DateTimePickerOptions, DateTimeResult>({
    options: () => options,
    state: () => state,
    setState,
    navigated: (year, month) => options.onChangeMonthYear?.(year, month),
  });
  const { adapter } = core;
  const rules = createTimeRules(() => options, () => state.minuteStep);
  const initialValue = createDateValue(adapter, initialDate);

  state = {
    ...initialViewState(options, viewYearMonthOf(options.mode ?? 'BS', adapter, initialValue.ad)),
    selected: providedValue ? initialValue : null,
    time: options.withTime ? { hour: defaultTime.hour, minute: defaultTime.minute, second: options.withSeconds ? defaultTime.second ?? 0 : 0 } : null,
    panelStep: 'date',
  };

  function setState(patch: Partial<DateTimeControllerState>): void {
    state = { ...state, ...patch };
    core.notifyState();
  }

  const commitTime = (next: Required<TimeValue>): void => setState({ time: rules.clamp(next) });
  const nowTime = (): Required<TimeValue> => {
    const now = new Date();
    return { hour: now.getHours(), minute: now.getMinutes(), second: withSeconds() ? now.getSeconds() : 0 };
  };

  // Parse typed text into a concrete DateValue (+ optional time), honouring the
  // active BS/AD mode and all date/time constraints. Returns 'empty' for blank
  // input, or the reason it can't be accepted.
  function parseTyped(text: string): { value: DateValue; time: Required<TimeValue> | null } | 'empty' | { error: InvalidReason } {
    const tokens = tokenizeTyped(text);
    if (tokens === 'empty') return 'empty';
    const value = tokens && core.parseDay(tokens);
    if (!tokens || !value) return { error: 'invalid' };
    if (controller.isDisabled(value)) return { error: core.disabledReason(value) };
    if (options.withTime && tokens.hour != null) {
      if (tokens.hour > 23 || (tokens.minute ?? 0) > 59 || (tokens.second ?? 0) > 59) return { error: 'invalid' };
      // Same rule as the wheels: a time outside minTime/maxTime or rejected by
      // disabledTimes is invalid.
      if (controller.isMinuteDisabled(tokens.hour, tokens.minute ?? 0)) return { error: 'time-unavailable' };
      return { value, time: { hour: tokens.hour, minute: tokens.minute ?? 0, second: withSeconds() ? tokens.second ?? 0 : 0 } };
    }
    return { value, time: null };
  }

  // Mode-aware canonical ASCII string for a value (+ current time when withTime).
  function toAscii(value: DateValue): string {
    const date = dayAscii(value, state.mode);
    return options.withTime ? `${date} ${timeAscii(state.time ?? nowTime(), withSeconds())}` : date;
  }

  // Select a day and bring the calendar to its month.
  function select(value: DateValue, extra: Partial<DateTimeControllerState> = {}): void {
    const view = core.viewOf(value.ad);
    setState({ ...extra, selected: value, viewYear: view.year, viewMonth: view.month });
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
          ? (state.timeFormat === '12h' ? `YYYY-MM-DD hh:mm${withSeconds() ? ':ss' : ''} A` : `YYYY-MM-DD HH:mm${withSeconds() ? ':ss' : ''}`)
          : 'YYYY-MM-DD'),
        locale: options.locale ?? 'en',
      }),
      value: formatMachineValue({ ad, bs: value.bs, time: state.time ?? undefined }, options.valueFormat ?? 'iso', adapter, !!options.withTime, withSeconds()),
    };
  }

  function emit(value: DateValue): void {
    const result = buildResult(value);
    options.onChange?.(result);
    core.emitChange(result);
  }

  // Date-only pickers close on a pick (unless closeOnSelect says otherwise).
  function pickedDay(value: DateValue): void {
    if (options.closeOnSelect ?? !options.withTime) {
      emit(value);
      controller.hide();
    }
  }

  const controller: DateTimeController = {
    ...core.methods,
    isHourDisabled: rules.isHourDisabled,
    isMinuteDisabled: rules.isMinuteDisabled,
    getState: () => state,
    getValue: () => (state.selected ? buildResult(state.selected) : null),
    setValue(value) {
      const ad = value instanceof Date ? value : value?.ad ?? null;
      if (!ad) {
        setState({ selected: null });
        return;
      }
      // Take the time from the value too, and bring the calendar to its month.
      select(createDateValue(adapter, ad), state.time ? { time: rules.clamp({ hour: ad.getHours(), minute: ad.getMinutes(), second: withSeconds() ? ad.getSeconds() : 0 }) } : {});
    },
    show() {
      if (!state.isOpen) {
        setState({ isOpen: true, panelStep: 'date' });
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
      const next = core.updatePatch(patch);
      if (('minTime' in patch || 'maxTime' in patch) && state.time) next.time = rules.clamp(state.time);
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
      // `value` is controlled: a new value passed through update() (React/Vue
      // props) replaces the current one, silently — like setValue.
      if ('value' in patch) controller.setValue(patch.value ?? null);
    },
    setPanelStep(step) {
      if (step === 'time' && !state.selected) return;
      setState({ panelStep: step });
    },
    selectDay(value) {
      if (controller.isDisabled(value)) return;
      // With time, picking a day moves a phone-width panel on to the time step.
      select(value, state.time ? { panelStep: 'time' } : {});
      pickedDay(value);
    },
    // Jumps straight to today from any month/year/view — the calendar's
    // counterpart of the time panel's "Now".
    goToday() {
      const today = createDateValue(adapter, new Date());
      if (controller.isDisabled(today)) return;
      select(today, { view: 'day' });
      pickedDay(today);
    },
    setTime(hour, minute, second = 0) {
      commitTime({ hour: wrap(hour, 24), minute: wrap(minute, 60), second: wrap(second, 60) });
    },
    // Validated absolute setters for typed entry: reject out-of-range or
    // disabled values (so the field can flag them) instead of wrapping, and
    // skip a redundant re-render when the value is unchanged.
    setHour(hour24) {
      if (!state.time || !Number.isInteger(hour24) || hour24 < 0 || hour24 > 23 || controller.isHourDisabled(hour24)) return false;
      if (state.time.hour !== hour24) commitTime({ ...state.time, hour: hour24 });
      return true;
    },
    setMinute(minute) {
      if (!state.time || !Number.isInteger(minute) || minute < 0 || minute > 59 || controller.isMinuteDisabled(state.time.hour, minute)) return false;
      if (state.time.minute !== minute) commitTime({ ...state.time, minute });
      return true;
    },
    setSecond(second) {
      if (!state.time || !Number.isInteger(second) || second < 0 || second > 59) return false;
      if (state.time.second !== second) commitTime({ ...state.time, second });
      return true;
    },
    stepHour(delta) {
      if (state.time) commitTime(stepTime(state.time, 'hour', delta, state.minuteStep));
    },
    stepMinute(delta) {
      if (state.time) commitTime(stepTime(state.time, 'minute', delta, state.minuteStep));
    },
    stepSecond(delta) {
      if (state.time) commitTime(stepTime(state.time, 'second', delta, state.minuteStep));
    },
    toggleMeridiem() {
      if (state.time) commitTime(flipMeridiem(state.time));
    },
    setTimeToNow() {
      if (state.time) commitTime(nowTime());
    },
    confirm() {
      if (state.selected) emit(state.selected);
      controller.hide();
    },
    clear() {
      if (!state.selected) return;
      setState({ selected: null });
      options.onClear?.();
      core.emitClear();
    },
    // Non-mutating check used to flag the input as valid/invalid while typing.
    validateTyped(text) {
      const parsed = parseTyped(text);
      return parsed === 'empty' ? 'empty' : 'error' in parsed ? 'invalid' : 'valid';
    },
    typedError(text) {
      const parsed = parseTyped(text);
      return parsed !== 'empty' && 'error' in parsed ? parsed.error : null;
    },
    invalidMessage: (reason) => core.invalidMessage(reason),
    // Parse + apply typed text: select the date, sync the calendar view and
    // emit; on blank, clear the selection. Invalid input is a no-op.
    commitTyped(text) {
      const parsed = parseTyped(text);
      if (parsed === 'empty') {
        controller.clear();
        return 'empty';
      }
      if ('error' in parsed) return 'invalid';
      select(parsed.value, parsed.time && state.time ? { time: rules.clamp(parsed.time) } : {});
      emit(parsed.value);
      return 'valid';
    },
    // Canonical ASCII `YYYY-MM-DD[ HH:mm]` of the selection (active calendar),
    // or '' when nothing is selected — seeds the typed editor.
    typedString: () => (state.selected ? toAscii(state.selected) : ''),
    // Same, falling back to today — seeds a section the first time it's stepped.
    typedReference: () => toAscii(state.selected ?? createDateValue(adapter, new Date())),
  };

  return controller;
}

export { nativeDateMath };
