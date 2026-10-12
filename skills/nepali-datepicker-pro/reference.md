# nepali-datepicker-pro — full reference

Companion to `SKILL.md`. Everything here mirrors the package's own `README.md` and
`.d.ts` files — if the installed version has drifted, trust `dist/*.d.ts` over this.

## Entry points

| Import | What it gives you |
|---|---|
| `nepali-datepicker-pro` | `mountDateTimePicker`, `mountDateRangePicker`, `mountMonthPicker`, `mountYearPicker`, `mountTimePicker`, `mountMultiDatePicker`, `setDefaults`, `regional`, `autoInit`, helpers, types |
| `nepali-datepicker-pro/react` | `NepaliDateTimePicker`, `NepaliDateRangePicker`, `NepaliMonthPicker`, `NepaliYearPicker`, `NepaliTimePicker`, `NepaliMultiDatePicker`; type `PickerHandle` |
| `nepali-datepicker-pro/vue` | Same six component names; type `PickerExpose` |
| `nepali-datepicker-pro/jquery` | Registers `$.fn.nepaliDateTimePicker`, `nepaliDateRangePicker`, `nepaliMonthPicker`, `nepaliYearPicker`, `nepaliTimePicker`, `nepaliMultiDatePicker`; exports `install($)` |
| `nepali-datepicker-pro/element` | Registers custom elements `<nepali-date-picker>`, `<nepali-date-range-picker>`, `<nepali-month-picker>`, `<nepali-year-picker>`, `<nepali-time-picker>`, `<nepali-multi-date-picker>` (side-effect import) |
| `nepali-datepicker-pro/holidays` | `nepalFixedHolidays()`, `mergeEvents()` for the `events` option |
| `nepali-datepicker-pro/style.css` | The one stylesheet — always import it |
| UMD `dist/nepali-datepicker-pro.umd.cjs` | Global `NepaliPicker` (everything from the main entry, plus the jQuery plugin and `NepaliPicker.installJQuery($)`) |

Every subpath has ESM and CommonJS builds (`require('nepali-datepicker-pro/react')` works).

## `NepaliDateTimePicker`

Single date, optional same-screen time picker. Click the header to jump by month/year.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'BS' \| 'AD'` | `'BS'` | Calendar system the picker opens in |
| `allowModeToggle` | `boolean` | `true` | Show the BS/AD swap button on the input |
| `showSecondaryCalendar` | `boolean` | `true` | Show the other calendar as a small hint on the header, month/year grid, and day cells. `false` shows only the active `mode` |
| `value` / `defaultValue` | `Date \| null` | — | Controlled / initial selected date |
| `withTime` | `boolean` | `false` | Show the time picker (keyboard-accessible spinbuttons + wheel) |
| `timeFormat` | `'12h' \| '24h'` | `'12h'` | Clock style when `withTime` is on (12-hour with AM/PM by default; the submitted `value` is always 24-hour ISO) |
| `minuteStep` | `number` | `1` | Increment of the minute spinner |
| `minTime` / `maxTime` | `{ hour, minute }` | — | Clamp the selectable time of day |
| `disabledTimes` | `(h, m) => boolean` | — | Disable specific hours/minutes |
| `defaultTime` | `{ hour, minute }` | now | Time used when `withTime` turns on with no value |
| `locale` | `'ne' \| 'en'` | `'en'` | Digit and month-name language |
| `withSeconds` | `boolean` | `false` | Also pick seconds (needs `withTime`) |
| `timeInputStyle` | `'spinner' \| 'dropdown'` | `'spinner'` | `'spinner'`: typeable fields plus scroll wheels. `'dropdown'`: native selects — compact, and familiar to screen-reader users |
| `minDate` / `maxDate` | `Date \| 'today' \| '+7d'` | — | Earliest / latest selectable day (relative tokens allowed) |
| `disabledWeekdays` | `number[]` | `[]` | `0` = Sunday … `6` = Saturday |
| `disabledDates` | `(date) => boolean` | — | Disable a specific day |
| `dayCellProps` | `(date, bs) => DayCellProps \| null` | — | Per-day `{ disabled, className, title, badge, holiday }` — see [Holidays & events]("Holidays & events" below) |
| `beforeShowDay` | `(date) => { selectable, cssClass?, tooltip? }` | — | jQuery-UI-style alias for `dayCellProps` |
| `events` | `CalendarEvent[] \| loader` | — | Holidays and events to mark on the calendar — see [Holidays & events]("Holidays & events" below) |
| `weekStartsOn` | `0`–`6` | `0` (Sunday) | First column of the week |
| `weekendDays` | `number[]` | `[6]` (Saturday) | Days shown in red as the weekend |
| `displayFormat` | `string` | `YYYY-MM-DD[ HH:mm]` | dayjs-style tokens for the input text. A numeric format also sets the typing order: `DD/MM/YYYY` is typed day first |
| `showButtonPanel` | `{ today?, clear?, close? }` | Today chip; plus Clear/Done with `withTime` | Choose the footer buttons, including in date-only mode |
| `closeOnSelect` | `boolean` | `true` unless `withTime` | Close the popup right after a day is picked |
| `allowInput` | `boolean` | `true` | Segmented, keyboard-editable input instead of read-only |
| `valueFormat` | see [below]("Value formats" below) | `'iso'` | Shape of the machine value |
| `submitName` | `string` | — | Hidden `<input name>` carrying the machine value |
| `altField` | `string \| HTMLElement` | — | Write the machine value into an existing field |
| `altFormat` | `ValueFormat` | `valueFormat` | Override format for `altField`/`submitName` only |

**Events:** `onChange(result)`, `onChangeMonthYear(year, month)`, `onClear()`, `onInvalid(reason, message)`, `onOpen()`, `onClose()`, and bubbling DOM events `select.nepaliDatePicker` / `clear.nepaliDatePicker`.

**HTML attrs:** `data-with-time`, `data-with-seconds`, `data-time-format`, `data-minute-step`, plus the shared `data-mode`, `data-language`, `data-theme`, `data-display-format`, `data-min-date`, `data-max-date`, `data-inline`, `data-required`, `data-value-format`, `data-submit-name`, `data-alt-field`.

## `NepaliDateRangePicker`

Start/end range with a presets rail, fiscal-year helpers, and a BS/AD switch.

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'BS' \| 'AD'` | `'BS'` | Calendar system the range opens in |
| `allowModeToggle` | `boolean` | `true` | Show the BS/AD swap button |
| `showSecondaryCalendar` | `boolean` | `true` | Show the other calendar as a small hint on the header, month/year grid, and day cells. `false` shows only the active `mode` |
| `value` / `defaultValue` | `{ start, end } \| null` | — | Controlled / initial range |
| `presets` | `Array<PresetDefinition \| BuiltInPresetId> \| 'default' \| false` | `'default'` | Quick-range rail, includes "Pick a Month"; `false` hides it. Mix built-in ids with your own definitions (see below) |
| `ranges` | `Record<string, [Date, Date]>` | — | daterangepicker.js-style fixed ranges |
| `defaultPresetId` | `string \| null` | — | Preset highlighted when the popup opens |
| `fiscalStartMonth` | `number (1–12)` | `4` | BS month the fiscal year starts (Shrawan = 4) |
| `fiscalYearLookback` | `number` | `5` | How many fiscal years (current and past) the fiscal-year submenu lists |
| `numberOfMonths` | `1 \| 2` | `1` | Months shown side by side (stacked on phones) |
| `linkedCalendars` | `boolean` | `true` | With two months: page them together, or `false` to navigate each one independently |
| `alwaysShowCalendars` | `boolean` | `true` | `false` shows only the presets until "Custom Range" is chosen |
| `autoApply` | `boolean` | `false` | Commit on the second click instead of an Apply button |
| `minDate` / `maxDate` | `Date \| 'today' \| '-1y'` | — | Earliest / latest selectable day |
| `disabledWeekdays` | `number[]` | `[]` | Grey-out weekdays |
| `disabledDates` | `(date) => boolean` | — | Disable a specific day |
| `dayCellProps` / `beforeShowDay` / `events` / `weekStartsOn` / `weekendDays` | | | Same as the date-time picker |
| `maxRangeSpanDays` | `number \| null` | — | Longest allowed range, in days (counting both ends) |
| `minRangeSpanDays` | `number \| null` | — | Shortest allowed range, in days (counting both ends) |
| `allowDisabledInRange` | `boolean` | `false` | Allow a range with disabled days inside it. By default the end can't be picked past the first disabled day |
| `withTime` | `boolean` | `false` | Pick a time for each end of the range |
| `timeFormat` | `'12h' \| '24h'` | `'12h'` | Clock style with `withTime` |
| `minuteStep` | `number` | `1` | Minute increment with `withTime` |
| `locale` | `RangePickerLocale` | — | daterangepicker-style block: `format`, `separator`, `applyLabel`, `cancelLabel`, `customRangeLabel`, `daysOfWeek`, `monthNames`, `firstDay` (`weekLabel` is deprecated and ignored) |
| `autoUpdateInput` | `boolean` | `true` | Write the applied range back into the input text |
| `allowInput` | `boolean` | `true` | Segmented `YYYY-MM-DD – YYYY-MM-DD` typing |
| `displayFormat` | `string` | `YYYY-MM-DD` | dayjs-style tokens for each bound |
| `valueFormat` | see below | `'iso'` | Shape of the machine value(s) |
| `submitName` | `string \| { start, end }` | — | One combined field, or a start/end pair |
| `altField` | `string \| HTMLElement \| { start, end }` | — | Same, targeting existing field(s) |
| `altFormat` | `ValueFormat` | `valueFormat` | Override format for `altField`/`submitName` only |

**Events:** `onApply(result)`, `onChange({ start?, end? })` (fires on first click / preset selection, before Apply), `onCancel()` (popup dismissed with Cancel, unapplied changes discarded), `onClear()`, `onInvalid(reason, message)`, `onOpen()`, `onClose()`, DOM events `apply.nepaliDateRangePicker` / `clear.nepaliDateRangePicker`.

**HTML attrs:** `data-fiscal-start-month`, `data-number-of-months`, plus the shared ones listed under the date-time picker (except the time attributes).

**Built-in presets.** List them by id next to your own definitions: `'today'`, `'yesterday'`, `'last7'`, `'last15'`, `'last30'`, `'last45'`, `'last60'`, `'last90'`, `'next7'`, `'next15'`, `'next30'`, `'thisWeek'`, `'lastWeek'`, `'thisMonth'`, `'lastMonth'`, `'nextMonth'`, `'fytd'` (fiscal year to date), `'fiscalYear'` (submenu), `'month'` ("Pick a Month") and `'custom'`. The default rail is `today`, `last7`–`last60`, `fytd`, `fiscalYear`, `month`, `custom`. "Last N days" includes today. "This month" follows the active calendar (a BS or an AD month) and "this week" starts on `weekStartsOn`. Presets are trimmed to `minDate`/`maxDate`. `buildPresetLibrary(options, adapter)` returns every built-in definition keyed by id.

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

```ts
mountDateRangePicker(input, {
  numberOfMonths: 2,
  maxRangeSpanDays: 31,
  presets: ['today', 'next7', 'thisWeek', 'thisMonth', 'lastMonth', 'custom'],
});
```

## `NepaliMonthPicker`

Pick one BS month — for a monthly report or a payslip filter — and get back the AD date range it covers.

| Option | Type | Default | Description |
|---|---|---|---|
| `value` / `defaultValue` | `{ year, month } \| null` | — | Controlled / initial selected BS month |
| `locale` | `'ne' \| 'en'` | `'en'` | Digit and month-name language |
| `showSecondaryCalendar` | `boolean` | `true` | Show the AD calendar as a small hint on the header and month/year grid. `false` shows only BS |
| `minYear` / `maxYear` | `number (BS)` | `1970` / `2100` | Range of BS years the grid can navigate |
| `minMonth` / `maxMonth` | `{ year, month } \| null` (BS) | — | Earliest / latest pickable month |
| `disabledMonths` | `(year, month) => boolean` | — | Show a month but don't let it be picked |
| `displayFormat` | `string` | `MMMM YYYY` | dayjs-style tokens for the input text |
| `allowInput` | `boolean` | `true` | Segmented `YYYY-MM` typing |
| `valueFormat` | see below | `'iso'` | A month is emitted as a date **range** (first → last day) |
| `submitName` | `string \| { start, end }` | — | e.g. `{ start: 'from_date', end: 'to_date' }` for `WHERE date BETWEEN` filters |
| `altField` | `string \| HTMLElement \| { start, end }` | — | Same, targeting existing field(s) |
| `altFormat` | `ValueFormat` | `valueFormat` | Override format for `altField`/`submitName` only |

**`onChange` payload:** `{ year, month, start, end (AD Dates), startValue, endValue, value ('from,to'), formatted }`

**Events:** `onChange(result)`, `onClear()`, `onInvalid(reason, message)`, `onOpen()`, `onClose()`, DOM events `select.nepaliMonthPicker` / `clear.nepaliMonthPicker`.

**HTML attrs:** the shared ones listed under the date-time picker (`data-value-format`, `data-submit-name`, …).

## `NepaliYearPicker`

Pick one year, BS (default) or AD, from a scrollable list of every supported year. Like the month picker, a year is reported as the date range it covers.

```ts
import { mountYearPicker } from 'nepali-datepicker-pro';

mountYearPicker(document.querySelector('#fy'), {
  mode: 'BS',
  minYear: 2075,
  submitName: { start: 'from_date', end: 'to_date' },
  onChange: (r) => console.log(r.year, r.start, r.end), // 2081, first and last day as AD Dates
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` | `'BS' \| 'AD'` | `'BS'` | Calendar the year is in |
| `allowModeToggle` | `boolean` | `true` | Show the BS/AD swap button |
| `showSecondaryCalendar` | `boolean` | `true` | Show the other calendar's years as a hint |
| `value` / `defaultValue` | `number \| null` | — | Controlled / initial year |
| `locale` | `'ne' \| 'en'` | `'en'` | Language of the formatted value (`'ne'` for Devanagari digits) |
| `minYear` / `maxYear` | `number` | supported range | Bounds, in the active calendar |
| `disabledYears` | `(year) => boolean` | — | Show a year but don't let it be picked |
| `allowInput` | `boolean` | `true` | Type the year (`YYYY`) |
| `valueFormat` | see below | `'iso'` | Machine values for the year's first and last day |
| `submitName` | `string \| { start, end }` | — | One combined `start,end` field, or a pair |
| `altField` | `string \| HTMLElement \| { start, end }` | — | Same, targeting existing field(s) |
| `altFormat` | `ValueFormat` | `valueFormat` | Override format for `altField`/`submitName` only |

**`onChange` payload (`YearResult`):** `{ year, mode, start, end (AD Dates), startValue, endValue, value ('start,end'), formatted }`

**Events:** `onChange(result)`, `onClear()`, `onInvalid(reason, message)`, `onOpen()`, `onClose()`, DOM events `select.nepaliYearPicker` / `clear.nepaliYearPicker`. React/Vue: `NepaliYearPicker` (Vue `v-model` is the year number). jQuery: `nepaliYearPicker`. Element: `<nepali-year-picker>`.

## `NepaliTimePicker`

A time of day on its own, with the same controls as the date-time picker's time panel.

```ts
import { mountTimePicker } from 'nepali-datepicker-pro';

mountTimePicker(document.querySelector('#opens-at'), {
  timeFormat: '24h',
  minuteStep: 15,
  minTime: { hour: 9, minute: 0 },
  maxTime: { hour: 17, minute: 0 },
  submitName: 'opens_at',
  onChange: (r) => console.log(r.value), // "09:30" — always 24-hour
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `value` / `defaultValue` | `{ hour, minute, second? } \| null` | — | Controlled / initial time |
| `timeFormat` | `'12h' \| '24h'` | `'12h'` | Clock style of the field and wheels |
| `withSeconds` | `boolean` | `false` | Also pick seconds |
| `minuteStep` | `number` | `1` | Minute increment |
| `minTime` / `maxTime` | `{ hour, minute }` | — | Earliest / latest selectable time |
| `disabledTimes` | `(h, m) => boolean` | — | Disable specific hours/minutes |
| `timeInputStyle` | `'spinner' \| 'dropdown'` | `'spinner'` | Wheels plus typeable fields, or native selects |
| `allowInput` | `boolean` | `true` | Type the time into the field |
| `submitName` | `string` | — | Hidden field carrying the 24-hour `HH:mm[:ss]` value |
| `altField` | `string \| HTMLElement` | — | Write the value into an existing field |

**`onChange` payload (`TimeResult`):** `{ hour, minute, second, formatted ('09:30 AM'), value ('09:30', 24-hour) }`

**Events:** `onChange(result)`, `onClear()`, `onInvalid(reason, message)`, `onOpen()`, `onClose()`, DOM events `select.nepaliTimePicker` / `clear.nepaliTimePicker`. React/Vue: `NepaliTimePicker` (Vue `v-model` is `{ hour, minute, second }`). jQuery: `nepaliTimePicker`. Element: `<nepali-time-picker>`.

## `NepaliMultiDatePicker`

Pick several days from one calendar: click a day to add it, click again to remove it.

```ts
import { mountMultiDatePicker } from 'nepali-datepicker-pro';

mountMultiDatePicker(document.querySelector('#leave-days'), {
  maxDates: 5,
  minDate: 'today',
  disabledWeekdays: [6],
  submitName: 'leave_days',
  onChange: (r) => console.log(r.dates, r.value), // Date[], "2025-06-02,2025-06-03"
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `mode` / `allowModeToggle` / `showSecondaryCalendar` / `locale` | | | Same as the date-time picker |
| `value` / `defaultValue` | `Date[] \| null` | — | Controlled / initial days |
| `maxDates` | `number` | no limit | Most days that can be picked |
| `minDate` / `maxDate` / `disabledDates` / `disabledWeekdays` | | | Same as the date-time picker |
| `dayCellProps` / `beforeShowDay` / `events` / `weekStartsOn` / `weekendDays` | | | Same as the date-time picker |
| `displayFormat` | `string` | `YYYY-MM-DD` | Tokens for each day in the field. Past three days the field shows a count ("5 dates") |
| `valueFormat` | see below | `'iso'` | Shape of each day's machine value |
| `valueSeparator` | `string` | `','` | Separator between days in the submitted value |
| `submitName` | `string` | — | Hidden field carrying the joined value |
| `altField` | `string \| HTMLElement` | — | Write the joined value into an existing field |
| `altFormat` | `ValueFormat` | `valueFormat` | Override format for `altField`/`submitName` only |

The field isn't typeable (`allowInput` is always off for this picker).

**`onChange` payload (`MultiDateResult`):** `{ dates (AD Dates, in date order), bs, formatted, values, value (joined by valueSeparator) }`

**Events:** `onChange(result)`, `onClear()`, `onInvalid(reason, message)`, `onOpen()`, `onClose()`, DOM events `select.nepaliMultiDatePicker` / `clear.nepaliMultiDatePicker`. React/Vue: `NepaliMultiDatePicker` (Vue `v-model` is `Date[]`). jQuery: `nepaliMultiDatePicker`. Element: `<nepali-multi-date-picker>`.

## Shared options (every picker)

Available on every picker, on top of what is listed above. The first group is `CommonPickerOptions` (presentation, language and forms):

| Option | Type | Default | Description |
|---|---|---|---|
| `language` | `'en' \| 'ne' \| 'bilingual'` | `'bilingual'` | Language of every label, hint and message — see "Language & script" below |
| `strings` | `Partial<PickerStrings>` | — | Override any single UI string |
| `script` | `'auto' \| 'latin' \| 'devanagari'` | `'auto'` | Script for calendar names and numbers. `'auto'`: BS in Devanagari, AD in Latin. `'latin'`: BS too in Latin (Baisakh 2082). `'devanagari'`: AD too in Devanagari (जनवरी २०२५) |
| `theme` | `'light' \| 'dark' \| 'auto'` | follows the page | Color theme; `'auto'` follows the OS — see "Styling" below |
| `density` | `'compact' \| 'comfortable' \| 'touch'` | per picker | Cell and control sizing |
| `inline` | `boolean` | `false` | Draw the calendar always-visible in the page instead of a popup. Mounted on a non-input element, the calendar is drawn inside it |
| `required` | `boolean` | `false` | The field must have a value: native form validation treats an empty picker as invalid |
| `disabled` | `boolean` | `false` | No typing, no popup, not submitted |
| `invalidBehavior` | `'revert' \| 'keep'` | `'revert'` | What happens to an invalid or incomplete typed value on blur: restore the last good value, or keep the text and mark the field invalid |
| `showValidationMessage` | `boolean` | `true` | Show the validation message under the field |
| `showFieldIcon` | `boolean` | `true` | A calendar icon at the start of the field |
| `showCalendarSuffix` | `boolean` | `true` where the picker can be in either calendar | A small "BS" / "AD" label after the value and placeholder. Display only |
| `onInvalid` | `(reason, message) => void` | — | A typed value was rejected, or a required field was left empty |

And the popup/field options:

| Option | Type | Default | Description |
|---|---|---|---|
| `clearable` | `boolean` | `true` | Let the user clear the value: **Ctrl/⌘ + Backspace** (or Delete) in the field, plain Backspace/Delete on a read-only field, or a small × that appears on hover (always visible on touch screens, never in the Tab order). `false` turns all of these off |
| `appendTo` | `string \| HTMLElement` | `document.body` | Where the popup portal is mounted |
| `opens` | `'left' \| 'right' \| 'center' \| 'auto'` | `'auto'` | Horizontal alignment relative to the input |
| `drops` | `'down' \| 'up' \| 'auto'` | `'auto'` | Whether the popup opens below or above the input |
| `adapter` | `CalendarAdapter` | built-in | Swap the BS↔AD conversion engine (advanced; not on the time picker) |

## Holidays & events

Date-time, range and multi-date pickers take `events`:

```ts
import { nepalFixedHolidays, mergeEvents } from 'nepali-datepicker-pro/holidays';

mountDateTimePicker(input, {
  events: mergeEvents(
    nepalFixedHolidays({ language: 'en' }),         // fixed-date national days only
    [{ date: '2082-07-03', calendar: 'BS', label: 'Office closed', type: 'holiday' }],
    async ({ start, end }) => fetchEvents(start, end), // loader, called per shown month
  ),
});
```

- `CalendarEvent`: `{ date: Date | 'YYYY-MM-DD', calendar?: 'AD' | 'BS' (default 'AD'), label, type?: 'holiday' | 'event' (default 'event'), color? }`. Holidays are red; events get a dot. Labels go in the tooltip and the day's accessible name.
- `EventsSource` = `CalendarEvent[]` or `({ start, end }) => CalendarEvent[] | Promise<CalendarEvent[]>`. Loader results are **cached per month**.
- `nepalFixedHolidays({ language?: 'en' | 'ne', holidaysOnly?: boolean, adapter? })` — fixed-date days only. **Lunar festivals (Dashain, Tihar, Holi, Teej, Buddha Jayanti, Chhath, Lhosar…) are not included**; add them with `events`.
- `dayCellProps(date, bs) => { disabled?, className?, title?, badge?, holiday? } | null` customizes single days; `beforeShowDay(date) => { selectable, cssClass?, tooltip? }` is the jQuery-UI-style alias.
- `weekStartsOn` (0 = Sunday default … 6) and `weekendDays` (default `[6]`).

## Language & script

| Option | Controls | Values |
|---|---|---|
| `language` | Every UI label, hint, button, message | `'bilingual'` (default), `'en'`, `'ne'` |
| `locale` | Digits/month names in the formatted value | `'en'` (default), `'ne'` (range picker: a daterangepicker-style object instead) |
| `script` | Digits/names in the calendar | `'auto'` (BS Devanagari, AD Latin), `'latin'`, `'devanagari'` |

`strings: Partial<PickerStrings>` overrides single strings (`STRING_PACKS` exports the `en`/`ne`/`bilingual`
packs). `setDefaults(regional.ne)` switches the whole UI to Nepali (`regional.en` for English). The range
picker's `locale.applyLabel`, `cancelLabel`, `customRangeLabel`, `daysOfWeek`, `monthNames`, `firstDay`
work as shorthands.

## Forms & validation

- `required: true` → native validation (`:invalid`, `reportValidity()`, blocked submit).
- A refused typed value shows a message under the field (e.g. "Date must be on or after 2081-01-01"),
  linked to the field for screen readers and set as its custom validity. `showValidationMessage: false`
  hides it.
- `onInvalid(reason, message)`; `reason` ∈ `'invalid' | 'before-min' | 'after-max' | 'unavailable' |
  'incomplete' | 'required' | 'time-unavailable' | 'span'`.
- `invalidBehavior: 'revert'` (default) restores the last good value on blur; `'keep'` leaves the text.
- `disabled: true` — no typing, no popup, not submitted. Form reset restores the initial value.
- Typing order follows a numeric `displayFormat` (`DD/MM/YYYY` types day first).
- Paste a whole date: ISO, slashed, day-/month-first per the display format, Devanagari digits, month
  names in either calendar ("15 Ashar 2082", "Jun 29 2025"). Ranges paste as "start – end".
- The "BS"/"AD" label after the value is display only; `showCalendarSuffix: false` hides it.

## Custom elements

```html
<script type="module">import 'nepali-datepicker-pro/element';</script>
<nepali-date-picker name="dob" mode="BS" max-date="today" required></nepali-date-picker>
<nepali-date-range-picker number-of-months="2"></nepali-date-range-picker>
```

- Attributes → options in kebab-case. Strings: `mode`, `language`, `theme`, `density`, `script`, `locale`,
  `time-format`, `display-format`, `value-format`, `min-date`, `max-date`, `opens`, `drops`,
  `invalid-behavior`, `time-input-style`. Numbers: `minute-step`, `number-of-months`, `fiscal-start-month`,
  `max-range-span-days`, `min-range-span-days`, `max-dates`, `min-year`, `max-year`, `week-starts-on`.
  Booleans (present, or `"true"`/`"false"`): `with-time`, `with-seconds`, `inline`, `required`, `disabled`,
  `allow-mode-toggle`, `clearable`, `allow-input`, `auto-apply`, `show-secondary-calendar`,
  `show-calendar-suffix`, `linked-calendars`.
- `name` → `submitName` (submits with the form); `placeholder` → the field; `value` takes `YYYY-MM-DD`,
  `start,end`, `YYYY-MM`, `YYYY` or `HH:mm[:ss]` depending on the element.
- Functions/`events`/`presets`/`strings`: set the `options` property (`el.options = { ... }`).
- Events on the element: `change` (detail = result), `clear`, `open`, `close`, `invalid` (detail =
  `{ reason, message }`). Members: `value`, `instance`, `show()`, `hide()`, `clear()`.
- Light DOM (no shadow root), so `style.css` and token overrides apply.

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
interface PickerInstance<TValue, TOptions, TInput = TValue> {
  getState(): unknown;
  getValue(): TValue | null;
  setValue(value: TInput | null): void; // Date (date-time), { start, end } (range), { year, month } (month),
                                        // number (year), { hour, minute, second? } (time), Date[] (multi)
  show(): void;
  hide(): void;
  update(patch: Partial<TOptions>): void;
  destroy(): void;                                   // restores the original <input>
  onChange(cb: (value: TValue) => void): () => void; // returns unsubscribe fn
  clear(): void;                                     // clear as the user would: fires onClear + clear.* event
  onClear(cb: () => void): () => void;               // returns unsubscribe fn
}
```

## React `ref` / Vue template ref

Both expose `show()`, `hide()`, `clear()`, `getValue()`, `setValue(v)`, `update(patch)`, `focus()` and
`instance` (the `PickerInstance`, `null` before mount). React type: `PickerHandle<TResult, TOptions, TInput>`
from `/react`; Vue: `PickerExpose` from `/vue`. React components also take `inputProps` (attributes for the
created `<input>`: `id` for `<label htmlFor>`, `name`, `placeholder`, `aria-*`) and `className` (on the host
`<div>`). The React bundle starts with `'use client'`.

## jQuery plugin methods

Installed automatically on `$.fn` when the package is imported and `window.jQuery`
is present (waits for `DOMContentLoaded` if jQuery loads after the bundle). The UMD
`<script>` bundle includes the plugin; with a bundler, `import 'nepali-datepicker-pro/jquery'`,
or call `install($)` from that entry when jQuery isn't on `window`. TypeScript: the
plugins are declared on `JQuery` (merges with `@types/jquery`).

| Method | Returns | Description |
|---|---|---|
| `'getValue'` | result or `undefined` | Value of the **first** matched element |
| `'getState'` | state or `undefined` | Internal state of the **first** matched element |
| `'setValue'` | `$` (chainable) | `('setValue', undefined, newValue)` |
| `'option'` | `$` (chainable) | `('option', 'minDate', new Date())` |
| `'show'` | `$` (chainable) | Open the popup |
| `'hide'` | `$` (chainable) | Close the popup |
| `'clear'` | `$` (chainable) | Clear the value as the user would (fires `onClear`) |
| `'destroy'` | `$` (chainable) | Tear down the instance and clean up |

Plugin names: `nepaliDateTimePicker`, `nepaliDateRangePicker`, `nepaliMonthPicker`,
`nepaliYearPicker`, `nepaliTimePicker`, `nepaliMultiDatePicker`.

## Events summary

| Picker | JS callback | DOM event (bubbles, `event.detail` = result) |
|---|---|---|
| `NepaliDateTimePicker` | `onChange(result)`, `onChangeMonthYear(y, m)` | `select.nepaliDatePicker` |
| `NepaliDateRangePicker` | `onApply(result)`, `onChange({ start?, end? })`, `onCancel()` | `apply.nepaliDateRangePicker` |
| `NepaliMonthPicker` | `onChange(result)` | `select.nepaliMonthPicker` |
| `NepaliYearPicker` | `onChange(result)` | `select.nepaliYearPicker` |
| `NepaliTimePicker` | `onChange(result)` | `select.nepaliTimePicker` |
| `NepaliMultiDatePicker` | `onChange(result)` | `select.nepaliMultiDatePicker` |

Every picker also fires `onOpen()` / `onClose()`, `onInvalid(reason, message)`, and on a user clear
(× button, Clear button, erased text) `onClear()` plus a bubbling `clear.<same suffix>` event
(`clear.nepaliDatePicker`, `clear.nepaliDateRangePicker`, …) — change events don't fire for a clear.
`setValue(null)` clears silently.

jQuery: listen to the DOM events with `addEventListener`, not `$(el).on(...)` —
jQuery parses the part after the dot as a namespace, so the handler never fires.

Vue 3 template events (alternative to passing callbacks through `:options`; both fire
if you do both): `@change`, `@clear` (v-model becomes `null`), `@invalid(reason, message)`, `@open`,
`@close`, `@changeMonthYear` (datetime only), `@cancel` (range only). Vue `v-model`: `Date` (datetime),
`{ start, end }` (range), `MonthResult` (month), `number` (year), `{ hour, minute, second }` (time),
`Date[]` (multi).

## Autoinit / vanilla helpers

```ts
import { setDefaults, regional, autoInit } from 'nepali-datepicker-pro';

setDefaults({ language: 'en', valueFormat: 'iso' }); // set app-wide defaults before mounting
setDefaults({ mode: 'AD', allowModeToggle: false }); // one calendar app-wide, no BS/AD switcher
setDefaults(regional.ne);                            // whole UI in Nepali
autoInit(); // scan the document (or a given root); safe to call again after AJAX/Turbo
```

`autoInit` reads `[data-nepali-datepicker]`, `[data-nepali-daterange]` and `[data-nepali-monthpicker]` only
(no data-attribute auto-init for year/time/multi — use `mount*` or the custom elements). Shared attributes:
`data-mode`, `data-language`, `data-theme`, `data-display-format`, `data-min-date`, `data-max-date`,
`data-inline`, `data-required`, `data-value-format`, `data-submit-name`, `data-alt-field`. Date-time adds
`data-with-time`, `data-with-seconds`, `data-time-format`, `data-minute-step`; range adds
`data-fiscal-start-month`, `data-number-of-months`.

## TypeScript exports (barrel: `nepali-datepicker-pro`)

```ts
import type {
  DateTimePickerOptions, DateTimeResult,
  DateRangePickerOptions, DateRangeResult, RangePickerLocale, PresetDefinition, PresetContext, BuiltInPresetId,
  MonthPickerOptions, MonthResult, MonthValue,
  YearPickerOptions, YearResult,
  TimePickerOptions, TimeResult, TimeValue,
  MultiDatePickerOptions, MultiDateResult,
  CommonPickerOptions, DayGridOptions, DayCellProps, CalendarEvent, EventsSource, InvalidReason,
  PickerStrings, UiLanguage, CalendarScript, PickerTheme, PickerDensity, Weekday,
  BsDate, CalendarMode, PickerLocale, ValueFormat, PickerInstance, CalendarAdapter, DateMath,
} from 'nepali-datepicker-pro';
import {
  mountDateTimePicker, mountDateRangePicker, mountMonthPicker,
  mountYearPicker, mountTimePicker, mountMultiDatePicker,
  setDefaults, regional, autoInit,
  createDateTimeController, createDateRangeController, createMonthPickerController,
  createYearPickerController, createTimePickerController, createMultiDateController,
  buildPresetLibrary, STRING_PACKS, resolveStrings,
  BsAdCalendarAdapter, defaultCalendarAdapter, nativeDateMath,
  nepaliFunctions, makeNepaliFunctions,
  formatDateValue, parseDateValue, formatRange,
} from 'nepali-datepicker-pro';
```

The `create*Controller` functions are the headless state machines underneath the DOM mount functions —
only reach for these when building a fully custom renderer; for a normal integration use `mount*`
or the framework components instead.

## Keyboard

Field: type/arrow through segments (Nepali or ASCII digits); paste a whole date; **Alt+↓** (↓ when
read-only) enters the calendar; **Ctrl/⌘+Backspace** clears. Calendar: arrows = day/week,
PageUp/PageDown (+Shift) = month/year, Home/End = week start/end, Enter/Space = pick. Month/year
grids: arrows, Home/End (row), PageUp/PageDown (four rows), Enter/Space. Time wheels: ↑/↓, PageUp/PageDown
(five steps), Home/End, type-ahead (`p` → PM). Escape closes and refocuses the field. One popup open at a
time; Tab out of a field closes its popup.

## Accessibility

WCAG 2.2 AA, checked by axe-core in CI: ARIA grid with full spoken day names (incl. holiday / range end /
unavailable), `aria-current="date"` on today, live-region announcements, focus kept across re-renders,
modal bottom sheet on phones, AA contrast in light and dark, `prefers-reduced-motion` respected.
`timeInputStyle: 'dropdown'` gives native selects for the time.

## Styling

Single stylesheet, CSS custom properties for theming — no CSS-in-JS, no Tailwind
requirement, no shadow DOM. On viewports ≤ 560px the popup renders as a bottom
sheet (portal gets class `ndp-sheet`; `opens`/`drops` are ignored there), and the
year view is one scrollable list of every supported year.

```css
:root {
  --ndp-color-primary: #2563eb;
  --ndp-radius: 8px;
  --ndp-font: 'Inter', sans-serif;
}
```

Tokens: `--ndp-color-primary`, `-primary-hover`, `-primary-bg`, `-on-primary`, `-accent`, `-surface`,
`-surface-subtle`, `-surface-hover`, `-page`, `-text`, `-text-muted`, `-text-faint`, `-border`, `-danger`,
`-weekend`, `-holiday`, `-event`, `-range-bg`, `-focus`, `-backdrop` (all `--ndp-color-*`), plus
`--ndp-radius`, `--ndp-radius-lg`, `--ndp-shadow`, `--ndp-z-index`, `--ndp-font`, `--ndp-font-size`,
`--ndp-font-size-sm`, `--ndp-font-size-xs`, `--ndp-cell-height`, `--ndp-gap`, `--ndp-focus-ring`,
`--ndp-transition`.

Dark theme: `theme: 'dark'` / `'auto'` (follows the OS), or `data-ndp-theme="dark"` / `"auto"` on any
ancestor such as `<html>`. Density: `density: 'compact' | 'comfortable' | 'touch'`. Always-visible
calendar: `inline: true`.

## Bundle size

About 27 KB gzipped for the date picker alone, about 39 KB for all pickers, plus 6 KB gzipped CSS.
Unused pickers are tree-shaken.

## Browser / version support

Evergreen browsers only (Chrome/Firefox/Safari/Edge, last 2 versions), targets
ES2020+, no IE11. Consuming Node ≥18. BS years `1970`–`2100`.
