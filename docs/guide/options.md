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

- `locale` — `'ne' | 'en'`, controls digit script and month names.
- `displayFormat` — dayjs-style tokens for what the *input* shows (e.g. `YYYY-MM-DD[ HH:mm]`).
  This is purely cosmetic and independent of `valueFormat`.

## Decoupling display from submitted value

These three exist so a BS-mode, Nepali-digit picker can still hand your backend a clean value
with zero conversion glue — see the README's [Sending the right value to your
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
