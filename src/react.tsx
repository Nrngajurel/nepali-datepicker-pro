/**
 * Refined React wrappers for the Nepali date picker family.
 *
 * Fixes over the original
 * ────────────────────────
 * 1. Stale closure on callbacks  – callbacks (onChange, onApply, …) are kept in
 *    a ref so the picker always calls the latest version without needing a
 *    remount or update() call for them.
 *
 * 2. update() storm  – the original `[props]` dep fires on every render because
 *    the parent recreates the props object each time. We now split stable config
 *    (mode, locale, minDate, …) from live callbacks and only call update() when
 *    config actually changes — tracked by a JSON fingerprint.
 *
 * 3. className leak  – className is extracted before anything is passed to the
 *    picker; the picker never sees it.
 *
 * 4. Typed properly  – PickerInstance generics are filled in; no `unknown`.
 *
 * 5. Reconciler-safe mount  – the picker wraps its trigger <input> in its own
 *    DOM node (clear button, mode toggle, hidden submit fields…), which moves
 *    the input out of the slot React tracks. Rendering `<input ref>` directly
 *    then made React 19 throw "The node to be removed is not a child of this
 *    node" at unmount (and under StrictMode's mount→unmount→mount). We now
 *    render an empty host <div> that React owns and create the <input>
 *    imperatively inside it, so React only ever manages the host and the picker
 *    is free to rearrange its own descendants.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  mountDateRangePicker,
  mountDateTimePicker,
  mountMonthPicker,
} from './index.js';
import type {
  DateRangePickerOptions,
  DateRangeResult,
  DateTimePickerOptions,
  DateTimeResult,
  MonthPickerOptions,
  MonthResult,
  PickerInstance,
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

/**
 * Cheap structural fingerprint for "did the non-function config change?"
 * Functions are intentionally excluded — they are handled via useLatest refs.
 */
function configFingerprint(obj: Record<string, unknown>): string {
  const stable: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'function') stable[k] = v;
  }
  return JSON.stringify(stable);
}

/**
 * Mounts an imperative picker inside a React-owned host <div>.
 *
 * The `factory` builds the picker on a freshly-created <input>. It is captured
 * via a ref so the mount always uses the latest closure, but only ever runs
 * once (mount/unmount only). `destroy()` tears the picker down, then we empty
 * the host so React can safely remove/remount it.
 */
function useImperativePicker<TResult, TOptions>(
  factory: (input: HTMLInputElement) => PickerInstance<TResult, TOptions>,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<PickerInstance<TResult, TOptions> | null>(null);
  const factoryRef = useLatest(factory);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const input = document.createElement('input');
    host.appendChild(input);
    instanceRef.current = factoryRef.current(input);
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      // destroy() removes the picker's wrapper (and the input inside it); clear
      // any stray nodes so the host is empty for React to remove or remount.
      host.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — mount/unmount only

  return { hostRef, instanceRef };
}

// ─── NepaliDateTimePicker ─────────────────────────────────────────────────────

export interface NepaliDateTimePickerProps extends DateTimePickerOptions {
  className?: string;
}

export function NepaliDateTimePicker({
  className,
  ...options
}: NepaliDateTimePickerProps) {
  // Always-current refs for every callback — no stale closures.
  const onChangeCb = useLatest(options.onChange);
  const onOpenCb = useLatest(options.onOpen);
  const onCloseCb = useLatest(options.onClose);
  const onChangeMonthYearCb = useLatest(options.onChangeMonthYear);

  const { hostRef, instanceRef } = useImperativePicker<
    DateTimeResult,
    DateTimePickerOptions
  >((input) =>
    mountDateTimePicker(input, {
      ...options,
      onChange: (r) => onChangeCb.current?.(r),
      onOpen: () => onOpenCb.current?.(),
      onClose: () => onCloseCb.current?.(),
      onChangeMonthYear: (y, m) => onChangeMonthYearCb.current?.(y, m),
    }),
  );

  // Propagate structural config changes (never callbacks).
  const { onChange, onOpen, onClose, onChangeMonthYear, ...config } = options;
  const fingerprint = configFingerprint(config as Record<string, unknown>);
  useEffect(() => {
    instanceRef.current?.update(config as Partial<DateTimePickerOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return <div ref={hostRef} className={className} />;
}

// ─── NepaliDateRangePicker ────────────────────────────────────────────────────

export interface NepaliDateRangePickerProps extends DateRangePickerOptions {
  className?: string;
}

export function NepaliDateRangePicker({
  className,
  ...options
}: NepaliDateRangePickerProps) {
  const onApplyCb = useLatest(options.onApply);
  const onChangeCb = useLatest(options.onChange);
  const onOpenCb = useLatest(options.onOpen);
  const onCloseCb = useLatest(options.onClose);

  const { hostRef, instanceRef } = useImperativePicker<
    DateRangeResult,
    DateRangePickerOptions
  >((input) =>
    mountDateRangePicker(input, {
      ...options,
      onApply: (r) => onApplyCb.current?.(r),
      onChange: (p) => onChangeCb.current?.(p),
      onOpen: () => onOpenCb.current?.(),
      onClose: () => onCloseCb.current?.(),
    }),
  );

  const { onApply, onChange, onOpen, onClose, ...config } = options;
  const fingerprint = configFingerprint(config as Record<string, unknown>);
  useEffect(() => {
    instanceRef.current?.update(config as Partial<DateRangePickerOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return <div ref={hostRef} className={className} />;
}

// ─── NepaliMonthPicker ────────────────────────────────────────────────────────

export interface NepaliMonthPickerProps extends MonthPickerOptions {
  className?: string;
}

export function NepaliMonthPicker({
  className,
  ...options
}: NepaliMonthPickerProps) {
  const onChangeCb = useLatest(options.onChange);
  const onOpenCb = useLatest(options.onOpen);
  const onCloseCb = useLatest(options.onClose);

  const { hostRef, instanceRef } = useImperativePicker<
    MonthResult,
    MonthPickerOptions
  >((input) =>
    mountMonthPicker(input, {
      ...options,
      onChange: (r) => onChangeCb.current?.(r),
      onOpen: () => onOpenCb.current?.(),
      onClose: () => onCloseCb.current?.(),
    }),
  );

  const { onChange, onOpen, onClose, ...config } = options;
  const fingerprint = configFingerprint(config as Record<string, unknown>);
  useEffect(() => {
    instanceRef.current?.update(config as Partial<MonthPickerOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return <div ref={hostRef} className={className} />;
}
