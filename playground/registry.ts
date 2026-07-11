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
  buildOptions: (v: Record<string, unknown>) => Record<string, unknown>;
  describe: (detail: { formatted: string; start?: Date; end?: Date }) => string;
}

const LOCALE: Choice[] = [
  { value: 'ne', label: 'Nepali (ne)' },
  { value: 'en', label: 'English (en)' },
];

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
      { key: 'withTime', label: 'Include time', type: 'bool', def: false },
      { key: 'timeFormat', label: 'Time format', type: 'select', def: '24h', choices: [{ value: '24h', label: '24-hour' }, { value: '12h', label: '12-hour (AM/PM)' }], enabledWhen: (v) => !!v.withTime },
      { key: 'minuteStep', label: 'Minute step', type: 'number', def: 1, min: 1, max: 30, enabledWhen: (v) => !!v.withTime },
      { key: 'locale', label: 'Locale', type: 'select', def: 'ne', choices: LOCALE },
      { key: 'closeOnSelect', label: 'Close on select', type: 'select', def: 'default', choices: [{ value: 'default', label: 'Default' }, { value: 'true', label: 'Always' }, { value: 'false', label: 'Never' }] },
      { key: 'minDate', label: 'Min date', hint: "Date | 'today' | '+7d'", type: 'text', def: '', placeholder: 'today' },
      { key: 'maxDate', label: 'Max date', type: 'text', def: '', placeholder: '+1m' },
      { key: 'disableWeekends', label: 'Disable weekends', type: 'bool', def: false },
      { key: 'displayFormat', label: 'Display format', hint: 'dayjs-style tokens', type: 'text', def: '', placeholder: 'YYYY-MM-DD HH:mm' },
    ],
    buildOptions(v) {
      const o: Record<string, unknown> = {};
      if (v.withTime) o.withTime = true;
      if (v.withTime && v.timeFormat !== '24h') o.timeFormat = v.timeFormat;
      if (v.withTime && Number(v.minuteStep) !== 1) o.minuteStep = Number(v.minuteStep);
      if (v.locale !== 'ne') o.locale = v.locale;
      if (v.closeOnSelect !== 'default') o.closeOnSelect = v.closeOnSelect === 'true';
      if (v.minDate) o.minDate = v.minDate;
      if (v.maxDate) o.maxDate = v.maxDate;
      if (v.disableWeekends) o.disabledWeekdays = [0, 6];
      if (v.displayFormat) o.displayFormat = v.displayFormat;
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
      { key: 'fiscalStartMonth', label: 'Fiscal start month', hint: '1–12 (Shrawan = 4)', type: 'number', def: 4, min: 1, max: 12 },
      { key: 'autoApply', label: 'Auto-apply', hint: 'commit on 2nd click', type: 'bool', def: false },
      { key: 'presets', label: 'Presets', type: 'select', def: 'default', choices: [{ value: 'default', label: 'Default presets' }, { value: 'none', label: 'No presets' }] },
      { key: 'minDate', label: 'Min date', hint: "Date | 'today' | '-1y'", type: 'text', def: '', placeholder: '-1y' },
      { key: 'maxDate', label: 'Max date', type: 'text', def: '', placeholder: 'today' },
      { key: 'disableWeekends', label: 'Disable weekends', type: 'bool', def: false },
      { key: 'displayFormat', label: 'Display format', type: 'text', def: '', placeholder: 'YYYY-MM-DD' },
    ],
    buildOptions(v) {
      const o: Record<string, unknown> = {};
      if (v.mode !== 'BS') o.mode = v.mode;
      if (Number(v.fiscalStartMonth) !== 4) o.fiscalStartMonth = Number(v.fiscalStartMonth);
      if (v.autoApply) o.autoApply = true;
      if (v.presets === 'none') o.presets = false;
      if (v.minDate) o.minDate = v.minDate;
      if (v.maxDate) o.maxDate = v.maxDate;
      if (v.disableWeekends) o.disabledWeekdays = [0, 6];
      if (v.displayFormat) o.displayFormat = v.displayFormat;
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
    ],
    buildOptions(v) {
      const o: Record<string, unknown> = {};
      if (v.locale !== 'ne') o.locale = v.locale;
      if (v.displayFormat) o.displayFormat = v.displayFormat;
      if (v.minYear) o.minYear = Number(v.minYear);
      if (v.maxYear) o.maxYear = Number(v.maxYear);
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
  if (Array.isArray(v)) return `[${v.map(jsValue).join(', ')}]`;
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
