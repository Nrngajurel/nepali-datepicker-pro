---
title: Options
description: The integration-level options for Nepali Datepicker Pro — shared presentation and form options, holidays and events, week layout, range limits, popup placement, locale and display formats, and decoupling the displayed date from the value you submit.
---

# Options

The full option contract for each picker is typed in `src/types.ts` (`DateTimePickerOptions`,
`DateRangePickerOptions`, `MonthPickerOptions`, `YearPickerOptions`, `TimePickerOptions`,
`MultiDatePickerOptions`, and `CommonPickerOptions` shared by all of them). The
[component pages](/components/date-time-picker) have the complete per-picker option tables with
defaults; this page covers the integration-level options that are easy to miss, plus how they
interact.

## Shared options

Every picker accepts these (`CommonPickerOptions`):

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `language` | `'en' \| 'ne' \| 'bilingual'` | `'bilingual'` | Language of every label, hint and message — see [Localization](/guide/localization) |
| `strings` | `Partial<PickerStrings>` | — | Override any single UI string |
| `script` | `'auto' \| 'latin' \| 'devanagari'` | `'auto'` | Script for calendar names and numbers |
| `theme` | `'light' \| 'dark' \| 'auto'` | follows the page | Color theme — see [Theming](/guide/theming) |
| `density` | `'compact' \| 'comfortable' \| 'touch'` | per picker | Cell and control sizing |
| `inline` | `boolean` | `false` | Always-visible calendar in the page instead of a popup |
| `required` | `boolean` | `false` | Native form validation treats an empty picker as invalid |
| `disabled` | `boolean` | `false` | No typing, no popup, not submitted |
| `invalidBehavior` | `'revert' \| 'keep'` | `'revert'` | On blur, restore the last good value, or keep an invalid entry and mark it |
| `showValidationMessage` | `boolean` | `true` | Show the validation message under the field |
| `showFieldIcon` | `boolean` | `true` | A calendar icon at the start of the field |
| `showCalendarSuffix` | `boolean` | `true` where the picker can be in either calendar | A small "BS" / "AD" label after the value. Display only |
| `onInvalid` | `(reason, message) => void` | — | A typed value was rejected, or a required field was left empty |

Validation, paste and keyboard behavior are covered in [Accessibility](/guide/accessibility).

## Holidays & events

The date-time, range and multi-date pickers can mark holidays (red) and events (a dot), with
their labels in the tooltip and the day's accessible name:

```ts
import { nepalFixedHolidays, mergeEvents } from 'nepali-datepicker-pro/holidays';

mountDateTimePicker(input, {
  events: mergeEvents(
    nepalFixedHolidays(), // Nepal's fixed-date national days
    [{ date: '2082-07-03', calendar: 'BS', label: 'Office closed', type: 'holiday' }],
    async ({ start, end }) => loadEventsFromYourApi(start, end),
  ),
});
```

- `events` is a list of `{ date, calendar?, label, type?, color? }` (`date` is a `Date` or a
  `YYYY-MM-DD` string in `calendar`, default `'AD'`; `type` is `'holiday'` or `'event'`, the
  default), or a loader called with each shown month's AD span. A loader may be async; its results
  are cached per month, and passing a new loader function drops the cache.
- `nepalFixedHolidays({ language?, holidaysOnly?, adapter? })` covers only national days that fall
  on a **fixed date** every year. **Lunar festivals — Dashain, Tihar, Holi, Teej, Buddha Jayanti,
  Chhath, Lhosar — are not included**; they move every year with the government's holiday notice,
  so add them through `events`. `mergeEvents(...)` combines lists and loaders.
- `dayCellProps(date, bs)` returns `{ disabled?, className?, title?, badge?, holiday? }` for any
  single day — a price badge, a tooltip, a class, a holiday mark, or disabling it.
  `beforeShowDay(date)` is the jQuery-UI-style alias (`{ selectable, cssClass?, tooltip? }`).

## Week layout

- `weekStartsOn` — first column of the week, `0` (Sunday, default) … `6` (Saturday).
- `weekendDays` — days shown in red, default `[6]` (Saturday).

## Date-time picker extras

- `withSeconds` — also pick seconds (with `withTime`).
- `timeInputStyle` — `'spinner'` (default: typeable fields plus wheels) or `'dropdown'` (native
  selects).
- `showButtonPanel` — `{ today?, clear?, close? }` chooses the footer buttons, including in
  date-only mode. Default: the Today chip, plus Clear/Done when picking a time.

## Range limits and layout

- `numberOfMonths: 2` shows two months side by side (stacked on phones); `linkedCalendars: false`
  lets each one page independently.
- `maxRangeSpanDays` / `minRangeSpanDays` limit the range length, counting both ends.
- By default a range can't run across a disabled day: the end can't be picked past the first
  one. `allowDisabledInRange: true` allows it.
- `withTime` picks a time for each end; `alwaysShowCalendars: false` shows only the presets until
  "Custom Range" is chosen; `onCancel` fires when the popup is dismissed with Cancel.
- `presets` mixes your own definitions with built-in ids: `'today'`, `'yesterday'`, `'last7'`,
  `'last15'`, `'last30'`, `'last45'`, `'last60'`, `'last90'`, `'next7'`, `'next15'`,
  `'next30'`, `'thisWeek'`, `'lastWeek'`, `'thisMonth'`, `'lastMonth'`, `'nextMonth'`,
  `'fytd'`, `'fiscalYear'`, `'month'`, `'custom'`. `buildPresetLibrary(options, adapter)` returns
  all of them keyed by id.

## Month and year limits

- Month picker: `minMonth` / `maxMonth` (`{ year, month }`, BS) and `disabledMonths(year, month)`.
- Year picker: `minYear` / `maxYear` (in the active calendar) and `disabledYears(year)`.

## Popup placement & portaling

- `appendTo` — portals the popup DOM into a stable container, usually `document.body` (default)
  or a modal element, so it isn't clipped by an `overflow: hidden` ancestor.
- `container` — daterangepicker.js-compatible alias for `appendTo` on the range and month
  pickers, kept for drop-in migration (see [Migration](/guide/migration)).
- `opens` — `'left' | 'right' | 'center' | 'auto'`, horizontal alignment relative to the input.
- `drops` — `'down' | 'up' | 'auto'`, whether the popup opens below or above the input.

## Locale & formatting

- `locale` — `'ne' | 'en'` (default `'en'`), controls digit script and month names of the
  formatted value. For the UI text and the calendar's script, see `language` and `script` in
  [Localization](/guide/localization).
- `displayFormat` — dayjs-style tokens for what the *input* shows (e.g. `YYYY-MM-DD[ HH:mm]`).
  It's independent of `valueFormat`. A numeric format also sets the typing order:
  `DD/MM/YYYY` is typed day first.

## One calendar for the whole app

Every date and range picker shows a BS ⇄ AD swap button by default (`allowModeToggle: true`) and
opens in BS (`mode: 'BS'`). If your app should use a single calendar everywhere, set it once
at your entry point, **before any picker mounts**, and hide the switcher:

```ts
import { setDefaults } from 'nepali-datepicker-pro';

setDefaults({ mode: 'AD', allowModeToggle: false }); // or mode: 'BS'
```

- It applies to every picker mounted afterwards, in vanilla JS, React, Vue, jQuery and custom
  elements (with the `<script>` tag build, `NepaliPicker.setDefaults(...)`). `setDefaults` takes
  the shared options too, e.g. `setDefaults({ language: 'en', theme: 'auto' })`.
- It hides both switchers: the swap button on the input and the one in the range picker's popup.
- Options passed to a single picker still win over the global default.
- Pickers already on screen don't change. To switch them, for example when the user changes a
  calendar setting in your app, call `picker.update({ mode: 'AD' })` on each one, or pass the new
  `mode` through your React/Vue options.
- The month picker always uses BS months, so `mode` doesn't apply to it; the time picker has no
  calendar.

## Single vs. dual calendar

- `showSecondaryCalendar` (default `true`) — the header, month/year grid, and day cells all show
  a small hint from the *other* calendar next to the active one (e.g. a BS month cell also shows
  the Gregorian month(s) it overlaps, since a BS month always straddles two AD months and vice
  versa). Set it to `false` to show only the active `mode`'s calendar, for people who'd rather
  focus on one system at a time. Available on every picker with a calendar and live-updatable via
  `.update()`.

## Decoupling display from submitted value

These three exist so a picker's display calendar/locale can differ from what actually reaches
your backend, with zero conversion glue — see the README's [Sending the right value to your
backend](https://github.com/nrngajurel/nepali-datepicker-pro#sending-the-right-value-to-your-backend)
section for the full writeup.

- `valueFormat` — `'iso' | 'iso-bs' | 'timestamp' | 'date-object' | { calendar, format }`, the
  shape of the machine value on `onChange`/DOM events and written to `altField`/`submitName`.
- `submitName` — injects a hidden `<input name>` (select2-style) carrying the machine value; on
  the range/month pickers this can be a single string (`"start,end"`) or `{ start, end }` for two
  named fields.
- `altField` — jQuery-UI-style: write the machine value into an *existing* element/selector
  instead of creating a hidden input. Same string vs. `{ start, end }` shape as `submitName`.
- `altFormat` — overrides the format used for `altField`/`submitName` only, when the visible
  input and the submitted value need to differ from `valueFormat`.

## Advanced overrides

- `adapter` — swap the BS↔AD conversion engine (`CalendarAdapter`). Rarely needed; the built-in
  adapter is O(1) and validated against the official calendar for BS 1970–2100.
- `dateMath` — override the AD-side date math (range picker only).
