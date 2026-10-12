/**
 * React wrappers for the Nepali date picker family.
 *
 * Every component is built by one factory, so they all behave the same:
 *
 * 1. Latest callbacks  – callbacks (onChange, onApply, …) are kept in a ref, so
 *    the picker always calls the latest version without a remount or update().
 *
 * 2. Minimal updates  – options are compared per key (Dates by value,
 *    functions/instances by identity) and only changed keys go to update().
 *    Re-sending an unchanged controlled `value` would reset a half-picked range.
 *
 * 3. Reconciler-safe mount  – the picker wraps its <input> in its own DOM
 *    (icon, clear button, mode switch, hidden submit fields…). React only owns
 *    an empty host <div>; the input is created imperatively inside it, so
 *    React 18/19 and StrictMode's mount→unmount→mount never fight the picker.
 *
 * 4. Ref API  – `ref` gives show/hide/clear/getValue/setValue/update/focus and
 *    the underlying `instance`.
 *
 * 5. Form-friendly  – `inputProps` (id, name, placeholder, aria-*) land on the
 *    created <input>, so a <label htmlFor> points at it.
 */
'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import {
  mountDateRangePicker,
  mountDateTimePicker,
  mountMonthPicker,
  mountMultiDatePicker,
  mountTimePicker,
  mountYearPicker,
} from './index.js';
import type {
  DateRangePickerOptions,
  DateRangeResult,
  DateTimePickerOptions,
  DateTimeResult,
  MonthPickerOptions,
  MonthResult,
  MonthValue,
  MultiDatePickerOptions,
  MultiDateResult,
  PickerInstance,
  TimePickerOptions,
  TimeResult,
  TimeValue,
  YearPickerOptions,
  YearResult,
} from './index.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Keeps a ref always pointing at the latest version of a value without
 * causing re-renders or stale closures.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  // useLayoutEffect so the ref is current before any paint / effect flush.
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

// Identity tokens for values JSON can't compare: functions (disabledDates,
// disabledTimes, preset resolvers) and class instances (a custom adapter).
// A new function or instance counts as a change; the same one doesn't.
const identities = new WeakMap<object, number>();
let nextIdentity = 0;
function identityOf(value: object): string {
  let id = identities.get(value);
  if (id === undefined) {
    id = ++nextIdentity;
    identities.set(value, id);
  }
  return `#${id}`;
}

function fingerprintOf(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (typeof v === 'function') return identityOf(v);
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) return identityOf(v);
    return v;
  }) ?? 'undefined';
}

/**
 * Pushes option changes to the picker — only the options that actually
 * changed, compared per key (Dates by value, functions/instances by
 * identity). Sending just the changed keys matters: re-sending an unchanged
 * controlled `value` on every render would reset a half-picked range.
 * Pass function options through `useCallback` to avoid an update per render.
 */
function useLiveOptions<TOptions>(
  instanceRef: { current: { update(patch: Partial<TOptions>): void } | null },
  config: Record<string, unknown>,
): void {
  const previous = useRef<Record<string, string> | null>(null);
  const prints: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) prints[key] = fingerprintOf(value);
  const combined = JSON.stringify(prints);
  useEffect(() => {
    const before = previous.current;
    previous.current = prints;
    if (!before) return; // first render: the picker was mounted with these options
    const patch: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(prints)])) {
      if (before[key] !== prints[key]) patch[key] = config[key];
    }
    if (Object.keys(patch).length) instanceRef.current?.update(patch as Partial<TOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combined]);
}

/** Every callback option any picker takes; each is routed to the latest prop. */
const CALLBACKS = ['onChange', 'onApply', 'onOpen', 'onClose', 'onClear', 'onCancel', 'onChangeMonthYear', 'onInvalid'] as const;

/** What a picker component's `ref` exposes. */
export interface PickerHandle<TResult, TOptions, TInput = TResult> {
  show(): void;
  hide(): void;
  clear(): void;
  getValue(): TResult | null;
  setValue(value: TInput | null): void;
  update(patch: Partial<TOptions>): void;
  /** Focus the field. */
  focus(): void;
  /** The underlying picker instance (null before mount / after unmount). */
  readonly instance: PickerInstance<TResult, TOptions, TInput> | null;
}

export interface PickerComponentProps {
  className?: string;
  /** Attributes for the created <input>: id (for <label htmlFor>), name, placeholder, aria-*. */
  inputProps?: Record<string, string>;
}

type Mount<TOptions, TResult, TInput> = (input: HTMLInputElement, options: TOptions) => PickerInstance<TResult, TOptions, TInput>;

function createPickerComponent<TOptions extends object, TResult, TInput>(displayName: string, mount: Mount<TOptions, TResult, TInput>) {
  const Component = forwardRef<PickerHandle<TResult, TOptions, TInput>, TOptions & PickerComponentProps>(function Picker({ className, inputProps, ...rest }, ref) {
    const options = rest as unknown as TOptions;
    const latest = useLatest(options as Record<string, unknown>);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const instanceRef = useRef<PickerInstance<TResult, TOptions, TInput> | null>(null);
    const mountOptions = useLatest(() => {
      const wired: Record<string, unknown> = { ...(options as Record<string, unknown>) };
      CALLBACKS.forEach((name) => {
        wired[name] = (...args: unknown[]) => (latest.current[name] as ((...a: unknown[]) => unknown) | undefined)?.(...args);
      });
      return wired as TOptions;
    });
    const latestInputProps = useLatest(inputProps);

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const input = document.createElement('input');
      Object.entries(latestInputProps.current ?? {}).forEach(([key, value]) => input.setAttribute(key, value));
      host.appendChild(input);
      instanceRef.current = mount(input, mountOptions.current());
      return () => {
        instanceRef.current?.destroy();
        instanceRef.current = null;
        // destroy() removes the picker's wrapper (and the input inside it); clear
        // any stray nodes so the host is empty for React to remove or remount.
        host.replaceChildren();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — mount/unmount only

    useImperativeHandle(ref, () => ({
      show: () => instanceRef.current?.show(),
      hide: () => instanceRef.current?.hide(),
      clear: () => instanceRef.current?.clear(),
      getValue: () => instanceRef.current?.getValue() ?? null,
      setValue: (value) => instanceRef.current?.setValue(value),
      update: (patch) => instanceRef.current?.update(patch),
      focus: () => hostRef.current?.querySelector('input')?.focus(),
      get instance() {
        return instanceRef.current;
      },
    }), []);

    // Propagate structural config changes (never callbacks).
    const config: Record<string, unknown> = {};
    Object.entries(options as Record<string, unknown>).forEach(([key, value]) => {
      if (!(CALLBACKS as readonly string[]).includes(key)) config[key] = value;
    });
    useLiveOptions<TOptions>(instanceRef, config);

    return <div ref={hostRef} className={className} />;
  });
  Component.displayName = displayName;
  return Component as ForwardRefExoticComponent<TOptions & PickerComponentProps & RefAttributes<PickerHandle<TResult, TOptions, TInput>>>;
}

// ─── components ─────────────────────────────────────────────────────────────

export type NepaliDateTimePickerProps = DateTimePickerOptions & PickerComponentProps;
export const NepaliDateTimePicker = createPickerComponent<DateTimePickerOptions, DateTimeResult, Date | DateTimeResult>('NepaliDateTimePicker', mountDateTimePicker);

export type NepaliDateRangePickerProps = DateRangePickerOptions & PickerComponentProps;
export const NepaliDateRangePicker = createPickerComponent<DateRangePickerOptions, DateRangeResult, { start: Date; end: Date }>('NepaliDateRangePicker', mountDateRangePicker);

export type NepaliMonthPickerProps = MonthPickerOptions & PickerComponentProps;
export const NepaliMonthPicker = createPickerComponent<MonthPickerOptions, MonthResult, MonthValue>('NepaliMonthPicker', mountMonthPicker);

export type NepaliYearPickerProps = YearPickerOptions & PickerComponentProps;
export const NepaliYearPicker = createPickerComponent<YearPickerOptions, YearResult, number>('NepaliYearPicker', mountYearPicker);

export type NepaliTimePickerProps = TimePickerOptions & PickerComponentProps;
export const NepaliTimePicker = createPickerComponent<TimePickerOptions, TimeResult, TimeValue>('NepaliTimePicker', mountTimePicker);

export type NepaliMultiDatePickerProps = MultiDatePickerOptions & PickerComponentProps;
export const NepaliMultiDatePicker = createPickerComponent<MultiDatePickerOptions, MultiDateResult, Date[]>('NepaliMultiDatePicker', mountMultiDatePicker);
