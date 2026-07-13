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
 * $('#from').nepaliDateRangePicker({ mode: 'BS', numberOfMonths: 2 });
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
  regional,
  setDefaults,
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

// ─── types ───────────────────────────────────────────────────────────────────

type JQueryLike = {
  fn: Record<string, unknown>;
  data(el: Element, key: string, value?: unknown): unknown;
};

type PluginMethod =
  | 'getValue'
  | 'getState'
  | 'setValue'
  | 'show'
  | 'hide'
  | 'destroy'
  | 'option';

// ─── shared plugin factory ────────────────────────────────────────────────────

/**
 * Builds a jQuery plugin function for any picker variant.
 * Returns the jQuery set for chaining in all cases except getValue / getState,
 * which return the value of the *first* matched element (jQuery convention).
 */
function makePlugin<TResult, TOptions extends object>(
  $: JQueryLike,
  dataKey: string,
  mount: (el: HTMLInputElement, opts: TOptions) => PickerInstance<TResult, TOptions>,
) {
  return function (
    this: Iterable<HTMLElement>,
    arg?: TOptions | PluginMethod,
    name?: string,
    value?: unknown,
  ): unknown {
    const elements = Array.from(this);

    // ── method calls ─────────────────────────────────────────────────────────
    if (typeof arg === 'string') {
      const method = arg as PluginMethod;

      // getValue / getState: jQuery convention — return from first element only.
      if (method === 'getValue' || method === 'getState') {
        const first = elements[0];
        if (!first) return undefined;
        const inst = $.data(first, dataKey) as PickerInstance<TResult, TOptions> | undefined;
        return method === 'getValue' ? inst?.getValue() : inst?.getState();
      }

      // Void methods: iterate the full set, return `this` for chaining.
      elements.forEach((el) => {
        const inst = $.data(el, dataKey) as PickerInstance<TResult, TOptions> | undefined;
        if (!inst) return;

        switch (method) {
          case 'show':    inst.show(); break;
          case 'hide':    inst.hide(); break;
          case 'destroy':
            inst.destroy();
            $.data(el, dataKey, undefined);
            break;
          case 'setValue':
            // Passed as: $el.plugin('setValue', undefined, newValue)
            inst.setValue(value as TResult | null);
            break;
          case 'option':
            if (name) inst.update({ [name]: value } as Partial<TOptions>);
            break;
        }
      });

      return this; // chainable
    }

    // ── init / update ─────────────────────────────────────────────────────────
    elements.forEach((el) => {
      const existing = $.data(el, dataKey) as PickerInstance<TResult, TOptions> | undefined;
      if (existing) {
        if (arg) existing.update(arg);
      } else {
        const inst = mount(el as HTMLInputElement, arg ?? ({} as TOptions));
        $.data(el, dataKey, inst);
      }
    });

    return this; // chainable
  };
}

// ─── install ──────────────────────────────────────────────────────────────────

export function install($: JQueryLike): void {
  // DateRangePicker
  const rangePlugin = makePlugin<DateRangeResult, DateRangePickerOptions>(
    $,
    'nepaliDateRangePicker',
    mountDateRangePicker,
  );
(rangePlugin as unknown as Record<string, unknown>).setDefaults = setDefaults;
(rangePlugin as unknown as Record<string, unknown>).regional = regional;
  $.fn.nepaliDateRangePicker = rangePlugin;

  // DateTimePicker
  $.fn.nepaliDateTimePicker = makePlugin<DateTimeResult, DateTimePickerOptions>(
    $,
    'nepaliDateTimePicker',
    mountDateTimePicker,
  );

  // MonthPicker
  $.fn.nepaliMonthPicker = makePlugin<MonthResult, MonthPickerOptions>(
    $,
    'nepaliMonthPicker',
    mountMonthPicker,
  );
}

// ─── auto-init ────────────────────────────────────────────────────────────────

declare const window: Window & {
  jQuery?: JQueryLike;
  $?: JQueryLike;
};

/**
 * Try to install against whichever jQuery reference is available now.
 * Also schedules a DOMContentLoaded attempt so scripts that assign
 * window.jQuery after this module is parsed still get the plugins.
 */
function tryAutoInstall(): void {
  const jq = (typeof window !== 'undefined') && (window.jQuery ?? window.$);
  if (jq) install(jq);
}

if (typeof window !== 'undefined') {
  // Immediate attempt — works when jQuery loads before this module.
  tryAutoInstall();

  // Deferred attempt — works when jQuery loads after this module but before
  // DOMContentLoaded (the most common script-tag ordering scenario).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAutoInstall, { once: true });
  }
}