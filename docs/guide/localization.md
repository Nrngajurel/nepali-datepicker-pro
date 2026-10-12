---
title: Localization
description: Show the Nepali date picker's interface in English, Nepali or both, override any label, and choose Devanagari or Latin script for BS and AD calendars — language, strings, script, locale and regional presets.
---

# Localization

Three options decide what language and script the pickers use. They're independent, so you can
mix them — an English interface over a Devanagari BS calendar, say.

| Option | Controls | Values |
| --- | --- | --- |
| `language` | Every label, hint, button, placeholder and validation message | `'bilingual'` (default), `'en'`, `'ne'` |
| `script` | Digits and month names **inside the calendar** | `'auto'` (default), `'latin'`, `'devanagari'` |
| `locale` | Digits and month names in the **formatted value** in the field | `'en'` (default), `'ne'` |

## `language`

- `'bilingual'` (the default) shows Nepali and English side by side, as the pickers always have.
- `'en'` and `'ne'` show one language. That's also kinder to screen readers, which then read
  one language instead of two.

```ts
mountDateTimePicker(input, { language: 'ne' });
```

To switch every picker at once, use the ready-made `regional` presets with `setDefaults`, before
any picker mounts:

```ts
import { setDefaults, regional } from 'nepali-datepicker-pro';

setDefaults(regional.ne); // Nepali UI everywhere (regional.en for English)
```

`regional.ne` sets `language: 'ne'` and the range picker's Apply/Cancel labels in Nepali.

## `strings`

Override any single piece of text. Unlisted strings keep the active language's text:

```ts
mountDateRangePicker(input, {
  language: 'en',
  strings: {
    apply: 'Use these dates',
    presetCustom: 'Pick dates…',
    beforeMin: 'Bookings open on {date}',
  },
});
```

Some strings have placeholders that are filled in for you: `{n}` (a count, e.g. `presetLastDays:
'Last {n} days'`), `{date}`, and `{start}` / `{end}`. The full key list is the `PickerStrings`
type; the main groups are:

| Group | Keys (examples) |
| --- | --- |
| Buttons | `today`, `now`, `clear`, `done`, `apply`, `cancel`, `close` |
| Navigation (accessible names) | `previousMonth`, `nextMonth`, `chooseMonth`, `chooseYear`, `switchToBs`, `switchToAd` |
| Calendar names | `calendarBs`, `calendarAd` (the "BS" / "AD" label), `calendarBsLong`, `calendarAdLong` |
| Range | `start`, `end`, `pickStart`, `pickEnd`, `nights`, `maxSpan`, `minSpan`, `rangeHasDisabled` |
| Time | `time`, `hour`, `minute`, `second`, `meridiem` |
| Day cells (screen readers) | `holiday`, `unavailable`, `selected` |
| Announcements | `announceSelected`, `announceStart`, `announceRange` |
| Placeholders | `selectDatePlaceholder`, `selectRangePlaceholder`, `selectMonthPlaceholder`, `selectYearPlaceholder`, `selectTimePlaceholder`, `datesSelected` |
| Validation | `invalidDate`, `beforeMin`, `afterMax`, `dateUnavailable`, `timeUnavailable`, `incomplete`, `required` |
| Presets | `presetToday`, `presetLastDays`, `presetNextDays`, `presetThisMonth`, `presetFiscalYear`, `presetPickMonth`, `presetCustom`, … |

The built-in packs are exported as `STRING_PACKS` (`en`, `ne`, `bilingual`), and
`resolveStrings(language, overrides)` returns the merged set, if you want to reuse the text
elsewhere.

### The range picker's `locale` block

The range picker also accepts the daterangepicker.js-style `locale` object, for drop-in migration:

| Key | Same as |
| --- | --- |
| `applyLabel`, `cancelLabel`, `customRangeLabel` | `strings.apply`, `strings.cancel`, `strings.presetCustom` |
| `daysOfWeek` | Weekday header labels, Sunday first (7 entries) |
| `monthNames` | Month names for the active calendar, Baisakh/January first (12 entries) |
| `firstDay` | `weekStartsOn` |
| `format`, `separator` | Display format and the text between the two dates |

`weekLabel` is deprecated and ignored; week numbers aren't shown.

## `script`

By default (`'auto'`) BS is written in Devanagari and AD in Latin. Change that per picker:

```ts
mountDateTimePicker(input, { script: 'latin' });      // BS in English: "Baisakh 2082"
mountDateTimePicker(input, { script: 'devanagari' }); // AD in Devanagari: "जनवरी २०२५"
```

## `locale`

`locale` sets the digits and month names in the formatted value shown in the field (and in
`result.formatted`). `'ne'` gives Devanagari digits and Nepali month names; in AD mode that's
Gregorian months in Nepali (`१५ जनवरी`). The range picker's `formatted` string also follows
`language: 'ne'`.

## Input is always bilingual

Whatever the settings, typed and pasted input accepts Nepali (०–९) and ASCII digits, and pasted
month names in either calendar and either script (`15 Ashar 2082`, `१५ असार २०८२`, `Jun 29
2025`).

## Week layout

- `weekStartsOn`: the first column, `0` (Sunday, the default) to `6` (Saturday).
- `weekendDays`: the days shown in red, default `[6]` (Saturday, Nepal's weekly holiday).

## See also

- [Options](/guide/options)
- [Accessibility](/guide/accessibility)
