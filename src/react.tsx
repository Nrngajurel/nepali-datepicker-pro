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

// ─── NepaliDateTimePicker ─────────────────────────────────────────────────────

export interface NepaliDateTimePickerProps extends DateTimePickerOptions {
  className?: string;
}

export function NepaliDateTimePicker({
  className,
  ...options
}: NepaliDateTimePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const instanceRef = useRef<PickerInstance<DateTimeResult, DateTimePickerOptions> | null>(null);

  // Always-current refs for every callback — no stale closures.
  const onChangeCb = useLatest(options.onChange);
  const onOpenCb = useLatest(options.onOpen);
  const onCloseCb = useLatest(options.onClose);
  const onChangeMonthYearCb = useLatest(options.onChangeMonthYear);

  // Mount once. Callbacks delegate to the latest ref.
  useEffect(() => {
    if (!inputRef.current) return;
    instanceRef.current = mountDateTimePicker(inputRef.current, {
      ...options,
      onChange: (r) => onChangeCb.current?.(r),
      onOpen: () => onOpenCb.current?.(),
      onClose: () => onCloseCb.current?.(),
      onChangeMonthYear: (y, m) => onChangeMonthYearCb.current?.(y, m),
    });
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — mount/unmount only

  // Propagate structural config changes (never callbacks).
  const { onChange, onOpen, onClose, onChangeMonthYear, ...config } = options;
  const fingerprint = configFingerprint(config as Record<string, unknown>);
  useEffect(() => {
    instanceRef.current?.update(config as Partial<DateTimePickerOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return <input ref={inputRef} className={className} />;
}

// ─── NepaliDateRangePicker ────────────────────────────────────────────────────

export interface NepaliDateRangePickerProps extends DateRangePickerOptions {
  className?: string;
}

export function NepaliDateRangePicker({
  className,
  ...options
}: NepaliDateRangePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const instanceRef = useRef<PickerInstance<DateRangeResult, DateRangePickerOptions> | null>(null);

  const onApplyCb = useLatest(options.onApply);
  const onChangeCb = useLatest(options.onChange);
  const onOpenCb = useLatest(options.onOpen);
  const onCloseCb = useLatest(options.onClose);

  useEffect(() => {
    if (!inputRef.current) return;
    instanceRef.current = mountDateRangePicker(inputRef.current, {
      ...options,
      onApply: (r) => onApplyCb.current?.(r),
      onChange: (p) => onChangeCb.current?.(p),
      onOpen: () => onOpenCb.current?.(),
      onClose: () => onCloseCb.current?.(),
    });
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { onApply, onChange, onOpen, onClose, ...config } = options;
  const fingerprint = configFingerprint(config as Record<string, unknown>);
  useEffect(() => {
    instanceRef.current?.update(config as Partial<DateRangePickerOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return <input ref={inputRef} className={className} />;
}

// ─── NepaliMonthPicker ────────────────────────────────────────────────────────

export interface NepaliMonthPickerProps extends MonthPickerOptions {
  className?: string;
}

export function NepaliMonthPicker({
  className,
  ...options
}: NepaliMonthPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const instanceRef = useRef<PickerInstance<MonthResult, MonthPickerOptions> | null>(null);

  const onChangeCb = useLatest(options.onChange);
  const onOpenCb = useLatest(options.onOpen);
  const onCloseCb = useLatest(options.onClose);

  useEffect(() => {
    if (!inputRef.current) return;
    instanceRef.current = mountMonthPicker(inputRef.current, {
      ...options,
      onChange: (r) => onChangeCb.current?.(r),
      onOpen: () => onOpenCb.current?.(),
      onClose: () => onCloseCb.current?.(),
    });
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { onChange, onOpen, onClose, ...config } = options;
  const fingerprint = configFingerprint(config as Record<string, unknown>);
  useEffect(() => {
    instanceRef.current?.update(config as Partial<MonthPickerOptions>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return <input ref={inputRef} className={className} />;
}