/**
 * Refined jQuery plugin adapter for the Nepali date picker family.
 *
 * Fixes over the original
 * ────────────────────────
 * 1. getValue returns first-element value  – jQuery convention; the original
 *    iterated every element and returned the last one.
 *
 * 2. Full method surface  – added setValue, getState, and onChange to the
 *    PluginMethod union; they exist on PickerInstance but were unreachable.
 *
 * 3. No-op container re-read removed  – DateRangePicker was spreading options
 *    and then re-assigning container from the same object (a no-op).
 *
 * 4. Deferred auto-init  – instead of running once at import time (which fails
 *    if jQuery loads after this module), we also listen for a custom
 *    'jquery:ready' hook and for the common pattern of jQuery being assigned
 *    to window after DOMContentLoaded.
 *
 * 5. Typed generics  – PickerInstance is parameterised with the correct result
 *    types instead of unknown.
 *
 * Usage
 * ─────
 * // Init
 * $('#from').nepaliDateRangePicker({ mode: 'BS', fiscalStartMonth: 4 });
 *
 * // Method calls
 * $('#from').nepaliDateRangePicker('show');
 * $('#from').nepaliDateRangePicker('setValue', undefined, { start: d1, end: d2 });
 * const val = $('#from').nepaliDateRangePicker('getValue');   // first element
 * $('#from').nepaliDateRangePicker('option', 'minDate', new Date());
 * $('#from').nepaliDateRangePicker('destroy');
 */

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

import { autoInstallPlugins, installPlugins } from './jquery-plugin.js';
import type { JQueryLike } from './jquery-plugin.js';

const PLUGINS = {
  nepaliDateRangePicker: mountDateRangePicker,
  nepaliDateTimePicker: mountDateTimePicker,
  nepaliMonthPicker: mountMonthPicker,
  nepaliYearPicker: mountYearPicker,
  nepaliTimePicker: mountTimePicker,
  nepaliMultiDatePicker: mountMultiDatePicker,
};

export function install($: JQueryLike): void {
  installPlugins($, PLUGINS);
}

/**
 * Install against whichever jQuery is on `window` now, and again on
 * DOMContentLoaded for scripts that load jQuery after this module. Runs on
 * import; the UMD `<script>` bundle also calls it explicitly (see umd.ts).
 */
export function autoInstall(): void {
  autoInstallPlugins(PLUGINS);
}

autoInstall();

// ─── TypeScript: the plugins on `$(...)` ──────────────────────────────────────
// Merges into @types/jquery's `JQuery` interface when it is installed.

type PluginCalls<TResult, TOptions, TValue> = {
  (options?: TOptions): JQuery;
  (method: 'getValue'): TResult | null | undefined;
  (method: 'getState'): unknown;
  (method: 'setValue', unused: undefined, value: TValue | null): JQuery;
  <K extends keyof TOptions>(method: 'option', name: K, value: TOptions[K]): JQuery;
  (method: 'show' | 'hide' | 'destroy' | 'clear'): JQuery;
};

declare global {
  interface JQuery<TElement = HTMLElement> {
    nepaliDateTimePicker: PluginCalls<DateTimeResult, DateTimePickerOptions, Date>;
    nepaliDateRangePicker: PluginCalls<DateRangeResult, DateRangePickerOptions, { start: Date; end: Date }>;
    nepaliMonthPicker: PluginCalls<MonthResult, MonthPickerOptions, MonthValue>;
    nepaliYearPicker: PluginCalls<YearResult, YearPickerOptions, number>;
    nepaliTimePicker: PluginCalls<TimeResult, TimePickerOptions, TimeValue>;
    nepaliMultiDatePicker: PluginCalls<MultiDateResult, MultiDatePickerOptions, Date[]>;
  }
}
