---
title: Installation
description: Install Nepali Datepicker Pro from npm for bundled apps, or drop in the CDN build for a plain HTML page — with per-framework snippets for vanilla JS, HTML, React, Vue and jQuery.
---

# Installation

Install from npm for bundled apps, or drop in the CDN build for a plain HTML page. The snippet
below follows the **Framework** switch — your choice is remembered across every page of these
docs.

<InstallSnippet />

Then import the stylesheet once, anywhere in your app:

```ts
import 'nepali-datepicker-pro/style.css';
```

The stylesheet is theme-aware (light/dark) and everything is namespaced under `.ndp-*`, so it
won't collide with your app's CSS.

## Entry points

The package ships one entry point per stack, so bundlers only pull in what you actually use:

| Import | Use for |
| --- | --- |
| `nepali-datepicker-pro` | Core mount functions and helpers (ES) |
| `nepali-datepicker-pro/vue` | Vue 3 components with `v-model` |
| `nepali-datepicker-pro/react` | React components |
| `nepali-datepicker-pro/jquery` | The jQuery plugin methods |
| `nepali-datepicker-pro/element` | Custom elements for Angular, Svelte, Astro, Lit or plain HTML |
| `nepali-datepicker-pro/holidays` | Nepal's fixed-date national days for the `events` option |
| `nepali-datepicker-pro/style.css` | The stylesheet |

Every subpath ships both ESM and CommonJS (`require('nepali-datepicker-pro/react')` works). The
UMD build (`dist/nepali-datepicker-pro.umd.cjs`) exposes everything on a global `NepaliPicker`
for `<script>`-tag pages, including the jQuery plugin. If a page only needs the date / date-time
and range pickers, `dist/nepali-datepicker-pro.core.umd.cjs` is the same global and API without
the month, year, time-only and multi-date pickers (about 35 KB gzipped instead of 39 KB).

## Bundle size

Zero runtime dependencies. A page with one date field loads about **18 KB gzipped** of JavaScript,
plus **6 KB** for `style.css`. The popup's code (about 7 KB more) is a separate chunk. It's fetched
when someone hovers, focuses or taps the field, so it's normally there before the click. Each
picker lives in its own module, so bundlers drop the ones you don't import.

On the very first open, the popup draws a moment after `show()` while its chunk arrives. In tests
that inspect the popup right after opening it, or to load everything at startup, await
`preloadPickers()`:

```js
import { preloadPickers } from 'nepali-datepicker-pro';
await preloadPickers();
```

## Custom elements

For frameworks without a dedicated wrapper (Angular, Svelte, Astro, Lit…) or plain HTML with a
bundler, import the element entry once. It registers six tags:

```html
<script type="module">
  import 'nepali-datepicker-pro/element';
  import 'nepali-datepicker-pro/style.css';
</script>

<form>
  <nepali-date-picker name="dob" mode="BS" max-date="today" required></nepali-date-picker>
  <nepali-date-range-picker name="period" number-of-months="2"></nepali-date-range-picker>
  <nepali-month-picker name="month"></nepali-month-picker>
  <nepali-year-picker name="year"></nepali-year-picker>
  <nepali-time-picker name="at" time-format="24h"></nepali-time-picker>
  <nepali-multi-date-picker name="days" max-dates="5"></nepali-multi-date-picker>
</form>
```

- **Attributes map to options** in kebab-case (`min-date` → `minDate`) and apply live when they
  change. Strings: `mode`, `language`, `theme`, `density`, `script`, `locale`, `time-format`,
  `display-format`, `value-format`, `min-date`, `max-date`, `opens`, `drops`,
  `invalid-behavior`, `time-input-style`. Numbers: `minute-step`, `number-of-months`,
  `fiscal-start-month`, `max-range-span-days`, `min-range-span-days`, `max-dates`, `min-year`,
  `max-year`, `week-starts-on`. Booleans (present, or `"true"`/`"false"`): `with-time`,
  `with-seconds`, `inline`, `required`, `disabled`, `allow-mode-toggle`, `clearable`,
  `allow-input`, `auto-apply`, `show-secondary-calendar`, `show-calendar-suffix`,
  `linked-calendars`.
- **`name`** becomes `submitName`, so the machine value submits with the surrounding form.
  `placeholder` goes on the field. `value` takes `YYYY-MM-DD`, `start,end` (range and
  multi-date), `YYYY-MM` (BS month), `YYYY` (year) or `HH:mm[:ss]` (time).
- **Richer options** — functions, `events`, `presets`, `strings` — go on the `options` property:
  `el.options = { disabledDates: (d) => d.getDay() === 6 }`.
- **Events** on the element: `change` (`detail` is the result), `clear`, `open`, `close` and
  `invalid` (`detail` is `{ reason, message }`).
- **Members:** `value` (read the result, or set a value), `instance`, `show()`, `hide()`,
  `clear()`.
- **Light DOM.** There's no shadow root, so `style.css`, the theme tokens and your page styles
  apply. An `<input>` you put inside the element is used as the field; otherwise one is created.

## Requirements

- **Node** ≥ 18 for the build tooling (the runtime itself has no Node dependency)
- **Peer dependencies** are all optional — install only the framework you use: `vue` ≥ 3,
  `react`/`react-dom` ≥ 18, or `jquery` ≥ 3

## Next steps

- [Basic usage](/guide/basic-usage) — mount a picker and read its value
- [Quick start snippets](/guide/quick-start) — every picker in every framework, side by side
