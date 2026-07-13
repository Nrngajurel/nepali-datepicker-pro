# Advance Nepali DatePicker

A framework-agnostic Nepali **Bikram Sambat (BS) ↔ Gregorian (AD)** date, **date-time**, and **range** picker. Self-owned calendar engine (no CDN, no third-party Nepali-date dependency), a same-screen time picker, and thin wrappers for a plain `<script>` tag, jQuery, Vue, and React — all over one shared core.

The implementation follows the build spec in `references/`.

## Quick start

### Plain `<script>` tag (no build tools)

```html
<link rel="stylesheet" href="advance-nepali-datepicker/dist/style.css" />
<script src="advance-nepali-datepicker/dist/advance-nepali-datepicker.umd.cjs"></script>

<input type="text" data-nepali-datepicker data-with-time="true"
       data-time-format="12h" data-minute-step="5" readonly />

<script>NepaliPicker.autoInit()</script>
```

### Bundler (Vite / webpack / etc.)

```ts
import { mountDateTimePicker } from 'advance-nepali-datepicker';
import 'advance-nepali-datepicker/style.css';

const picker = mountDateTimePicker(document.querySelector('#when'), {
  withTime: true,
  timeFormat: '12h',
  minuteStep: 5,
});
```

Framework entry points: `advance-nepali-datepicker/jquery`, `advance-nepali-datepicker/vue`, `advance-nepali-datepicker/react` (each declares the framework as an optional peer dependency).

### Month picker (for monthly reports / payslips)

Selects a single BS month and hands back the AD date range it covers:

```html
<input type="text" data-nepali-monthpicker readonly />
```
```ts
import { mountMonthPicker } from 'advance-nepali-datepicker';

mountMonthPicker(input, {
  onChange: ({ year, month, start, end, formatted }) => {
    // formatted → "श्रावण २०८१"; start/end → AD Date range for that BS month
  },
});
```
Also available as `NepaliMonthPicker` (Vue/React) and `$.fn.nepaliMonthPicker` (jQuery).

## Server value / form submission

The visible input shows the localized display (Nepali-digit BS by default), but a
form must submit a stable, machine-readable value. Use `valueFormat` to choose the
shape of that value — **independent of the display calendar/format** — and deliver
it one of three ways:

| Option | What it does |
| --- | --- |
| `valueFormat` | `'iso'` (AD ISO, **default**), `'iso-bs'` (BS ISO), `'timestamp'`, `'date-object'`, or `{ calendar, format }`. |
| `submitName` | Injects a hidden `<input name>` carrying the value and drops the `name` from the visible input, so the form submits the machine value (select2-style). |
| `altField` | Writes the value into an existing element/field you provide (jQuery-UI-style). |
| `altFormat` | Overrides the format for `altField` / `submitName` only. |

```html
<input data-nepali-datepicker data-submit-name="appointment_date" data-value-format="iso">
```
```ts
mountDateTimePicker(input, { submitName: 'appointment_date', valueFormat: 'iso' });
// user sees २०८१-०१-०१ (BS) · the form submits appointment_date=2024-04-13 (AD ISO)
```

The value is also on every `onChange`/`onApply` payload and dispatched CustomEvent
as `.value` (range: `.startValue` / `.endValue` / `.value`). Range delivery accepts
a `{ start, end }` pair for `submitName` / `altField`; toggling the BS↔AD display
never changes the submitted value.

## Project layout

```
src/           all TypeScript — engine, controllers, renderer, autoinit, wrappers
  index.ts       core + vanilla API (barrel)
  jquery.ts      jQuery plugin entry
  vue.ts         Vue component entry
  react.tsx      React component entry
  theme.css      the stylesheet
playground/    Vue docs app (App.vue) — interactive, framework-aware snippets
test/          Vitest suites (engine correctness, DOM, mount) + fixtures/
scripts/       data-table + fixture generators (from references/)
dist/          build output (generated, git-ignored)
```

## Scripts

```sh
npm run dev            # interactive docs: tweak options, live preview, copy per-framework snippets
npm run build          # library build → dist/ (ES modules + UMD + .d.ts + style.css)
npm test               # vitest run (add :watch for watch mode)
npm run lint           # tsc --noEmit
npm run prepare:data   # regenerate the vendored BS month-length table from references/
npm run gen:fixtures   # regenerate BS↔AD oracle fixtures for the engine tests
```

## Notes

- **Calendar engine** is self-owned: a vendored BS month-length table (BS 1970–2100) plus O(1) arithmetic, validated in CI against an independent oracle across BS 2001–2100 and by full-range round-trip/monotonic invariants.
- **Time picker** renders beside the calendar on the same screen (hours + minutes) — click `▲`/`▼`, type, scroll, or use `↑`/`↓`; AM/PM for 12-hour, `minuteStep`, and a "Now" button.
- **Month/year navigation**: click the calendar header to drill into a month grid, then a year grid, to jump anywhere quickly.
- **Range picker**: presets rail, a clear "pick start / pick end" flow for custom ranges, and a BS/AD input-group switch.
