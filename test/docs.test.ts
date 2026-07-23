// @vitest-environment jsdom
// The interactive docs components: option-builders omit defaults, snippets are
// correct per framework, and the demo card each docs page embeds really mounts.
import { test, expect } from 'vitest';
import { createApp } from 'vue';

import { DEFS, snippet } from '../docs/.vitepress/theme/registry';
import PickerDemo from '../docs/.vitepress/theme/components/PickerDemo.vue';

const datetime = DEFS.find((d) => d.id === 'datetime')!;
const range = DEFS.find((d) => d.id === 'range')!;
const month = DEFS.find((d) => d.id === 'month')!;

test('buildOptions omits defaults and keeps changed values', () => {
  expect(datetime.buildOptions({ withTime: false, timeFormat: '24h', minuteStep: 1, locale: 'en', closeOnSelect: 'default', displayFormat: '' })).toEqual({});
  expect(datetime.buildOptions({ withTime: true, timeFormat: '12h', minuteStep: 5, locale: 'ne', closeOnSelect: 'false', displayFormat: '' }))
    .toEqual({ withTime: true, timeFormat: '12h', minuteStep: 5, locale: 'ne', closeOnSelect: false });
  expect(datetime.buildOptions({ showSecondaryCalendar: false, timeFormat: '24h', minuteStep: 1, locale: 'en', closeOnSelect: 'default', displayFormat: '' }))
    .toEqual({ showSecondaryCalendar: false });
  expect(range.buildOptions({ mode: 'BS', fiscalStartMonth: 4, autoApply: false, presets: 'default', displayFormat: '' })).toEqual({});
  expect(range.buildOptions({ mode: 'AD', fiscalStartMonth: 1, autoApply: true, presets: 'none', displayFormat: '' }))
    .toEqual({ mode: 'AD', fiscalStartMonth: 1, autoApply: true, presets: false });
  expect(range.buildOptions({ mode: 'BS', fiscalStartMonth: 4, autoApply: false, presets: 'default', displayFormat: '', showSecondaryCalendar: false }))
    .toEqual({ showSecondaryCalendar: false });
  expect(month.buildOptions({ locale: 'en', displayFormat: '', minYear: '', maxYear: '' })).toEqual({});
  expect(month.buildOptions({ locale: 'ne', displayFormat: 'MMMM YYYY', minYear: '2075', maxYear: '2090' }))
    .toEqual({ locale: 'ne', displayFormat: 'MMMM YYYY', minYear: 2075, maxYear: 2090 });
  expect(month.buildOptions({ locale: 'en', displayFormat: '', minYear: '', maxYear: '', showSecondaryCalendar: false }))
    .toEqual({ showSecondaryCalendar: false });
});

test('snippets are correct for every framework', () => {
  const opts = { withTime: true, timeFormat: '12h', minuteStep: 5 };
  expect(snippet(datetime, opts, 'vanilla')).toContain("import { mountDateTimePicker } from 'nepali-datepicker-pro'");
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

function mountDemo(id: string): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp(PickerDemo, { id });
  // VitePress registers ClientOnly globally; outside the site we render the
  // slot directly so the live picker still mounts under jsdom.
  app.component('ClientOnly', (_props, { slots }) => slots.default?.());
  app.mount(el);
  return el;
}

test('each docs page mounts a live demo card with tabs, options and a snippet', () => {
  for (const def of DEFS) {
    const el = mountDemo(def.id);

    expect(el.querySelectorAll('.fw-tabs button').length).toBe(5);
    expect(el.querySelectorAll('.opt').length).toBe(def.controls.length);
    // default framework = vanilla → the card shows this picker's mount call
    expect(el.querySelector('.snippet pre')!.textContent || '').toContain(def.mountName);
    // the picker really initialises against the DOM
    expect(el.querySelector('.preview .ndp-trigger')).toBeTruthy();
  }
});

test('an unknown picker id fails loudly rather than rendering an empty card', () => {
  expect(() => mountDemo('nope')).toThrow(/Unknown picker id/);
});
