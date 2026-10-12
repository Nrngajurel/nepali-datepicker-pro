---
title: Options
description: The integration-level options for Nepali Datepicker Pro — popup placement and portaling, locale and display formats, and decoupling the displayed date from the value you submit.
---

# Options

The full option contract for each picker is typed in `src/types.ts` (`DateTimePickerOptions`,
`DateRangePickerOptions`, `MonthPickerOptions`). The
[component pages](/components/date-time-picker) have the complete per-picker option tables with
defaults; this page covers the integration-level options that are easy to miss, plus how they
interact.

## Popup placement & portaling

- `appendTo` — portals the popup DOM into a stable container, usually `document.body` (default)
  or a modal element, so it isn't clipped by an `overflow: hidden` ancestor.
- `container` — daterangepicker.js-compatible alias for `appendTo` on the range and month
  pickers, kept for drop-in migration (see [Migration](/guide/migration)).
- `opens` — `'left' | 'right' | 'center' | 'auto'`, horizontal alignment relative to the input.
- `drops` — `'down' | 'up' | 'auto'`, whether the popup opens below or above the input.

## Locale & formatting

- `locale` — `'ne' | 'en'` (default `'en'`), controls digit script and month names.
- `displayFormat` — dayjs-style tokens for what the *input* shows (e.g. `YYYY-MM-DD[ HH:mm]`).
  This is purely cosmetic and independent of `valueFormat`.

## One calendar for the whole app

Every date and range picker shows a BS ⇄ AD swap button by default (`allowModeToggle: true`) and
opens in BS (`mode: 'BS'`). If your app should use a single calendar everywhere, set it once
at your entry point, **before any picker mounts**, and hide the switcher:

```ts
import { setDefaults } from 'nepali-datepicker-pro';

setDefaults({ mode: 'AD', allowModeToggle: false }); // or mode: 'BS'
```

- It applies to every date/date-time and range picker mounted afterwards, in vanilla JS, React,
  Vue and jQuery (with the `<script>` tag build, `NepaliPicker.setDefaults(...)`).
- It hides both switchers: the swap button on the input and the one in the range picker's popup.
- Options passed to a single picker still win over the global default.
- Pickers already on screen don't change. To switch them, for example when the user changes a
  calendar setting in your app, call `picker.update({ mode: 'AD' })` on each one, or pass the new
  `mode` through your React/Vue options.
- The month picker always uses BS months, so `mode` doesn't apply to it.

## Single vs. dual calendar

- `showSecondaryCalendar` (default `true`) — the header, month/year grid, and day cells all show
  a small hint from the *other* calendar next to the active one (e.g. a BS month cell also shows
  the Gregorian month(s) it overlaps, since a BS month always straddles two AD months and vice
  versa). Set it to `false` to show only the active `mode`'s calendar, for people who'd rather
  focus on one system at a time. Available on all three pickers and live-updatable via `.update()`.

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
