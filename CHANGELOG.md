# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **New pickers:** `mountYearPicker` (BS or AD year), `mountTimePicker` (time of day only) and
  `mountMultiDatePicker` (pick several days, `maxDates`). They come with React and Vue components
  (`NepaliYearPicker`, `NepaliTimePicker`, `NepaliMultiDatePicker`), jQuery plugins and custom
  elements. The time picker's popup is just the wheels (type in the field itself), with Now, Clear
  and Done in one footer row. BS/AD on the year picker is switched from the field, like the date
  picker.
- **Custom elements:** `import 'nepali-datepicker-pro/element'` registers `<nepali-date-picker>`,
  `<nepali-date-range-picker>`, `<nepali-month-picker>`, `<nepali-year-picker>`,
  `<nepali-time-picker>` and `<nepali-multi-date-picker>`. Use them from Angular, Svelte, Astro or
  plain HTML. Attributes map to options, `name` submits with the form, and `change`, `clear`,
  `open`, `close` and `invalid` are DOM events.
- **Holidays and events on the calendar:**
  - The `events` option takes a list, or a (possibly async) loader called per shown month.
    Holidays show in red and events as a dot; their names appear in the tooltip and are read by
    screen readers.
  - `nepali-datepicker-pro/holidays` ships `nepalFixedHolidays()`, Nepal's fixed-date national
    days. Lunar festivals change every year and aren't included; add them with `events`.
    `mergeEvents()` combines both.
- **Custom day cells:** `dayCellProps(date, bs)` can disable a day, or add a class, tooltip,
  badge or holiday mark. The jQuery-UI-style `beforeShowDay` option now works too; it was
  declared but ignored before.
- **Week layout:** `weekStartsOn` (any weekday) and `weekendDays` (default Saturday) now take
  effect. They were declared but ignored before.
- **Range picker:**
  - Two months side by side with `numberOfMonths: 2`, paging together or separately via
    `linkedCalendars`.
  - `maxRangeSpanDays` and `minRangeSpanDays` limits.
  - A Cancel button and `onCancel`.
  - A time for each end with `withTime`.
  - `alwaysShowCalendars: false` hides the calendar until "Custom Range" is chosen.
  - New built-in presets you can list by id, e.g.
    `presets: ['today', 'next7', 'thisWeek', 'thisMonth', 'lastMonth', 'custom']`. "This month"
    follows the active calendar. Every built-in is exported as `buildPresetLibrary()`.
  - The field shows how many days are selected.
- **Date-time picker:**
  - `withSeconds`.
  - `timeInputStyle: 'dropdown'` for native selects.
  - `showButtonPanel` to choose the Today, Clear and Close buttons, including in date-only mode.
- **`inline: true`** draws an always-visible calendar in the page instead of a popup.
- **UI language:**
  - `language: 'en' | 'ne' | 'bilingual'` (default bilingual, as before) translates every label,
    hint and message.
  - `strings` overrides any single one.
  - The range picker's `locale.applyLabel`, `cancelLabel`, `customRangeLabel`, `daysOfWeek`,
    `monthNames` and `firstDay` now work.
  - `setDefaults(regional.ne)` switches the whole UI to Nepali.
- **`script: 'latin' | 'devanagari'`** writes BS in English (Baisakh 2082) or AD in Devanagari
  (जनवरी २०२५).
- **Dark theme:**
  - `theme: 'dark'`, or `'auto'` to follow the OS.
  - Or set `data-ndp-theme="dark"` on any ancestor, such as `<html>`.
- **`density: 'compact' | 'comfortable' | 'touch'`.**
- New CSS tokens: `--ndp-color-on-primary`, `--ndp-color-weekend`, `--ndp-color-holiday`,
  `--ndp-color-event`, `--ndp-color-range-bg`, `--ndp-cell-height`, `--ndp-gap`,
  `--ndp-font-size*`, `--ndp-focus-ring`.
- **Forms and validation:**
  - `required` works with native form validation (`:invalid`, `reportValidity()`, blocked
    submit).
  - A refused typed value shows a message under the field (for example "Date must be on or after
    2081-01-01"). The message is linked to the field for screen readers and set as the field's
    custom validity.
  - `onInvalid(reason, message)` and `invalidBehavior: 'keep'` (leave the text to fix instead of
    reverting).
  - `disabled`.
  - A form reset restores the initial value.
- **Paste a whole date** into a typeable field: ISO, slashed, day-first or month-first per the
  display format, Devanagari digits, or month names in either calendar ("15 Ashar 2082",
  "Jun 29 2025"). Ranges paste as "start – end".
- **Typing follows a numeric `displayFormat`:** `DD/MM/YYYY` is typed day first.
- **The field shows which calendar it's in:**
  - "BS" / "AD" a few spaces after the date, in the field's font and the mask's faint color. It's never clipped by a long value, and
    `showCalendarSuffix: false` hides it. It's display only: the value is unchanged.
- **The month picker** gains `minMonth`, `maxMonth` and `disabledMonths`.
- **React:**
  - Components take a `ref`: show, hide, clear, getValue, setValue, update, focus, and
    `instance`.
  - `inputProps` puts an `id` or `name` on the field, so `<label htmlFor>` works.
  - The bundle starts with `'use client'` for the Next.js App Router.
- **Vue:** components `expose()` the same API through a template ref, and emit `@invalid`;
  the range picker also emits `@cancel`.
- **CommonJS builds** for every subpath (`require('nepali-datepicker-pro/react')` …) and a
  `./package.json` export.

- Keyboard navigation in the popup: **Alt+↓** from the field (↓ on a read-only field) moves focus
  into the calendar. There, arrows move by day and week, PageUp/PageDown by month (with Shift, by
  year), Home/End to the week's ends, and the calendar turns the page as you go. Enter or Space
  picks; Escape closes and returns focus to the field. Only one day is in the Tab order at a time.
- Date-time picker on phones is now two steps: pick the date, then the time on large wheels with a
  big readout. A chip with the chosen date goes back to the calendar. Desktop keeps date and time
  side by side.
- Phone-friendly popup: on screens 560px wide or less, every picker opens as a bottom sheet —
  full width, docked to the bottom, scrollable, with Done/Apply kept in reach and a dimmed
  backdrop you tap to close. Previously the dropdown could run off the bottom of the screen.
- Range picker presets show as a swipeable row of chips on phones instead of a tall list above the
  calendar.

### Changed

- **Accessibility (WCAG 2.2 AA), checked by axe-core in CI:**
  - The day grid is a proper ARIA grid. Weekday headers and week rows sit inside it.
  - Every day has a full spoken name, e.g. "Saturday, 01 Baisakh 2081 (13 April 2024)", plus
    "holiday", "start of range" or "unavailable" where they apply.
  - Today is `aria-current="date"`.
  - Month changes and picks are announced through a live region.
  - Month and year grids, and the time wheels, work with the arrow keys.
  - Focus stays put when the panel re-renders, for example after pressing "Next month".
  - On phones the bottom sheet is modal: focus moves in, Tab stays inside, and the page behind
    is inert.
- **Colors meet AA contrast:**
  - Primary is now `#257a41`, muted text `#5f6670` and danger `#c53030`.
  - White text on the old green failed at 4.1:1.
  - The focus ring is no longer hidden on today or hovered days.
  - Small text is at least 10–11px.
  - Touch targets grow on touch screens.
- **Visual feedback:**
  - A calendar icon starts every field.
  - The field shows hover, focus and open states.
  - While you type into an empty field, the `YYYY-MM-DD` mask stays faint, with the active
    segment highlighted. A half-typed year shows as `208Y`, not `0208`.
  - A value landing in the field glows briefly; a refused one shakes.
  - Paging slides the month in from the side, switching BS/AD cross-fades, a picked day pops,
    and the BS/AD icon turns.
  - All motion respects `prefers-reduced-motion`.
- **Popup placement:**
  - A popup taller than the room beside the field is capped and scrolls.
  - It never goes off the top of the screen.
  - It hides while the field is scrolled out of view.
  - It re-positions when its content changes size.
- **Phones:** swipe left/right on the calendar to change month.
- **Range picker:**
  - By default, a range can no longer run across a disabled day; set
    `allowDisabledInRange: true` for the old behavior.
  - The picked start shows as selected before you hover the end.
  - Keyboard focus previews the range like the mouse does.
  - Apply is disabled until there's a range.
- **Range output:** the `formatted` string follows `language: 'ne'`.
- **Bundle size grows** with the new features: about 27 KB gzipped for the date picker alone
  (was about 15 KB), and about 39 KB for everything. Unused pickers are dropped by bundlers.
  `npm run size` enforces a budget. `style.css` now ships minified, at 6 KB gzipped (was 7.4 KB).
- `images/` is no longer in the npm package; the README loads its images from the docs site.

- On phone widths, tapping a typeable field no longer raises the on-screen keyboard over the bottom
  sheet; the sheet (calendar and time wheels) is the input there. Wider screens still get the
  numeric keypad for typing.
- "Last 7/15/30/45/60 days" presets now span exactly that many days including today (they spanned
  one day more). Presets now use the date they're clicked on, so a page left open past midnight
  doesn't select yesterday's ranges.
- Presets and fiscal-year items are trimmed to `minDate`/`maxDate`; one entirely outside them does
  nothing.
- **The time picker defaults to 12-hour (AM/PM)** instead of 24-hour. Pass `timeFormat: '24h'` to
  keep the old behavior. The display and typed input follow `timeFormat`; the submitted `value`
  (e.g. `2024-04-13T14:05`) is unchanged and always 24-hour.
- Clearing is keyboard-first: **Ctrl/⌘ + Backspace** (or Delete) clears the field, and a read-only
  field also clears with plain Backspace/Delete. The × button is now a small, quiet control that
  appears on hover or focus (always visible on touch screens) and is skipped when tabbing through a
  form. `clearable: false` still turns clearing off.
- The year view is now one scrollable list of every supported year, opened centered on the current
  year, instead of pages of 12 years stepped with ‹ › buttons. Scroll or swipe to any year directly.

### Docs

- jQuery event examples fixed: `$(el).on('select.nepaliDatePicker', …)` never fires, because jQuery
  reads `.nepaliDatePicker` as a namespace. The docs now use the `onChange` option or
  `addEventListener`, and show `install($)` for a jQuery that isn't on `window`.

- New "One calendar for the whole app" section in the README and the options guide:
  `setDefaults({ mode: 'AD', allowModeToggle: false })` sets BS or AD for every picker and hides
  the BS/AD switcher. Covers all entry points, per-picker overrides, and switching pickers that
  are already mounted.

### Fixed

- Options that were typed and documented but did nothing now work, or are clearly deprecated:
  `inline`, `beforeShowDay`, `weekStartsOn`, `showButtonPanel`, `timeInputStyle`,
  `maxRangeSpanDays`, `numberOfMonths`, `linkedCalendars`, `alwaysShowCalendars` and the range
  `locale` labels. `locale.weekLabel` is deprecated, since week numbers aren't shown. A test now
  fails if a declared option is never read.
- Vue: passing a `Date` to `v-model` no longer logs a prop-type warning.
- Hovering the selected day no longer washes it out to the hover tint, which hid its number.
- Opening a picker no longer scrolls the page to the bottom before the popup is placed.
- The browser's spell-checker no longer underlines the empty field mask (`YYYY`, `hh`). In 12-hour
  mode the empty AM/PM slot now reads `aa` instead of `--`.
- The year list opens with the selected year centred, not tucked under the bottom fade.

- React: changing a function option such as `disabledDates` after mount now takes effect (functions
  were ignored when checking for changes). Only the props that changed are applied, so re-rendering
  doesn't reset a half-picked range.
- A custom `adapter` is now used for everything the popup shows (month names, digits, weekday
  labels, cross-calendar hints), not just for the value. The panel used to draw with the built-in
  adapter regardless.
- Only one picker popup is open at a time; opening one closes the other. Tabbing out of a field
  (focus moving to another control) now closes its popup.
- `autoInit()` can be called again (e.g. after AJAX or Turbo loads new content) without mounting a
  second picker on fields it already set up.
- The date-time picker's `altField` now works when the picker is mounted on a non-`<input>`
  element, as it already did for the range and month pickers.
- TypeScript: `setValue` on a mounted date-time picker accepts a `Date` (as the docs show), the
  range picker `{ start, end }`, and the month picker `{ year, month }`.
- A typed time is now checked like a picked one: times rejected by `disabledTimes`, or outside
  `minTime`/`maxTime`, are marked invalid instead of being accepted or silently clamped.
- Picking a fiscal year from the range picker's submenu now fires `onChange`, like the other
  presets.
- AD mode with `locale: 'ne'` showed BS month names (15 January as "१५ बैशाख"); it now shows
  Gregorian months in Nepali (`१५ जनवरी`).
- Relative bounds like `minDate: '-1m'` no longer overshoot at month ends: on 31 March, `'-1m'`
  gave 3 March instead of 29 February. Adding months now stops at the target month's last day.
- A half-typed year (e.g. `205`, then moving on) is no longer clamped into a real year and saved as
  a 1970 date. The entry is rejected and the field goes back to its previous value.
- Navigating past the ends of the supported calendar (BS 1970–2100, about AD 1913–2044) no longer
  crashes the picker. Navigation stops at the first/last month the calendar fully covers, and
  months beyond it show as disabled in the month grid.
- Date strings like `minDate: '2025-01-05'` (and `parseDateValue('2025-01-05')`) now mean that day
  everywhere. They were read as UTC midnight, which is the previous day west of UTC (the Americas),
  so bounds landed a day early. Impossible dates like `'2025-02-30'` are rejected.
- The `value` option is now actually controlled, as documented: passing a new `value` (a React
  prop, or `update({ value })`) replaces the picker's value instead of only applying at mount. It's
  applied silently, with no change event. In Vue, `v-model` remains the controlled value.
- Tapping a time on the wheel could be overridden a moment later by the row the wheel had been
  scrolled to (a leftover scroll timer from before the tap).
- Date-time picker: the Clear/Done buttons no longer run into the panel's edges.
- The focused input no longer shows a stray vertical line next to the × (its outline was clipped by
  the input group). The whole field now gets one soft focus ring instead.
- Date-time `setValue` (and so Vue `v-model` / jQuery `'setValue'`) now keeps the time of the
  value you pass instead of the previous time, and moves the calendar to that month.
- Clearing a picker now tells your code. Before, the × button changed nothing for `onChange`,
  Vue's `v-model`, React or jQuery. Every picker now has an `onClear` option, a `clear.*` DOM event
  (`clear.nepaliDatePicker`, `clear.nepaliDateRangePicker`, `clear.nepaliMonthPicker`), and
  `clear()` / `onClear(cb)` instance methods (jQuery: `'clear'`). Vue sets `v-model` to `null` and
  emits `@clear`. The × button, the date-time Clear button and erasing the typed text all count;
  `setValue(null)` stays silent.
- `destroy()` no longer removes your `<input>` from the page. The input is moved back to where it
  was, its original `name`, classes and attributes are restored, and its listeners are removed, so
  it can be mounted again (e.g. jQuery's destroy-then-reinit pattern).
- jQuery: `import 'nepali-datepicker-pro/jquery'` is no longer dropped by bundlers' tree-shaking
  (it was marked side-effect free, so the plugin never registered).
- jQuery: the UMD `<script>` bundle now includes the jQuery plugin, as the README's `<script>`
  example assumed; `NepaliPicker.installJQuery($)` registers it on a specific jQuery.
- jQuery TypeScript: `nepaliDateTimePicker`, `nepaliDateRangePicker` and `nepaliMonthPicker` are
  now declared on `JQuery`, so `$('#x').nepaliDateTimePicker(...)` type-checks.
- On phones, the date-time picker's time panel now spans the full width under the calendar
  instead of staying a narrow 168px strip.

## [0.4.1] - 2026-07-24

### Changed

- Pinned `esbuild`/`vite` (via `overrides` in `package.json`) to patched versions to close the
  `npm audit` findings pulled in transitively through `vitepress`'s bundled dev-server deps.
  Dev-tooling only — does not affect the published package.

## [0.4.0] - 2026-07-24

### Added

- `skills/nepali-datepicker-pro/` — an AI agent skill (`SKILL.md` + `reference.md`) shipped
  in the npm package, covering install, the five entry points, options tables, events, and
  common gotchas, so a coding agent (e.g. Claude Code) integrating this package into a
  consumer project can work from ground-truth docs instead of guessing at the API.

## [0.3.0] - 2026-07-24

### Added

- `DateTimeController.goToday()`, wired to a new small "Today" pill button tucked top-right of
  the calendar (above the grid, next to the header) on the date/datetime picker — jumps to and
  selects today's date regardless of which month/year/view is currently showing, mirroring the
  time panel's "Now" button. Deliberately tiny and out of the way rather than a full-width
  footer button, since it's a shortcut, not a primary action.

### Changed

- The with-time datetime panel (calendar + time sidebar) is denser overall: 500px wide instead
  of 560px, 40px day cells instead of 44px, a 168px time sidebar instead of 190px, and smaller
  time wheels/inputs to match — the date-only and range panels already had their own tighter
  sizing and are unaffected.
- The day-grid now always pads to a fixed 6 rows (42 cells), not just to a whole week. Months
  need either 5 or 6 rows depending on how many days they have and which weekday they start on,
  which was making the calendar (and the popup around it) visibly change height as you navigated
  between months — now every month renders at the same height.
- UX/UI refinement pass across all four pickers: date-range selections now render as a
  continuous "pill" (only the outer edge of the start/end cell rounds) instead of three
  disconnected shapes, hover/active states are filled in everywhere a control was missing one
  (Apply/Clear/Done buttons, presets, nav arrows, calendar label, month/year cells, mode
  toggle), those transitions ease in over ~0.12s (and drop out entirely under
  `prefers-reduced-motion: reduce`), the popup panel corners are slightly softer
  (`--ndp-radius-lg`), and several one-off hardcoded grays/red were consolidated into new
  `--ndp-color-surface-subtle`, `--ndp-color-surface-hover`, and `--ndp-color-danger` tokens.
- "Today" is now also marked with a ring around the cell, not color alone, so it stays legible
  for colorblind users and reads as a distinct, tactile state even when unselected.
- Second UX pass: stronger typographic hierarchy (bigger/bolder header month-year label,
  bigger day digits, smaller/uppercase/letter-spaced weekday header) so the panel scans faster;
  selected/active states got more visual weight — colored elevation shadows under
  selected/today day cells and selected month/year cells, a colored left edge on the active
  preset, and a hover/press "lift" on the Apply button — instead of a flat color swap. The base
  corner radius (`--ndp-radius`) went from 6px to 8px and the panel radius (`--ndp-radius-lg`)
  from 10px to 14px for a softer, less boxy shape.
- Saturday — Nepal's weekly holiday — is now shown in red across the weekday header and day
  grid, matching the convention on printed BS calendars.
- AD month names are now short (Jan, Feb, …) everywhere in the calendar UI, not just the
  month-select grid: the header title (e.g. "Jan 2026"), the cross-calendar hint under it, and
  the month-select grid (calendar header drilldown, range picker's "Pick a Month", and the
  standalone Month Picker) are all consistent now.
- Disabled dates, months, and time-wheel entries dropped the strikethrough + stacked
  faint-color-on-top-of-opacity treatment (it read as muddy/dated) for a single flat dim: normal
  text color at low opacity. Applies consistently to day cells, month cells, and time wheels.

### Fixed

- The BS month "Ashwin" (आश्विन, month 6)'s English name was misspelled `Ashoj` in
  `bsMonthNames('en')` — used by the Month Picker's `monthName` result and by `formatDateValue`
  for English-locale BS dates. Corrected to `Ashwin`.
- The single date/datetime picker's selected-day cell was getting squared off on one side — it
  reused the range picker's `is-range-start` class, which the new pill-shaped range styling had
  started rounding asymmetrically. It's back to fully rounded on all four corners; only an
  actual multi-day range (where the cell also carries `is-in-range`) gets the half-rounded cap.
- The trigger input's keyboard focus ring was `outline: 2px solid white` — invisible against
  the light surface. Fixed to use the new `--ndp-color-focus` token (defaults to the accent
  color), and a matching focus-visible ring was added to every control in the popup panel that
  previously had none (nav arrows, calendar label, day/month/year cells, presets, submenu
  items, mode toggle, Apply/Secondary buttons) — keyboard navigation through the panel is fully
  visible now.
- `--ndp-color-text-faint` (used for the cross-calendar secondary day number in every cell —
  real content, not decoration) was ~2.1:1 contrast against white; darkened to clear ~4.3:1.
- Touch targets bumped closer to comfortable minimums: the clear (×) button 18px → 22px, nav
  arrows 30px → 34px (26px → 28px in the compact range panel), mode toggle 36px → 38px wide.

## [0.2.0] - 2026-07-23

### Added

- `showSecondaryCalendar` option (default `true`) on all three pickers (`DateTimePickerOptions`,
  `DateRangePickerOptions`, `MonthPickerOptions`). Set to `false` to hide the other calendar's
  hint on the header, month/year grid, and day cells, for people who want to focus on one
  calendar system at a time. Live-updatable via `.update()`.
- Month/year labels now show the full span of months they overlap in the other calendar (e.g.
  `April/May` for BS Baisakh, since a BS month always straddles two AD months and vice versa)
  instead of a single misleading anchor month — in the calendar view, the range picker's
  "Pick a Month" grid, and the standalone Month Picker.

### Changed

- Default `locale` is now `'en'` instead of `'ne'` across all pickers. This affects the
  `formatted` result string and the Month Picker's `monthName`; the popup calendar's own script
  is still tied to `mode` (BS renders in Devanagari, AD in English) and is unaffected.

### Fixed

- Toggling BS/AD `mode` now re-anchors calendar navigation — the header, day/month/year grids,
  and the range picker's "Pick a Month" preset all walk the calendar you switch to, instead of
  only relabeling the input text. Previously AD mode still browsed BS months internally.
- Picking a month via "Pick a Month" while in AD mode no longer resolves to a BS-misread,
  decades-old date (the preset's month/year math is now mode-aware, matching the calendar it
  displays).

### Docs

- VitePress docs site (interactive per-picker demos, guide pages, component pages) updated to
  match the above: new `showSecondaryCalendar` control, flipped default-locale control value, and
  notes explaining the mode-aware calendar behavior.
