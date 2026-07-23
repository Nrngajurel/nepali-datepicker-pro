---
name: nepali-datepicker-pro
description: Add, configure, or debug nepali-datepicker-pro (BS/AD Bikram Sambat ↔ Gregorian date, datetime, range, and month pickers) in a project. Covers the vanilla JS, <script>/UMD, jQuery, Vue 3, and React entry points. Use whenever the project's package.json depends on nepali-datepicker-pro, or the user asks to add a Nepali/BS date picker.
---

# nepali-datepicker-pro

Framework-agnostic Bikram Sambat (BS) ↔ Gregorian (AD) date picker. One conversion
engine, five entry points: vanilla JS, plain `<script>`/UMD, jQuery, Vue 3, React.
Zero runtime dependencies. Three picker kinds: date+time, date range, month.

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
| Plain TS/JS, no framework | `nepali-datepicker-pro` (`mountDateTimePicker`, `mountDateRangePicker`, `mountMonthPicker`) |
| No build step, `<script>` tag / legacy page | UMD bundle at `dist/nepali-datepicker-pro.umd.cjs`, global `NepaliPicker`, plus `data-nepali-datepicker` + `NepaliPicker.autoInit()` |
| React ≥18 | `nepali-datepicker-pro/react` — components take options **as props directly**, no options object |
| Vue ≥3 | `nepali-datepicker-pro/vue` — components take options via a single `:options` prop, plus `v-model` and `@event` |
| jQuery ≥3 | `nepali-datepicker-pro/jquery`, or just import the core package with `window.jQuery` present — the plugin self-registers |

All five share the exact same option names and result shapes (`DateTimeResult`,
`DateRangeResult`, `MonthResult`) — behavior never drifts between bindings, so an
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

`mountDateRangePicker` and `mountMonthPicker` follow the identical
`mount*(target, options) -> PickerInstance` shape.

### React

```tsx
import { NepaliDateTimePicker } from 'nepali-datepicker-pro/react';
import 'nepali-datepicker-pro/style.css';

<NepaliDateTimePicker withTime valueFormat="iso" submitName="appointment_date"
  onChange={(result) => console.log(result)} />
```

Props ARE the options — do not wrap them in an `options={...}` object like Vue.
Callbacks are stable across renders (safe to pass inline arrows).

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
syncs the plain AD `Date` (datetime), `{ start, end }` (range), or full `MonthResult`
(month) — not the formatted string.

### jQuery

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://unpkg.com/nepali-datepicker-pro/dist/nepali-datepicker-pro.umd.cjs"></script>
<script>
  $('#picker').nepaliDateTimePicker({ withTime: true, valueFormat: 'iso' });
  $('#picker').on('select.nepaliDatePicker', (e, result) => console.log(result));
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
- `data-nepali-datepicker` HTML attribute auto-init only covers a small subset of options (`data-with-time`, `data-value-format`, `data-submit-name`, `data-fiscal-start-month`, etc. — see reference.md). Anything else (callbacks, `disabledDates`, `presets`) needs the JS API, not attributes.
- Vue: passing options as top-level component props (React-style) instead of `:options="{...}"` silently does nothing.
- jQuery: methods return the plugin (chainable) except `'getValue'`/`'getState'`, which return a value/`undefined` for the *first* matched element only.
- Range picker's `onChange` fires on every click/preset selection *before* Apply; `onApply` is the commit event — don't treat `onChange` as "range is final."
- `minDate`/`maxDate` accept relative string tokens (`'+7d'`, `'-1y'`, `'today'`) as well as `Date` objects.
- BS year support is `1970`–`2100` (`BS_YEAR_MIN`/`BS_YEAR_MAX`); dates outside that range aren't representable.

## When unsure of an option name or shape

Read `reference.md` in this same skill directory — it has the full per-picker
options table, events table, jQuery methods table, `PresetDefinition`/`PickerInstance`
shapes, and the TypeScript type export list. Don't guess an option name; the package
ships strict `.d.ts` files (`dist/*.d.ts`) that are the ground truth if reference.md
and the installed version have drifted.
