# nepali-datepicker-pro — full reference

Companion to `SKILL.md`. Everything here mirrors the package's own `README.md` and
`.d.ts` files — if the installed version has drifted, trust `dist/*.d.ts` over this.

## `NepaliDateTimePicker`

Single date, optional same-screen time picker.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'BS' \| 'AD'` | `'BS'` | Calendar system the picker opens in |
| `allowModeToggle` | `boolean` | `true` | Show the BS/AD swap button on the input |
| `showSecondaryCalendar` | `boolean` | `true` | Show the other calendar as a hint on header/grid/day cells |
| `value` / `defaultValue` | `Date \| null` | — | Controlled / initial selected date |
| `withTime` | `boolean` | `false` | Show the time picker (spinbuttons + wheel) |
| `timeFormat` | `'12h' \| '24h'` | `'24h'` | Clock style when `withTime` is on |
| `minuteStep` | `number` | `1` | Increment of the minute spinner |
| `minTime` / `maxTime` | `{ hour, minute }` | — | Clamp the selectable time of day |
| `disabledTimes` | `(h, m) => boolean` | — | Disable specific hours/minutes |
| `defaultTime` | `{ hour, minute }` | now | Time used when `withTime` turns on with no value |
| `locale` | `'ne' \| 'en'` | `'en'` | Digit and month-name language |
| `minDate` / `maxDate` | `Date \| 'today' \| '+7d'` | — | Earliest / latest selectable day (relative tokens allowed) |
| `disabledWeekdays` | `number[]` | `[]` | `0` = Sunday … `6` = Saturday |
| `disabledDates` | `(date) => boolean` | — | Disable a specific day |
| `displayFormat` | `string` | `YYYY-MM-DD[ HH:mm]` | dayjs-style tokens for the input text |
| `closeOnSelect` | `boolean` | `true` unless `withTime` | Close popup right after a day is picked |
| `allowInput` | `boolean` | `true` | Segmented, keyboard-editable input instead of read-only |
| `valueFormat` | `ValueFormat` | `'iso'` | Shape of the machine value — see "Value formats" below |
| `submitName` | `string` | — | Hidden `<input name>` carrying the machine value |
| `altField` | `string \| HTMLElement` | — | Write the machine value into an existing field |
| `altFormat` | `ValueFormat` | `valueFormat` | Override format for `altField`/`submitName` only |

**Events:** `onChange(result)`, `onChangeMonthYear(year, month)`, `onOpen()`, `onClose()`,
plus bubbling DOM event `select.nepaliDatePicker` (detail = `DateTimeResult`).

**HTML attrs (auto-init only):** `data-with-time`, `data-time-format`, `data-minute-step`,
`data-value-format`, `data-submit-name`.

## `NepaliDateRangePicker`

Start/end range with a presets rail, fiscal-year helpers, BS/AD switch.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'BS' \| 'AD'` | `'BS'` | Calendar system the range opens in |
| `allowModeToggle` | `boolean` | `true` | Show the BS/AD swap button |
| `showSecondaryCalendar` | `boolean` | `true` | Show the other calendar as a hint |
| `value` / `defaultValue` | `{ start, end } \| null` | — | Controlled / initial range |
| `presets` | `PresetDefinition[] \| 'default' \| false` | `'default'` | Quick-range rail incl. "Pick a Month"; `false` hides it |
| `defaultPresetId` | `string \| null` | — | Preset highlighted when the popup opens |
| `fiscalStartMonth` | `number (1–12)` | `4` | BS month the fiscal year starts (Shrawan = 4) |
| `autoApply` | `boolean` | `false` | Commit on the second click instead of an Apply button |
| `minDate` / `maxDate` | `Date \| 'today' \| '-1y'` | — | Earliest / latest selectable day |
| `disabledWeekdays` | `number[]` | `[]` | Grey-out weekdays |
| `maxRangeSpanDays` | `number \| null` | — | Reject ranges longer than N days |
| `autoUpdateInput` | `boolean` | `true` | Write the applied range back into the input text |
| `allowInput` | `boolean` | `true` | Segmented `YYYY-MM-DD – YYYY-MM-DD` typing |
| `displayFormat` | `string` | `YYYY-MM-DD` | dayjs-style tokens for each bound |
| `valueFormat` | `ValueFormat` | `'iso'` | Shape of the machine value(s) |
| `submitName` | `string \| { start, end }` | — | One combined field, or a start/end pair |
| `altField` | `string \| HTMLElement \| { start, end }` | — | Same, targeting existing field(s) |

**Events:** `onApply(result)`, `onChange({ start?, end? })` (fires on first click / preset
selection, before Apply — not the commit event), `onOpen()`, `onClose()`, DOM event
`apply.nepaliDateRangePicker`.

**HTML attrs (auto-init only):** `data-fiscal-start-month`, `data-value-format`.

`PresetDefinition` shape:

```ts
interface PresetDefinition {
  id: string;
  label: string;
  kind: 'range' | 'submenu';
  resolve?: (ctx: PresetContext) => { start: Date; end: Date };
  items?: PresetDefinition[]; // for kind: 'submenu'
}
```

## `NepaliMonthPicker`

Pick one BS month, get back the AD `{ start, end }` range it covers.

| Option | Type | Default | Description |
|---|---|---|---|
| `value` / `defaultValue` | `{ year, month } \| null` | — | Controlled / initial selected BS month |
| `locale` | `'ne' \| 'en'` | `'en'` | Digit and month-name language |
| `showSecondaryCalendar` | `boolean` | `true` | Show the AD calendar as a hint |
| `minYear` / `maxYear` | `number (BS)` | `1970` / `2100` | Range of BS years the grid can navigate |
| `displayFormat` | `string` | `MMMM YYYY` | dayjs-style tokens for the input text |
| `allowInput` | `boolean` | `true` | Segmented `YYYY-MM` typing |
| `valueFormat` | `ValueFormat` | `'iso'` | A month is emitted as a date **range** (first → last day) |
| `submitName` | `string \| { start, end }` | — | e.g. `{ start: 'from_date', end: 'to_date' }` for `WHERE date BETWEEN` filters |
| `altField` | `string \| HTMLElement \| { start, end }` | — | Same, targeting existing field(s) |

**`onChange` payload:** `{ year, month, start, end (AD Dates), startValue, endValue, value ('from,to'), formatted }`

**HTML attrs (auto-init only):** `data-value-format`, `data-submit-name`.

## Shared options (every picker)

| Option | Type | Default | Description |
|---|---|---|---|
| `clearable` | `boolean` | `true` | Show a × button to clear the current value |
| `appendTo` | `string \| HTMLElement` | `document.body` | Where the popup portal is mounted |
| `opens` | `'left' \| 'right' \| 'center' \| 'auto'` | `'auto'` | Horizontal alignment relative to the input |
| `drops` | `'down' \| 'up' \| 'auto'` | `'auto'` | Whether the popup opens below or above the input |
| `adapter` | `CalendarAdapter` | built-in | Swap the BS↔AD conversion engine (advanced) |

## Value formats

```ts
type ValueFormat =
  | 'iso'        // AD ISO string, e.g. "2026-07-24" or "2026-07-24T12:30:00.000Z"
  | 'iso-bs'     // BS ISO-shaped string, e.g. "2083-04-08"
  | 'timestamp'  // Unix ms number
  | 'date-object'
  | { calendar: 'AD' | 'BS'; format: string }; // custom dayjs-style token format
```

`valueFormat` controls the value on `onChange`/DOM events and written to
`altField`/`submitName`. It is independent of `mode` and `displayFormat`.

## `PickerInstance` (return value of every `mount*` function)

```ts
interface PickerInstance<TValue, TOptions> {
  getState(): unknown;
  getValue(): TValue | null;
  setValue(value: TValue | null): void;
  show(): void;
  hide(): void;
  update(patch: Partial<TOptions>): void;
  destroy(): void;
  onChange(cb: (value: TValue) => void): () => void; // returns unsubscribe fn
}
```

## jQuery plugin methods

Installed automatically on `$.fn` when the package is imported and `window.jQuery`
is present (waits for `DOMContentLoaded` if jQuery loads after the bundle).

| Method | Returns | Description |
|---|---|---|
| `'getValue'` | result or `undefined` | Value of the **first** matched element |
| `'getState'` | state or `undefined` | Internal state of the **first** matched element |
| `'setValue'` | `$` (chainable) | `('setValue', undefined, newValue)` |
| `'option'` | `$` (chainable) | `('option', 'minDate', new Date())` |
| `'show'` | `$` (chainable) | Open the popup |
| `'hide'` | `$` (chainable) | Close the popup |
| `'destroy'` | `$` (chainable) | Tear down the instance and clean up |

Same three plugin names as the mount functions, camelCased: `nepaliDateTimePicker`,
`nepaliDateRangePicker`, `nepaliMonthPicker`.

## Events summary

| Picker | JS callback | DOM event (bubbles, `event.detail` = result) |
|---|---|---|
| `NepaliDateTimePicker` | `onChange(result)`, `onChangeMonthYear(y, m)` | `select.nepaliDatePicker` |
| `NepaliDateRangePicker` | `onApply(result)`, `onChange({ start?, end? })` | `apply.nepaliDateRangePicker` |
| `NepaliMonthPicker` | `onChange(result)` | `select.nepaliMonthPicker` |

Every picker also fires `onOpen()` / `onClose()`.

Vue 3 template events (alternative to passing callbacks through `:options`; both fire
if you do both): `@change`, `@open`, `@close`, and `@changeMonthYear` (datetime only).

## Autoinit / vanilla helpers

```ts
import { setDefaults, regional, autoInit } from 'nepali-datepicker-pro';

setDefaults({ locale: 'ne', valueFormat: 'iso' }); // set app-wide defaults before mounting
autoInit(); // scan the document (or a given root) for [data-nepali-datepicker]
```

## TypeScript exports (barrel: `nepali-datepicker-pro`)

```ts
import type {
  DateTimeResult,
  DateRangeResult,
  MonthResult,
  ValueFormat,
  PickerInstance,
  CalendarAdapter,
  DateMath,
} from 'nepali-datepicker-pro';
import {
  mountDateTimePicker,
  mountDateRangePicker,
  mountMonthPicker,
  setDefaults,
  regional,
  autoInit,
  createDateTimeController,
  createDateRangeController,
  createMonthPickerController,
  BsAdCalendarAdapter,
  defaultCalendarAdapter,
  nativeDateMath,
  formatDateValue,
  parseDateValue,
  formatRange,
} from 'nepali-datepicker-pro';
```

`createDateTimeController` / `createDateRangeController` / `createMonthPickerController`
are the headless state machines underneath the DOM mount functions — only reach for
these when building a fully custom renderer; for a normal integration use `mount*`
or the framework components instead.

## Styling

Single stylesheet, CSS custom properties for theming — no CSS-in-JS, no Tailwind
requirement, no shadow DOM:

```css
:root {
  --ndp-accent: #2563eb;
  --ndp-radius: 8px;
  --ndp-font: 'Inter', sans-serif;
}
```

## Browser / version support

Evergreen browsers only (Chrome/Firefox/Safari/Edge, last 2 versions), targets
ES2020+, no IE11. Consuming Node ≥18. BS years `1970`–`2100`.
