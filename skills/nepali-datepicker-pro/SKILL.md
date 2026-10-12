---
name: nepali-datepicker-pro
description: Add, configure, or debug nepali-datepicker-pro (BS/AD Bikram Sambat ↔ Gregorian date, datetime, range, month, year, time and multi-date pickers) in a project. Covers the vanilla JS, <script>/UMD, jQuery, Vue 3, React and custom-element entry points, holidays/events, language, theming and form validation. Use whenever the project's package.json depends on nepali-datepicker-pro, or the user asks to add a Nepali/BS date picker.
---

# nepali-datepicker-pro

Framework-agnostic Bikram Sambat (BS) ↔ Gregorian (AD) date picker. One conversion
engine, many entry points: vanilla JS, plain `<script>`/UMD, jQuery, Vue 3, React, and custom
elements. Zero runtime dependencies. Six picker kinds: date+time, date range, month, year,
time-only, multi-date.

Full per-option tables, events, jQuery methods, and TypeScript types are in
`reference.md` next to this file — read it before guessing at an option name.
This file covers setup and the concepts that most often get missed.

## Install

```bash
npm install nepali-datepicker-pro
```

`react` and `vue` are **optional peer deps** — only needed if importing
`nepali-datepicker-pro/react` or `nepali-datepicker-pro/vue`. jQuery is likewise
optional peer dep, only needed for `nepali-datepicker-pro/jquery` / the UMD auto-plugin.

Always import the stylesheet once, anywhere in the app — pickers render unstyled
without it:

```ts
import 'nepali-datepicker-pro/style.css';
```

## Pick the right entry point

| Situation | Import from |
|---|---|
| Plain TS/JS, no framework | `nepali-datepicker-pro` (`mountDateTimePicker`, `mountDateRangePicker`, `mountMonthPicker`, `mountYearPicker`, `mountTimePicker`, `mountMultiDatePicker`) |
| No build step, `<script>` tag / legacy page | UMD bundle at `dist/nepali-datepicker-pro.umd.cjs`, global `NepaliPicker`, plus `data-nepali-datepicker` + `NepaliPicker.autoInit()` |
| React ≥18 | `nepali-datepicker-pro/react` — components take options **as props directly**, no options object |
| Vue ≥3 | `nepali-datepicker-pro/vue` — components take options via a single `:options` prop, plus `v-model` and `@event` |
| jQuery ≥3 | `nepali-datepicker-pro/jquery` (or the UMD bundle) with `window.jQuery` present — the plugin self-registers; `install($)` otherwise |
| Angular, Svelte, Astro, Lit, plain HTML with a bundler | `import 'nepali-datepicker-pro/element'` → `<nepali-date-picker>`, `<nepali-date-range-picker>`, `<nepali-month-picker>`, `<nepali-year-picker>`, `<nepali-time-picker>`, `<nepali-multi-date-picker>` |
| Holidays on the calendar | `nepali-datepicker-pro/holidays` (`nepalFixedHolidays`, `mergeEvents`) for the `events` option |

All entry points share the exact same option names and result shapes (`DateTimeResult`,
`DateRangeResult`, `MonthResult`, `YearResult`, `TimeResult`, `MultiDateResult`) — behavior never drifts between bindings, so an
option documented for one works identically in the others.

### Vanilla

```ts
import { mountDateTimePicker } from 'nepali-datepicker-pro';
import 'nepali-datepicker-pro/style.css';

const picker = mountDateTimePicker(document.querySelector('#picker'), {
  mode: 'BS',
  withTime: true,
  valueFormat: 'iso',
  onChange: (result) => console.log(result.formatted, result.value),
});
// picker.getValue() / picker.setValue(date) / picker.show() / picker.hide()
// picker.update({ minDate: new Date() }) / picker.destroy()
```

`mountDateRangePicker`, `mountMonthPicker`, `mountYearPicker`, `mountTimePicker` and
`mountMultiDatePicker` follow the identical `mount*(target, options) -> PickerInstance` shape.

### React

```tsx
import { NepaliDateTimePicker } from 'nepali-datepicker-pro/react';
import 'nepali-datepicker-pro/style.css';

<NepaliDateTimePicker withTime valueFormat="iso" submitName="appointment_date"
  onChange={(result) => console.log(result)} />
```

Props ARE the options — do not wrap them in an `options={...}` object like Vue.
Callbacks are stable across renders (safe to pass inline arrows). `ref` gives a `PickerHandle`
(`show`, `hide`, `clear`, `getValue`, `setValue`, `update`, `focus`, `instance`); `inputProps={{ id: 'dob' }}`
puts attributes on the created `<input>` so `<label htmlFor="dob">` works.

### Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NepaliDateTimePicker } from 'nepali-datepicker-pro/vue';
import 'nepali-datepicker-pro/style.css';
const date = ref<Date | null>(null);
</script>
<template>
  <NepaliDateTimePicker v-model="date" :options="{ mode: 'BS', withTime: true }"
    @change="(r) => console.log(r)" />
</template>
```

Options go through the single `:options` prop, not individual Vue props. `v-model`
syncs the plain AD `Date` (datetime), `{ start, end }` (range), full `MonthResult`
(month), year `number`, `{ hour, minute, second }` (time) or `Date[]` (multi) — not the formatted
string. A template ref exposes the same API as React's `ref`. Extra events: `@invalid(reason, message)`,
`@cancel` (range).

### jQuery

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://unpkg.com/nepali-datepicker-pro/dist/nepali-datepicker-pro.umd.cjs"></script>
<script>
  $('#picker').nepaliDateTimePicker({ withTime: true, valueFormat: 'iso' });
  // Callback option, or a native listener — NOT $(el).on('select.nepaliDatePicker'):
  // jQuery parses ".nepaliDatePicker" as a namespace and never fires.
  $('#picker').nepaliDateTimePicker({ onChange: (result) => console.log(result) });
  document.getElementById('picker').addEventListener('select.nepaliDatePicker', (e) => console.log(e.detail));
</script>
```

## The concept that trips people up: display vs. submitted value

`mode` (BS/AD shown) and `displayFormat` (what's printed in the input) are **fully
decoupled** from the machine value sent to a backend. A user can see BS dates with
Nepali digits while the form silently submits an AD ISO string — no conversion glue
needed on your end:

```ts
{
  valueFormat: 'iso',       // 'iso' (AD ISO, default) | 'iso-bs' | 'timestamp'
  submitName: 'joined_date' // adds <input type="hidden" name="joined_date">,
                             // and removes `name` from the visible field
}
```

- `submitName` → select2-style hidden input, works with a plain `<form method="post">`, zero JS.
- `altField` → jQuery-UI-style, points at an *existing* element/selector instead of creating one.
- `altFormat` → format override for `altField`/`submitName` only (visible input and submitted value can differ).
- `NepaliMonthPicker`'s value is always a **range** (`start`/`end`, first→last day of the BS month) — `submitName`/`altField` there take `{ start, end }`, not a single field name.

## Gotchas

- Forgetting `import 'nepali-datepicker-pro/style.css'` — nothing looks broken in code, but the popup renders unstyled.
- `data-nepali-datepicker` HTML attribute auto-init only covers a subset of options (`data-with-time`, `data-mode`, `data-language`, `data-value-format`, `data-submit-name`, `data-fiscal-start-month`, etc. — see reference.md). Anything else (callbacks, `disabledDates`, `presets`) needs the JS API, not attributes.
- React: event callbacks can be inline, but wrap function *options* (`disabledDates`, `disabledTimes`) in `useCallback` — a new function each render re-applies that option.
- Vue: passing options as top-level component props (React-style) instead of `:options="{...}"` silently does nothing.
- jQuery: methods return the plugin (chainable) except `'getValue'`/`'getState'`, which return a value/`undefined` for the *first* matched element only.
- Range picker's `onChange` fires on every click/preset selection *before* Apply; `onApply` is the commit event — don't treat `onChange` as "range is final."
- `withTime` defaults to a **12-hour** clock (`timeFormat: '12h'`); pass `timeFormat: '24h'` for 24-hour. The submitted `value` is 24-hour ISO either way. On phone widths (≤ 560px) the date-time picker is two steps: date, then time.
- One calendar for the whole app (no BS/AD switcher): `setDefaults({ mode: 'AD', allowModeToggle: false })` once at the app entry, **before** any picker mounts — it only affects pickers mounted afterwards. Works the same under React/Vue/jQuery. Live pickers switch with `picker.update({ mode })`. The month picker is BS-only and ignores `mode`.
- `minDate`/`maxDate` accept relative string tokens (`'+7d'`, `'-1y'`, `'today'`) as well as `Date` objects.
- BS year support is `1970`–`2100` (`BS_YEAR_MIN`/`BS_YEAR_MAX`); dates outside that range aren't representable.
- The "BS"/"AD" label after the field's value is **display only** — it's not part of the input's value, `formatted`, or the submitted value. Don't strip it in your code; hide it with `showCalendarSuffix: false` if unwanted.
- The range picker **blocks ranges that cross disabled days** by default (the end can't go past the first disabled day). Set `allowDisabledInRange: true` for the old behavior.
- `events` loaders are **cached per month** — the loader runs once per shown month, so changed server data won't show until remount or `update({ events: newLoader })`.
- `nepali-datepicker-pro/holidays` has **fixed-date days only** (New Year, Republic Day, Constitution Day…). Lunar festivals (Dashain, Tihar, Holi, Teej, Buddha Jayanti…) are not included — add them through `events` and combine with `mergeEvents`.
- `language` (UI text, default `'bilingual'`), `locale` (formatted value digits/names) and `script` (calendar digits/names) are three different options. `setDefaults(regional.ne)` = whole UI in Nepali.
- Dark mode: `theme: 'dark' | 'auto'`, or `data-ndp-theme="dark"` on `<html>`. Token names are `--ndp-color-*` (e.g. `--ndp-color-primary`), not `--ndp-accent`.
- `data-*` auto-init only covers the date-time, range and month pickers. Year/time/multi need `mount*`, a framework component, or a custom element.
- The multi-date picker's field is never typeable (`allowInput` is forced off).
- Custom elements: attributes only cover plain options; functions, `events`, `presets`, `strings` go on the element's `options` property. Their DOM events are plain `change`/`clear`/`open`/`close`/`invalid`, not `select.nepali*`.

## When unsure of an option name or shape

Read `reference.md` in this same skill directory — it has the entry-point list, the full
per-picker options tables, shared options, holidays/events, language, forms/validation, custom
elements, events table, jQuery methods table, `PresetDefinition`/`PickerInstance`
shapes, and the TypeScript type export list. Don't guess an option name; the package
ships strict `.d.ts` files (`dist/*.d.ts`) that are the ground truth if reference.md
and the installed version have drifted.
