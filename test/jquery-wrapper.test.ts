// @vitest-environment jsdom
// Full functional coverage of the jQuery plugin adapter (src/jquery.ts) using
// the REAL jQuery library — init, method surface (getValue/getState/setValue/
// show/hide/option/destroy), chaining, all three picker variants, and the
// setDefaults/regional statics.
import { describe, test, expect, beforeEach } from 'vitest';
import jqueryFactory from 'jquery';
import { install } from '../src/jquery';
import type { DateTimeResult, DateRangeResult, MonthResult } from '../src/index';

// jQuery in jsdom: the imported value is already bound to the global window.
const $ = jqueryFactory as unknown as JQueryStatic;

// Install the plugins onto this jQuery once for the whole suite (mirrors what a
// consumer's <script> or import does).
install($ as unknown as Parameters<typeof install>[0]);

type AnyPluginEl = JQuery & Record<string, (...args: unknown[]) => unknown>;

function makeInput(id: string): AnyPluginEl {
  document.body.insertAdjacentHTML('beforeend', `<input id="${id}" type="text">`);
  return $(`#${id}`) as AnyPluginEl;
}

function open(el: JQuery): HTMLElement {
  el[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const panel = document.querySelector('.ndp-panel') as HTMLElement;
  expect(panel).toBeTruthy();
  return panel;
}

function firstDay(panel: HTMLElement): HTMLElement {
  return panel.querySelector('.ndp-cell:not(.ndp-cell--empty)') as HTMLElement;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('install()', () => {
  test('registers all three plugins on $.fn', () => {
    const fn = $.fn as unknown as Record<string, unknown>;
    expect(typeof fn.nepaliDateTimePicker).toBe('function');
    expect(typeof fn.nepaliDateRangePicker).toBe('function');
    expect(typeof fn.nepaliMonthPicker).toBe('function');
  });

  test('exposes setDefaults / regional statics on the range plugin', () => {
    const plugin = ($.fn as unknown as Record<string, unknown>).nepaliDateRangePicker as unknown as Record<string, unknown>;
    expect(typeof plugin.setDefaults).toBe('function');
    expect(typeof plugin.regional).toBe('object');
  });
});

describe('nepaliDateTimePicker', () => {
  test('init mounts, wraps the input, and is chainable', () => {
    const el = makeInput('dt');
    const ret = el.nepaliDateTimePicker({});
    // jQuery convention: init returns the same jQuery set for chaining.
    expect(ret).toBe(el);
    expect(el[0].closest('.ndp-trigger-wrap')).toBeTruthy();
  });

  test('starts empty; selecting a day commits and getValue returns the result', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({});
    expect(el.nepaliDateTimePicker('getValue')).toBeNull();

    const panel = open(el);
    firstDay(panel).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const value = el.nepaliDateTimePicker('getValue') as DateTimeResult;
    expect(value).toBeTruthy();
    expect(value.ad).toBeInstanceOf(Date);
    expect(typeof value.value).toBe('string'); // machine value (AD ISO)
  });

  test('onChange callback fires on selection', () => {
    const el = makeInput('dt');
    let got: DateTimeResult | null = null;
    el.nepaliDateTimePicker({ onChange: (r: DateTimeResult) => { got = r; } });
    const panel = open(el);
    firstDay(panel).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(got).not.toBeNull();
    expect((got as unknown as DateTimeResult).ad).toBeInstanceOf(Date);
  });

  test('setValue programmatically sets the value', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({});
    const d = new Date(2024, 3, 13);
    el.nepaliDateTimePicker('setValue', undefined, d);
    const v = el.nepaliDateTimePicker('getValue') as DateTimeResult;
    expect(v.ad.getFullYear()).toBe(2024);
    expect(v.ad.getMonth()).toBe(3);
    expect(v.ad.getDate()).toBe(13);
  });

  test('getState returns the controller state object', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({ value: new Date(2024, 3, 13) });
    const state = el.nepaliDateTimePicker('getState') as Record<string, unknown>;
    expect(state).toBeTruthy();
    expect(typeof state).toBe('object');
  });

  test('option method updates a single option live', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({ value: new Date(2024, 3, 13) });
    const modeBtn = () => document.querySelector('.ndp-mode-toggle') as HTMLElement;
    expect(modeBtn().style.display).not.toBe('none');
    const ret = el.nepaliDateTimePicker('option', 'allowModeToggle', false);
    expect(ret).toBe(el); // chainable
    expect(modeBtn().style.display).toBe('none');
  });

  test('show / hide toggle the popup', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({});
    el.nepaliDateTimePicker('show');
    expect(document.querySelector('.ndp-panel')).toBeTruthy();
    el.nepaliDateTimePicker('hide');
    // hide removes/detaches the open panel
    const panel = document.querySelector('.ndp-panel') as HTMLElement | null;
    expect(panel === null || panel.offsetParent === null || !panel.isConnected).toBeTruthy();
  });

  test('destroy tears down and clears jQuery data', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({});
    expect(el[0].closest('.ndp-trigger-wrap')).toBeTruthy();
    el.nepaliDateTimePicker('destroy');
    expect($.data(el[0], 'nepaliDateTimePicker')).toBeFalsy();
    expect(document.querySelector('.ndp-trigger-wrap')).toBeNull();
  });

  test('re-init on an already-mounted element updates instead of double-mounting', () => {
    const el = makeInput('dt');
    el.nepaliDateTimePicker({ allowModeToggle: true });
    el.nepaliDateTimePicker({ allowModeToggle: false });
    expect(document.querySelectorAll('.ndp-trigger-wrap').length).toBe(1);
    expect((document.querySelector('.ndp-mode-toggle') as HTMLElement).style.display).toBe('none');
  });
});

describe('nepaliDateRangePicker', () => {
  test('init mounts and getValue starts null', () => {
    const el = makeInput('rg');
    el.nepaliDateRangePicker({ numberOfMonths: 2 });
    expect(el[0].closest('.ndp-trigger-wrap')).toBeTruthy();
    expect(el.nepaliDateRangePicker('getValue')).toBeNull();
  });

  test('setValue sets a start/end range and getValue reflects it', () => {
    const el = makeInput('rg');
    el.nepaliDateRangePicker({});
    el.nepaliDateRangePicker('setValue', undefined, {
      start: new Date(2024, 3, 1),
      end: new Date(2024, 3, 10),
    });
    const v = el.nepaliDateRangePicker('getValue') as DateRangeResult;
    expect(v).toBeTruthy();
    expect(v.start.getDate()).toBe(1);
    expect(v.end.getDate()).toBe(10);
    expect(v.startValue).toBeTruthy();
    expect(v.endValue).toBeTruthy();
  });

  test('destroy cleans up', () => {
    const el = makeInput('rg');
    el.nepaliDateRangePicker({});
    el.nepaliDateRangePicker('destroy');
    expect($.data(el[0], 'nepaliDateRangePicker')).toBeFalsy();
  });
});

describe('nepaliMonthPicker', () => {
  test('init mounts and setValue produces a from→to range result', () => {
    const el = makeInput('mo');
    el.nepaliMonthPicker({});
    el.nepaliMonthPicker('setValue', undefined, { year: 2081, month: 1 });
    const v = el.nepaliMonthPicker('getValue') as MonthResult;
    expect(v).toBeTruthy();
    expect(v.year).toBe(2081);
    expect(v.month).toBe(1);
    // month is a date range under the hood
    expect(v.start).toBeInstanceOf(Date);
    expect(v.end).toBeInstanceOf(Date);
    expect(typeof v.value).toBe('string');
    expect(v.value).toContain(','); // "start,end"
  });

  test('destroy cleans up', () => {
    const el = makeInput('mo');
    el.nepaliMonthPicker({});
    el.nepaliMonthPicker('destroy');
    expect($.data(el[0], 'nepaliMonthPicker')).toBeFalsy();
  });
});

describe('multi-element sets', () => {
  test('one call mounts every matched element and getValue reads the first', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<input class="multi"><input class="multi">',
    );
    const set = $('.multi') as AnyPluginEl;
    set.nepaliDateTimePicker({});
    expect(document.querySelectorAll('.ndp-trigger-wrap').length).toBe(2);
    // getValue returns the FIRST element's value (jQuery convention).
    set[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const panel = document.querySelector('.ndp-panel') as HTMLElement;
    firstDay(panel).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(set.nepaliDateTimePicker('getValue')).toBeTruthy();
  });
});
