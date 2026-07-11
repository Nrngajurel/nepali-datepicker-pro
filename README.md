# Nepali Date Picker

A framework-agnostic Nepali **Bikram Sambat (BS) ↔ Gregorian (AD)** date, **date-time**, and **range** picker. Self-owned calendar engine (no CDN, no third-party Nepali-date dependency), a same-screen time picker, and thin wrappers for a plain `<script>` tag, jQuery, Vue, and React — all over one shared core.

The implementation follows the build spec in `references/`.

## Quick start

### Plain `<script>` tag (no build tools)

```html
<link rel="stylesheet" href="nepali-datepicker/dist/style.css" />
<script src="nepali-datepicker/dist/nepali-datepicker.umd.cjs"></script>

<input type="text" data-nepali-datepicker data-with-time="true"
       data-time-format="12h" data-minute-step="5" readonly />

<script>NepaliPicker.autoInit()</script>
```

### Bundler (Vite / webpack / etc.)

```ts
import { mountDateTimePicker } from 'nepali-datepicker';
import 'nepali-datepicker/style.css';

const picker = mountDateTimePicker(document.querySelector('#when'), {
  withTime: true,
  timeFormat: '12h',
  minuteStep: 5,
});
```

Framework entry points: `nepali-datepicker/jquery`, `nepali-datepicker/vue`, `nepali-datepicker/react` (each declares the framework as an optional peer dependency).

### Month picker (for monthly reports / payslips)

Selects a single BS month and hands back the AD date range it covers:

```html
<input type="text" data-nepali-monthpicker readonly />
```
```ts
import { mountMonthPicker } from 'nepali-datepicker';

mountMonthPicker(input, {
  onChange: ({ year, month, start, end, formatted }) => {
    // formatted → "श्रावण २०८१"; start/end → AD Date range for that BS month
  },
});
```
Also available as `NepaliMonthPicker` (Vue/React) and `$.fn.nepaliMonthPicker` (jQuery).

## Project layout

```
src/           all TypeScript — engine, controllers, renderer, autoinit, wrappers
  index.ts       core + vanilla API (barrel)
  jquery.ts      jQuery plugin entry
  vue.ts         Vue component entry
  react.tsx      React component entry
  theme.css      the stylesheet
playground/    Vite dev app (main.ts) — mounted by index.html
test/          Vitest suites (engine correctness, DOM, mount) + fixtures/
scripts/       data-table + fixture generators (from references/)
dist/          build output (generated, git-ignored)
```

## Scripts

```sh
npm run dev            # live playground with hot reload
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
