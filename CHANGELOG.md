# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
