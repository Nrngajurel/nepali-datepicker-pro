// @vitest-environment jsdom
// The interactive docs app: option-builders omit defaults, snippets are correct
// per framework, and the Vue app actually mounts with a card per component.
import { test, expect } from 'vitest';
import { createApp } from 'vue';

import { DEFS, snippet } from '../playground/registry';
import App from '../playground/App.vue';

const datetime = DEFS.find((d) => d.id === 'datetime')!;
const range = DEFS.find((d) => d.id === 'range')!;
const month = DEFS.find((d) => d.id === 'month')!;

test('buildOptions omits defaults and keeps changed values', () => {
  expect(datetime.buildOptions({ withTime: false, timeFormat: '24h', minuteStep: 1, locale: 'ne', closeOnSelect: 'default', displayFormat: '' })).toEqual({});
  expect(datetime.buildOptions({ withTime: true, timeFormat: '12h', minuteStep: 5, locale: 'en', closeOnSelect: 'false', displayFormat: '' }))
    .toEqual({ withTime: true, timeFormat: '12h', minuteStep: 5, locale: 'en', closeOnSelect: false });
  expect(range.buildOptions({ mode: 'BS', fiscalStartMonth: 4, autoApply: false, presets: 'default', displayFormat: '' })).toEqual({});
  expect(range.buildOptions({ mode: 'AD', fiscalStartMonth: 1, autoApply: true, presets: 'none', displayFormat: '' }))
    .toEqual({ mode: 'AD', fiscalStartMonth: 1, autoApply: true, presets: false });
  expect(month.buildOptions({ locale: 'ne', displayFormat: '', minYear: '', maxYear: '' })).toEqual({});
  expect(month.buildOptions({ locale: 'en', displayFormat: 'MMMM YYYY', minYear: '2075', maxYear: '2090' }))
    .toEqual({ locale: 'en', displayFormat: 'MMMM YYYY', minYear: 2075, maxYear: 2090 });
});

test('snippets are correct for every framework', () => {
  const opts = { withTime: true, timeFormat: '12h', minuteStep: 5 };
  expect(snippet(datetime, opts, 'vanilla')).toContain("import { mountDateTimePicker } from 'advance-nepali-datepicker'");
  expect(snippet(datetime, opts, 'vanilla')).toContain('minuteStep: 5');
  expect(snippet(datetime, opts, 'react')).toContain('<NepaliDateTimePicker withTime timeFormat="12h" minuteStep={5} />');
  expect(snippet(datetime, opts, 'vue')).toContain(":options=\"{ withTime: true, timeFormat: '12h', minuteStep: 5 }\"");
  expect(snippet(datetime, opts, 'jquery')).toContain("$('#picker').nepaliDateTimePicker({");
  const html = snippet(datetime, opts, 'html');
  expect(html).toContain('data-with-time="true"');
  expect(html).toContain('data-time-format="12h"');
  expect(html).toContain('NepaliPicker.autoInit()');
});

test('HTML snippet flags options that auto-init cannot express', () => {
  // locale is not a data-* attribute the scanner reads.
  const html = snippet(datetime, { locale: 'en' }, 'html');
  expect(html).toMatch(/need the JS API/);
  expect(html).toContain('data-nepali-datepicker');
});

test('the Vue docs app mounts hero, component cards, helpers and events', () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  createApp(App).mount(el);

  expect(el.querySelector('.hero-title')?.textContent).toMatch(/Advance Nepali/);
  for (const id of ['datetime', 'range', 'month', 'helpers', 'events']) {
    expect(el.querySelector(`#${id}`)).toBeTruthy();
  }
  expect(el.querySelectorAll('.fw-tabs button').length).toBe(5);
  // default framework = vanilla → the first picker card shows the mount call
  expect(el.querySelector('#datetime pre')!.textContent || '').toContain('mountDateTimePicker');
  // the three pickers each mount a live trigger
  expect(el.querySelectorAll('.preview .ndp-trigger').length).toBe(3);
});
