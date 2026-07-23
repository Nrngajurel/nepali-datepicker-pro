# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`nepali-datepicker-pro` — a framework-agnostic Bikram Sambat (BS) ↔ Gregorian (AD) date/datetime/range/month picker. Zero runtime dependencies. One conversion engine + one set of controllers in `src/`, with thin wrapper entry points for vanilla JS, `<script>` tag (UMD), jQuery, Vue 3, and React. Node ≥18 to consume the package; Node ≥22 to develop it (Vite 8).

## Commands

```bash
npm run dev          # = docs:dev — VitePress docs site with live component demos (primary way to visually exercise the pickers)
npm test             # vitest run — full suite, ~sub-second
npm run test:watch   # vitest watch mode
npm run lint         # tsc --noEmit
npm run build        # vite build (ES entries + .d.ts) + vite build --config vite.umd.config.ts (UMD)
npm run docs:build   # build the VitePress site (served under base /nepali-datepicker-pro/)
npm run docs:preview # preview the built docs site
```

Run a single test file or test case with vitest directly:

```bash
npx vitest run test/engine.test.ts
npx vitest run test/engine.test.ts -t "some test name"
```

CI (`.github/workflows/ci.yml`) runs, in order: `npm ci` → `npm run lint` → `npm test` → `npm run build`. `prepublishOnly` runs the same three before an npm publish.

## Changelog

`CHANGELOG.md` (repo root, [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format) is maintained on every change — update it in the same pass as the code, not as an afterthought. Add entries under `## [Unreleased]`, in the appropriate `### Added` / `### Changed` / `### Fixed` / `### Docs` subsection (create the subsection if it doesn't exist yet under Unreleased). When a version is actually released (`package.json` bumped + published), rename `[Unreleased]` to the new version + date and start a fresh empty `[Unreleased]` above it. Keep entries user-facing (what changed and why it matters to someone consuming the package), not implementation narration.

## Architecture

Everything is one package, layered bottom-up. Higher layers depend only on the layer(s) below; there is no reverse dependency.

1. **`calendar-data/bs-month-lengths.ts`** — vendored, static BS month-length table (`BS_YEAR_MIN`=1970..`BS_YEAR_MAX`=2100) plus the BS/AD epoch pair. Generated once from a reference oracle; not regenerated at runtime.
2. **`adapters/bs-ad-calendar-adapter.ts`** (`BsAdCalendarAdapter`, exported singleton `defaultCalendarAdapter`) — the actual BS↔AD conversion engine. Precomputes cumulative day-offset tables (`YEAR_START`/`MONTH_CUMULATIVE`) from the month-length data at module load, so `adToBs`/`bsToAd` are O(1)/O(log n) instead of iterating day-by-day. All calendar math funnels through the `CalendarAdapter` interface (`types.ts`), so it's swappable via the `adapter` option on every picker.
3. **`date-math/native-date-math.ts`** — the plain-AD-calendar counterpart (`DateMath` interface): add/diff/format/parse/startOf/endOf on native `Date`, no library (no dayjs/moment).
4. **`domain/date-value.ts`** — small value types pairing an AD `Date` with its `BsDate` projection.
5. **`format/index.ts`** — display formatting (`formatDateValue`, `formatRange`, dayjs-style tokens) _and_ the display/submission split: `formatMachineValue` turns a date into the "server" value per `ValueFormat` (`'iso' | 'iso-bs' | 'timestamp' | 'date-object'` or a custom `{ calendar, format }`), independent of what's shown on screen. This is the mechanism behind `valueFormat`/`submitName`/`altField` in the public API.
6. **`application/*-controller.ts`** — headless state machines, one per picker (`date-time-controller.ts`, `date-range-controller.ts`, `month-picker-controller.ts`), plus `constraints.ts` (min/max/disabled-day logic shared across them), `presets.ts` (date-range quick-picks incl. fiscal-year-aware ranges), and `calendar-view.ts` (mode-aware calendar-navigation helpers — converting a viewed year/month between BS and AD, month/year bounds, day-grid building, and cross-calendar month-span labels — shared by the date-time and date-range controllers so BS/AD mode toggling walks the actual calendar being switched to, not just relabels it). Controllers own state and business rules; they know nothing about the DOM.
7. **`render/dom.ts`** — pure(ish) DOM rendering functions for each picker's popup panel (`renderDateTimePanel`, `renderRangePanel`, `renderMonthPickerPanel`) plus `positionPopup` (`position/index.ts` — opens/drops placement logic for `appendTo`/`opens`/`drops`).
8. **`autoinit/`** — the glue layer that wires a controller + renderer to a real `<input>`: `segmented-field.ts` (keyboard-editable segmented input, driven by schemas in `segment-schemas.ts`), and `index.ts` (`mountDateTimePicker`, `mountDateRangePicker`, `mountMonthPicker`, `setDefaults`, `regional`, `autoInit` for `data-nepali-datepicker` attribute scanning). This is the vanilla-JS public surface and what every framework wrapper ultimately calls.
9. **`a11y/index.ts`** — small ARIA/focus helpers used by the render layer.
10. **Framework entry points** — `jquery.ts`, `vue.ts`, `react.tsx` are thin wrappers around the `autoinit` mount functions; they translate framework idioms (jQuery plugin methods, Vue `v-model`/emits, React props/refs) but never duplicate calendar or state logic. `index.ts` is the barrel for the core + vanilla API.

Because behavior lives once in the adapter/controller/render/autoinit stack, a bug fix or feature there fixes all five entry points simultaneously — check whether a change belongs in `application`/`render`/`autoinit` (shared) before touching a framework-specific file.

### Value vs. display

A recurring design point: the calendar `mode` (BS/AD) and `displayFormat` shown to the user are decoupled from the machine `value` sent to a backend (`valueFormat`, `submitName`, `altField`, `altFormat`). This split is implemented in `format/index.ts` (`formatMachineValue`/`stringifyMachineValue`) and threaded through every controller's result object (`DateTimeResult`, `DateRangeResult`, `MonthResult` in `types.ts`). Don't conflate the two when changing formatting code.

### Testing

- Vitest, configured in `vitest.config.ts`. Tests import directly from `src/*.ts` — no build step or `dist/` coupling.
- Default environment is `node`. DOM-dependent test files opt into jsdom via a `// @vitest-environment jsdom` docblock at the top of the file (see `test/mount-datetime.test.ts`, `test/react-wrapper.test.tsx`, `test/vue-wrapper.test.ts`, `test/docs.test.ts`).
- `test/engine.test.ts` verifies the BS↔AD adapter; `test/fixtures/bs-ad-parity.json` holds known-good BS/AD pairs. The fixtures (and the engine test) only cover **BS 2001–2100** as an oracle-verified range — the reference oracle used to generate them is only self-consistent from its own epoch onward. The pre-2001 range (down to `BS_YEAR_MIN`=1970) is instead guarded by round-trip and monotonicity invariants, not fixture equality.
- `test/docs.test.ts` tests the VitePress docs site's interactive demo registry (`docs/.vitepress/theme/registry`) — option-builders and per-framework code snippets shown in the docs, not the picker engine itself.
- `@lib` path alias (`docs/.vitepress/config.ts`, `vitest.config.ts`, `tsconfig.json`) points at `src/`, used by the docs site's Vue demo components to import the library from source.

### Build

- `vite.config.ts` — ES library build: entries for `index`, `jquery`, `vue`, `react` → `dist/`, with `.d.ts` generation (`vite-plugin-dts`) and a plugin that copies `src/theme.css` to `dist/style.css`. `vue`/`react`/`react-dom`/`jquery` are always external (never bundled — they're optional peer deps).
- `vite.umd.config.ts` — second build pass producing the single-file UMD bundle (`dist/nepali-datepicker-pro.umd.cjs`, global `NepaliPicker`) for plain `<script>` tag consumption.
- `dist/` is git-ignored; it's only produced by `npm run build` and is what actually ships to npm (`package.json` `files`).
- `docs/.vitepress/dist/` (built docs site) and `docs/.vitepress/cache/` are also git-ignored.
- `references/` (the vendored reference oracle script used to originally generate `calendar-data`) is git-ignored — local-only, not part of the package or the checked-in source of truth.

while commiting never ever keep claude as coworker
