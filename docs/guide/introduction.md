---
title: Introduction
description: What Nepali Datepicker Pro is, what it ships, and why it exists — a framework-agnostic Bikram Sambat date, time, range, month, year and multi-date picker with zero dependencies.
---

# Introduction

**Nepali Datepicker Pro** is a self-owned Bikram Sambat ↔ Gregorian calendar engine with date,
time, range, month, year and multi-date pickers — framework-agnostic, and ready for vanilla JS,
a plain `<script>` tag, jQuery, Vue, React and custom elements.

- **BS 1970–2100** of validated calendar data
- **About 18 KB gzip** to put a date field on a page; the popup's code (about 7 KB) loads when the field is first reached for. Tree-shakeable
- **Zero runtime dependencies**
- **WCAG 2.2 AA**, checked with axe-core in CI

## What's in the box

| Component | What it does |
| --- | --- |
| [Date & Time Picker](/components/date-time-picker) | A single date, with an optional same-screen time picker. |
| [Date Range Picker](/components/date-range-picker) | Start/end range with a presets rail and Nepali fiscal-year helpers. |
| [Month Picker](/components/month-picker) | One BS month, resolved to the AD date range it covers. |
| [Year Picker](/components/year-picker) | One BS or AD year, resolved to the date range it covers. |
| [Time Picker](/components/time-picker) | A time of day on its own, 12h or 24h. |
| [Multiple Date Picker](/components/multi-date-picker) | Several days from one calendar. |
| [Helper functions](/api/helpers) | A `NepaliFunctions`-compatible BS↔AD toolkit, usable with no picker at all. |

## Why another Nepali datepicker

Most Nepali date pickers are a jQuery plugin with a lookup table bolted on, and they force one
calendar system on both your UI and your database. This one separates the two concerns:

- **The engine is independent of the UI.** `nepaliFunctions` and the calendar adapter work on
  their own — you can convert dates, validate them and do BS month math without rendering
  anything. See [Helper functions](/api/helpers).
- **What you display is not what you submit.** A BS-mode picker — in Nepali digits if you set
  `locale: 'ne'`, English by default — can still hand your backend a clean AD ISO string, with no
  conversion glue in your form handler. See [Options](/guide/options).
- **One package, every stack.** The same core is wrapped for Vue, React, jQuery and plain HTML
  auto-init, so a mixed codebase doesn't need four different pickers.

## Accuracy

The bundled adapter is O(1) and validated against the official calendar for **BS 1970–2100**.
Conversions outside that window are rejected rather than silently approximated.

## Next steps

- [Installation](/guide/installation) — npm or CDN, in your framework
- [Basic usage](/guide/basic-usage) — mount a picker and read its value
- [Components](/components/date-time-picker) — live demos you can configure and copy from
