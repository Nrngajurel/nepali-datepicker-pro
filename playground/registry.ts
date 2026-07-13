import type { Component } from 'vue';
import { NepaliDateRangePicker, NepaliDateTimePicker, NepaliMonthPicker } from '../src/vue.js';

export type Framework = 'vanilla' | 'html' | 'react' | 'vue' | 'jquery';

export const FRAMEWORKS: { id: Framework; label: string }[] = [
  { id: 'vanilla', label: 'JavaScript' },
  { id: 'html', label: 'HTML' },
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'jquery', label: 'jQuery' },
];

export interface Choice { value: string; label: string; }

export interface Control {
  key: string;
  label: string;
  hint?: string;
  type: 'bool' | 'number' | 'select' | 'text';
  def: boolean | number | string;
  choices?: Choice[];
  min?: number;
  max?: number;
  placeholder?: string;
  enabledWhen?: (v: Record<string, unknown>) => boolean;
}

export interface OptionDoc {
  name: string;
  type: string;
  def: string;
  desc: string;
}

export interface EventDoc {
  name: string;
  payload: string;
  desc: string;
}

export interface PickerDef {
  id: string;
  title: string;
  description: string;
  component: Component;
  mountName: string;
  vueComponent: string;
  reactComponent: string;
  jqueryFn: string;
  dataAttr: string;
  dataAttrMap: Record<string, string>;
  eventName: string;
  controls: Control[];
  /** Every option key `buildOptions` may emit — used to build a full reset
   *  template so un-setting an option in the live preview actually clears it. */
  optionKeys: string[];
  optionDocs: OptionDoc[];
  events: EventDoc[];
  buildOptions: (v: Record<string, unknown>) => Record<string, unknown>;
  describe: (detail: { formatted: string; start?: Date; end?: Date }) => string;
}

// Options shared by every picker (popup placement, portal, teardown).
const COMMON_OPTS: OptionDoc[] = [
  { name: 'clearable', type: 'boolean', def: 'true', desc: 'Show a × button to clear the current value.' },
  { name: 'appendTo', type: 'string | HTMLElement', def: 'document.body', desc: 'Where the popup portal is mounted.' },
  { name: 'opens', type: "'left' | 'right' | 'center' | 'auto'", def: "'auto'", desc: 'Horizontal alignment of the popup relative to the input.' },
  { name: 'drops', type: "'down' | 'up' | 'auto'", def: "'auto'", desc: 'Whether the popup opens below or above the input.' },
  { name: 'adapter', type: 'CalendarAdapter', def: 'built-in', desc: 'Swap the BS↔AD conversion engine (advanced).' },
];

const COMMON_EVENTS: EventDoc[] = [
  { name: 'onOpen', payload: '()', desc: 'Fires when the popup is shown.' },
  { name: 'onClose', payload: '()', desc: 'Fires when the popup is hidden.' },
];

const LOCALE: Choice[] = [
  { value: 'ne', label: 'Nepali (ne)' },
  { value: 'en', label: 'English (en)' },
];

const OPENS: Choice[] = [
  { value: 'auto', label: 'auto' },
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'center', label: 'center' },
];

const DROPS: Choice[] = [
  { value: 'auto', label: 'auto' },
  { value: 'down', label: 'down' },
  { value: 'up', label: 'up' },
];

// A self-contained, copy-paste-valid demo predicate for `disabledDates`.
const disablePastFn = (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0));

export const DEFS: PickerDef[] = [
  {
    id: 'datetime',
    title: 'Date & Time',
    description: 'Single date with an optional same-screen time picker. Click the header to jump by month/year.',
    component: NepaliDateTimePicker,
    mountName: 'mountDateTimePicker',
    vueComponent: 'NepaliDateTimePicker',
    reactComponent: 'NepaliDateTimePicker',
    jqueryFn: 'nepaliDateTimePicker',
    dataAttr: 'data-nepali-datepicker',
    dataAttrMap: { withTime: 'data-with-time', timeFormat: 'data-time-format', minuteStep: 'data-minute-step' },
    eventName: 'select.nepaliDatePicker',
    controls: [
      { key: 'mode', label: 'Calendar system', type: 'select', def: 'BS', choices: [{ value: 'BS', label: 'Bikram Sambat' }, { value: 'AD', label: 'Gregorian' }] },
      { key: 'allowModeToggle', label: 'Allow BS/AD toggle', hint: 'swap button on input', type: 'bool', def: true },
      { key: 'withTime', label: 'Include time', type: 'bool', def: false },
      { key: 'timeFormat', label: 'Time format', type: 'select', def: '24h', choices: [{ value: '24h', label: '24-hour' }, { value: '12h', label: '12-hour (AM/PM)' }], enabledWhen: (v) => !!v.withTime },
      { key: 'minuteStep', label: 'Minute step', type: 'number', def: 1, min: 1, max: 30, enabledWhen: (v) => !!v.withTime },
      { key: 'minHour', label: 'Earliest hour', hint: '0–23 (minTime)', type: 'number', def: 0, min: 0, max: 23, enabledWhen: (v) => !!v.withTime },
      { key: 'maxHour', label: 'Latest hour', hint: '0–23 (maxTime)', type: 'number', def: 23, min: 0, max: 23, enabledWhen: (v) => !!v.withTime },
      { key: 'locale', label: 'Locale', type: 'select', def: 'ne', choices: LOCALE },
      { key: 'closeOnSelect', label: 'Close on select', type: 'select', def: 'default', choices: [{ value: 'default', label: 'Default' }, { value: 'true', label: 'Always' }, { value: 'false', label: 'Never' }] },
      { key: 'minDate', label: 'Min date', hint: "Date | 'today' | '+7d'", type: 'text', def: '', placeholder: 'today' },
      { key: 'maxDate', label: 'Max date', type: 'text', def: '', placeholder: '+1m' },
      { key: 'disableWeekends', label: 'Disable weekends', type: 'bool', def: false },
      { key: 'disablePast', label: 'Disable past dates', hint: 'disabledDates demo', type: 'bool', def: false },
      { key: 'clearable', label: 'Clearable (× button)', type: 'bool', def: true },
      { key: 'allowInput', label: 'Allow typing', hint: 'masked + validated input', type: 'bool', def: true },
      { key: 'displayFormat', label: 'Display format', hint: 'dayjs-style tokens', type: 'text', def: '', placeholder: 'YYYY-MM-DD HH:mm' },
      { key: 'opens', label: 'Opens', hint: 'horizontal align', type: 'select', def: 'auto', choices: OPENS },
      { key: 'drops', label: 'Drops', hint: 'vertical direction', type: 'select', def: 'auto', choices: DROPS },
    ],
    optionKeys: ['mode', 'allowModeToggle', 'withTime', 'timeFormat', 'minuteStep', 'minTime', 'maxTime', 'locale', 'closeOnSelect', 'minDate', 'maxDate', 'disabledWeekdays', 'disabledDates', 'clearable', 'allowInput', 'displayFormat', 'opens', 'drops'],
    optionDocs: [
      { name: 'mode', type: "'BS' | 'AD'", def: "'BS'", desc: 'Calendar system the picker opens in.' },
      { name: 'allowModeToggle', type: 'boolean', def: 'true', desc: 'Show the BS/AD swap button on the input.' },
      { name: 'value / defaultValue', type: 'Date | null', def: 'today', desc: 'Controlled / initial selected date.' },
      { name: 'withTime', type: 'boolean', def: 'false', desc: 'Show a same-screen time picker: type into the accessible HH:mm spinbutton fields (Arrow keys step, Nepali digits accepted) or scroll the wheel.' },
      { name: 'timeFormat', type: "'12h' | '24h'", def: "'24h'", desc: 'Clock style when withTime is on.' },
      { name: 'minuteStep', type: 'number', def: '1', desc: 'Increment of the minute spinner.' },
      { name: 'minTime / maxTime', type: '{ hour, minute }', def: '—', desc: 'Clamp the selectable time of day; out-of-range hours show disabled on the wheel.' },
      { name: 'disabledTimes', type: '(h, m) => boolean', def: '—', desc: 'Disable specific hours/minutes on the time wheel.' },
      { name: 'defaultTime', type: '{ hour, minute }', def: 'now', desc: 'Time used when withTime turns on with no value.' },
      { name: 'locale', type: "'ne' | 'en'", def: "'ne'", desc: 'Digit and month-name language.' },
      { name: 'minDate / maxDate', type: "Date | 'today' | '+7d'", def: '—', desc: 'Earliest / latest selectable day (relative tokens allowed).' },
      { name: 'disabledWeekdays', type: 'number[]', def: '[]', desc: 'Grey-out weekdays (0 = Sunday … 6 = Saturday).' },
      { name: 'disabledDates', type: '(date) => boolean', def: '—', desc: 'Return true to disable a specific day.' },
      { name: 'displayFormat', type: 'string', def: 'YYYY-MM-DD[ HH:mm]', desc: 'dayjs-style tokens for the input text.' },
      { name: 'closeOnSelect', type: 'boolean', def: 'true unless withTime', desc: 'Close the popup right after a day is picked.' },
      { name: 'allowInput', type: 'boolean', def: 'true', desc: 'Make the field a native-<input type=date>-style segmented editor: focus selects a section, ↑/↓ step it, digits fill with auto-advance, ←/→ move sections, Backspace clears, separators are always shown. Validated live; Enter/blur commits. Accepts Nepali or ASCII digits. Set false to keep the field read-only.' },
      ...COMMON_OPTS,
    ],
    events: [
      { name: 'onChange', payload: 'DateTimeResult', desc: 'A date (and time) was committed.' },
      { name: 'onChangeMonthYear', payload: '(year, month)', desc: 'Navigated to a different month/year.' },
      ...COMMON_EVENTS,
      { name: 'select.nepaliDatePicker', payload: 'CustomEvent<DateTimeResult>', desc: 'Bubbling DOM event dispatched on the input.' },
    ],
    buildOptions(v) {
      const o: Record<string, unknown> = {};
      if (v.mode && v.mode !== 'BS') o.mode = v.mode;
      if (v.allowModeToggle === false) o.allowModeToggle = false;
      if (v.withTime) o.withTime = true;
      if (v.withTime && v.timeFormat !== '24h') o.timeFormat = v.timeFormat;
      if (v.withTime && Number(v.minuteStep) !== 1) o.minuteStep = Number(v.minuteStep);
      if (v.withTime && Number(v.minHour) > 0) o.minTime = { hour: Number(v.minHour), minute: 0 };
      if (v.withTime && Number(v.maxHour) < 23) o.maxTime = { hour: Number(v.maxHour), minute: 0 };
      if (v.locale !== 'ne') o.locale = v.locale;
      if (v.closeOnSelect !== 'default') o.closeOnSelect = v.closeOnSelect === 'true';
      if (v.minDate) o.minDate = v.minDate;
      if (v.maxDate) o.maxDate = v.maxDate;
      if (v.disableWeekends) o.disabledWeekdays = [0, 6];
      if (v.disablePast) o.disabledDates = disablePastFn;
      if (v.clearable === false) o.clearable = false;
      if (v.allowInput === false) o.allowInput = false;
      if (v.displayFormat) o.displayFormat = v.displayFormat;
      if (v.opens && v.opens !== 'auto') o.opens = v.opens;
      if (v.drops && v.drops !== 'auto') o.drops = v.drops;
      return o;
    },
    describe: (d) => d.formatted,
  },
  {
    id: 'range',
    title: 'Date Range',
    description: 'Start/end range with a presets rail, fiscal-year helpers, and a BS/AD switch.',
    component: NepaliDateRangePicker,
    mountName: 'mountDateRangePicker',
    vueComponent: 'NepaliDateRangePicker',
    reactComponent: 'NepaliDateRangePicker',
    jqueryFn: 'nepaliDateRangePicker',
    dataAttr: 'data-nepali-daterange',
    dataAttrMap: { fiscalStartMonth: 'data-fiscal-start-month' },
    eventName: 'apply.nepaliDateRangePicker',
    controls: [
      { key: 'mode', label: 'Calendar system', type: 'select', def: 'BS', choices: [{ value: 'BS', label: 'Bikram Sambat' }, { value: 'AD', label: 'Gregorian' }] },
      { key: 'allowModeToggle', label: 'Allow BS/AD toggle', hint: 'swap button on input', type: 'bool', def: true },
      { key: 'fiscalStartMonth', label: 'Fiscal start month', hint: '1–12 (Shrawan = 4)', type: 'number', def: 4, min: 1, max: 12 },
      { key: 'autoApply', label: 'Auto-apply', hint: 'commit on 2nd click', type: 'bool', def: false },
      { key: 'presets', label: 'Presets', type: 'select', def: 'default', choices: [{ value: 'default', label: 'Default presets' }, { value: 'none', label: 'No presets' }] },
      { key: 'minDate', label: 'Min date', hint: "Date | 'today' | '-1y'", type: 'text', def: '', placeholder: '-1y' },
      { key: 'maxDate', label: 'Max date', type: 'text', def: '', placeholder: 'today' },
      { key: 'disableWeekends', label: 'Disable weekends', type: 'bool', def: false },
      { key: 'disablePast', label: 'Disable past dates', hint: 'disabledDates demo', type: 'bool', def: false },
      { key: 'autoUpdateInput', label: 'Auto-update input', hint: 'write range into field', type: 'bool', def: true },
      { key: 'clearable', label: 'Clearable (× button)', type: 'bool', def: true },
      { key: 'allowInput', label: 'Allow typing', hint: 'segmented start – end', type: 'bool', def: true },
      { key: 'displayFormat', label: 'Display format', type: 'text', def: '', placeholder: 'YYYY-MM-DD' },
      { key: 'opens', label: 'Opens', hint: 'horizontal align', type: 'select', def: 'auto', choices: OPENS },
      { key: 'drops', label: 'Drops', hint: 'vertical direction', type: 'select', def: 'auto', choices: DROPS },
    ],
    optionKeys: ['mode', 'allowModeToggle', 'fiscalStartMonth', 'autoApply', 'presets', 'minDate', 'maxDate', 'disabledWeekdays', 'disabledDates', 'autoUpdateInput', 'clearable', 'allowInput', 'displayFormat', 'opens', 'drops'],
    optionDocs: [
      { name: 'mode', type: "'BS' | 'AD'", def: "'BS'", desc: 'Calendar system the range opens in.' },
      { name: 'allowModeToggle', type: 'boolean', def: 'true', desc: 'Show the BS/AD swap button on the input.' },
      { name: 'value / defaultValue', type: '{ start, end } | null', def: 'first preset', desc: 'Controlled / initial range.' },
      { name: 'presets', type: "PresetDefinition[] | 'default' | false", def: "'default'", desc: "Quick-range rail (includes 'Pick a Month'); false hides it." },
      { name: 'defaultPresetId', type: 'string | null', def: '—', desc: 'Preset highlighted when the popup opens.' },
      { name: 'fiscalStartMonth', type: 'number (1–12)', def: '4', desc: 'BS month the fiscal year starts (Shrawan = 4).' },
      { name: 'autoApply', type: 'boolean', def: 'false', desc: 'Commit on the second click instead of an Apply button.' },
      { name: 'minDate / maxDate', type: "Date | 'today' | '-1y'", def: '—', desc: 'Earliest / latest selectable day.' },
      { name: 'disabledWeekdays', type: 'number[]', def: '[]', desc: 'Grey-out weekdays (0 = Sunday … 6 = Saturday).' },
      { name: 'maxRangeSpanDays', type: 'number | null', def: '—', desc: 'Reject ranges longer than N days.' },
      { name: 'autoUpdateInput', type: 'boolean', def: 'true', desc: 'Write the applied range back into the input text.' },
      { name: 'allowInput', type: 'boolean', def: 'true', desc: 'Type the range in a segmented `YYYY-MM-DD – YYYY-MM-DD` field (focus selects a section, ↑/↓ step, digits auto-advance, Backspace clears). Set false for read-only.' },
      { name: 'displayFormat', type: 'string', def: 'YYYY-MM-DD', desc: 'dayjs-style tokens for each bound.' },
      ...COMMON_OPTS,
    ],
    events: [
      { name: 'onApply', payload: 'DateRangeResult', desc: 'A full start→end range was applied.' },
      { name: 'onChange', payload: '{ start?, end? }', desc: 'Partial change while picking (first click / preset).' },
      ...COMMON_EVENTS,
      { name: 'apply.nepaliDateRangePicker', payload: 'CustomEvent<DateRangeResult>', desc: 'Bubbling DOM event dispatched on the input.' },
    ],
    buildOptions(v) {
      const o: Record<string, unknown> = {};
      if (v.mode !== 'BS') o.mode = v.mode;
      if (v.allowModeToggle === false) o.allowModeToggle = false;
      if (Number(v.fiscalStartMonth) !== 4) o.fiscalStartMonth = Number(v.fiscalStartMonth);
      if (v.autoApply) o.autoApply = true;
      if (v.presets === 'none') o.presets = false;
      if (v.minDate) o.minDate = v.minDate;
      if (v.maxDate) o.maxDate = v.maxDate;
      if (v.disableWeekends) o.disabledWeekdays = [0, 6];
      if (v.disablePast) o.disabledDates = disablePastFn;
      if (v.autoUpdateInput === false) o.autoUpdateInput = false;
      if (v.clearable === false) o.clearable = false;
      if (v.allowInput === false) o.allowInput = false;
      if (v.displayFormat) o.displayFormat = v.displayFormat;
      if (v.opens && v.opens !== 'auto') o.opens = v.opens;
      if (v.drops && v.drops !== 'auto') o.drops = v.drops;
      return o;
    },
    describe: (d) => d.formatted,
  },
  {
    id: 'month',
    title: 'Month',
    description: 'Pick one BS month for a monthly report or payslip — returns the AD date range it covers.',
    component: NepaliMonthPicker,
    mountName: 'mountMonthPicker',
    vueComponent: 'NepaliMonthPicker',
    reactComponent: 'NepaliMonthPicker',
    jqueryFn: 'nepaliMonthPicker',
    dataAttr: 'data-nepali-monthpicker',
    dataAttrMap: {},
    eventName: 'select.nepaliMonthPicker',
    controls: [
      { key: 'locale', label: 'Locale', type: 'select', def: 'ne', choices: LOCALE },
      { key: 'displayFormat', label: 'Display format', type: 'text', def: '', placeholder: 'MMMM YYYY' },
      { key: 'minYear', label: 'Min year (BS)', type: 'text', def: '', placeholder: '1970' },
      { key: 'maxYear', label: 'Max year (BS)', type: 'text', def: '', placeholder: '2100' },
      { key: 'clearable', label: 'Clearable (× button)', type: 'bool', def: true },
      { key: 'allowInput', label: 'Allow typing', hint: 'segmented YYYY-MM', type: 'bool', def: true },
      { key: 'opens', label: 'Opens', hint: 'horizontal align', type: 'select', def: 'auto', choices: OPENS },
      { key: 'drops', label: 'Drops', hint: 'vertical direction', type: 'select', def: 'auto', choices: DROPS },
    ],
    optionKeys: ['locale', 'displayFormat', 'minYear', 'maxYear', 'clearable', 'allowInput', 'opens', 'drops'],
    optionDocs: [
      { name: 'value / defaultValue', type: '{ year, month } | null', def: 'this month', desc: 'Controlled / initial selected BS month.' },
      { name: 'locale', type: "'ne' | 'en'", def: "'ne'", desc: 'Digit and month-name language.' },
      { name: 'minYear / maxYear', type: 'number (BS)', def: '1970 / 2100', desc: 'Range of BS years the grid can navigate.' },
      { name: 'displayFormat', type: 'string', def: 'MMMM YYYY', desc: 'dayjs-style tokens for the input text.' },
      { name: 'allowInput', type: 'boolean', def: 'true', desc: 'Type the month in a segmented `YYYY-MM` field (↑/↓ step, digits auto-advance, Backspace clears). Set false for read-only.' },
      ...COMMON_OPTS,
    ],
    events: [
      { name: 'onChange', payload: 'MonthResult', desc: 'A month was selected; payload includes the AD start/end range it covers.' },
      ...COMMON_EVENTS,
      { name: 'select.nepaliMonthPicker', payload: 'CustomEvent<MonthResult>', desc: 'Bubbling DOM event dispatched on the input.' },
    ],
    buildOptions(v) {
      const o: Record<string, unknown> = {};
      if (v.locale !== 'ne') o.locale = v.locale;
      if (v.displayFormat) o.displayFormat = v.displayFormat;
      if (v.minYear) o.minYear = Number(v.minYear);
      if (v.maxYear) o.maxYear = Number(v.maxYear);
      if (v.clearable === false) o.clearable = false;
      if (v.allowInput === false) o.allowInput = false;
      if (v.opens && v.opens !== 'auto') o.opens = v.opens;
      if (v.drops && v.drops !== 'auto') o.drops = v.drops;
      return o;
    },
    describe: (d) => {
      const iso = (x?: Date) => (x ? x.toISOString().slice(0, 10) : '');
      return d.start && d.end ? `${d.formatted}  ·  report range ${iso(d.start)} → ${iso(d.end)}` : d.formatted;
    },
  },
];

// ---- snippet generation -----------------------------------------------------

function jsValue(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  if (Array.isArray(v)) return `[${v.map(jsValue).join(', ')}]`;
  if (typeof v === 'function') return v.toString().replace(/\s+/g, ' ');
  if (typeof v === 'object') return `{ ${Object.entries(v).map(([k, val]) => `${k}: ${jsValue(val)}`).join(', ')} }`;
  return typeof v === 'string' ? `'${v}'` : String(v);
}

function jsObject(o: Record<string, unknown>): string {
  const keys = Object.keys(o);
  if (!keys.length) return '{}';
  return `{\n${keys.map((k) => `  ${k}: ${jsValue(o[k])}`).join(',\n')}\n}`;
}

function jsInline(o: Record<string, unknown>): string {
  const keys = Object.keys(o);
  if (!keys.length) return '{}';
  return `{ ${keys.map((k) => `${k}: ${jsValue(o[k])}`).join(', ')} }`;
}

function reactProps(o: Record<string, unknown>): string {
  const entries = Object.entries(o);
  if (!entries.length) return '';
  return ` ${entries.map(([k, v]) => {
    if (typeof v === 'boolean') return v ? k : `${k}={false}`;
    if (typeof v === 'string') return `${k}="${v}"`;
    return `${k}={${jsValue(v)}}`;
  }).join(' ')}`;
}

export function snippet(def: PickerDef, options: Record<string, unknown>, framework: Framework): string {
  switch (framework) {
    case 'vanilla':
      return [
        `import { ${def.mountName} } from 'advance-nepali-datepicker';`,
        `import 'advance-nepali-datepicker/style.css';`,
        ``,
        `${def.mountName}(document.querySelector('#picker'), ${jsObject(options)});`,
      ].join('\n');

    case 'html': {
      const parts = [def.dataAttr];
      const unsupported: string[] = [];
      for (const [k, v] of Object.entries(options)) {
        const attr = def.dataAttrMap[k];
        if (attr) parts.push(`${attr}="${v}"`);
        else unsupported.push(k);
      }
      const note = unsupported.length
        ? `\n<!-- ${unsupported.join(', ')} need the JS API (auto-init only reads data-* attributes) -->`
        : '';
      return [
        `<link rel="stylesheet" href="https://unpkg.com/advance-nepali-datepicker/dist/style.css">`,
        `<script src="https://unpkg.com/advance-nepali-datepicker/dist/advance-nepali-datepicker.umd.cjs"></script>`,
        `${note}`,
        `<input ${parts.join(' ')} readonly>`,
        `<script>NepaliPicker.autoInit()</script>`,
      ].filter((line, i) => !(i === 2 && note === '')).join('\n');
    }

    case 'react':
      return [
        `import { ${def.reactComponent} } from 'advance-nepali-datepicker/react';`,
        `import 'advance-nepali-datepicker/style.css';`,
        ``,
        `<${def.reactComponent}${reactProps(options)} />`,
      ].join('\n');

    case 'vue':
      return [
        `<script setup lang="ts">`,
        `import { ${def.vueComponent} } from 'advance-nepali-datepicker/vue';`,
        `import 'advance-nepali-datepicker/style.css';`,
        `</script>`,
        ``,
        `<template>`,
        `  <${def.vueComponent} :options="${jsInline(options)}" />`,
        `</template>`,
      ].join('\n');

    case 'jquery':
      return [
        `<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>`,
        `<script src="https://unpkg.com/advance-nepali-datepicker/dist/advance-nepali-datepicker.umd.cjs"></script>`,
        ``,
        `$('#picker').${def.jqueryFn}(${jsObject(options)});`,
      ].join('\n');

    default:
      return '';
  }
}
