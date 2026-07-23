# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
