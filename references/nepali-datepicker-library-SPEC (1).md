# Nepali Date Picker Library — Build Specification (Final)

**Audience:** an AI coding agent (or engineer) implementing this from scratch.
**Input artifacts:** `nepali-date-range-picker.html` (attached prototype — its layering is the baseline architecture) and the live API surface of `nepalidatepicker.sajanmaharjan.com.np/v5` (confirmed by fetch, see §3.1 — this is the "commonly used pattern" the spec now mirrors on purpose).
**Deliverable:** one npm-published library exposing two components — a **DateTime Picker** and a **Date Range Picker** — consumable from Vanilla JS/HTML, jQuery, Vue, React, and (by construction) any other framework.

---

## 0. Revision notes (v1 → final)

This pass reviewed v1 against established gold-standard pickers (jQuery UI Datepicker, `daterangepicker.js`, flatpickr, Air Datepicker) and against the actual reference site's documented API. Three changes of substance:

1. **Dependency policy relaxed for AD-side date math.** v1 mandated zero dependencies everywhere, including Gregorian date arithmetic. That's over-engineering for no real benefit — mature libraries solve AD-side edge cases (DST-adjacent bugs don't apply here since we're calendar-date-only, but leap years, month-end arithmetic, relative-date parsing, and formatting are still worth not reinventing). **dayjs is now the recommended default; moment is an accepted alternative** for teams that already standardize on it — both sit behind one internal seam so only one is ever bundled. The Nepali BS↔AD conversion itself stays vendored/self-owned (§4) — that part was never negotiable, since it's the actual product differentiator and the one place "outsourcing" would defeat the purpose.
2. **Added a `NepaliFunctions`-compatible utility layer** (§4.2) mirroring the reference plugin's exact method names (`AD2BS`, `BS2AD`, `BS.GetDaysInMonth`, `ConvertToUnicode`, etc., confirmed live from the site) — same conventions, own implementation, own namespace (not literally `window.NepaliFunctions`, to avoid clashing with the real CDN script if both ever load on one page).
3. **Added the gold-standard surface area v1 was missing entirely:** an `appendTo`/portal + collision-flip positioning model (§8), a full keyboard/ARIA spec (§9), an instance method API + jQuery plugin package (§10, §7.4), and locale-object / preset shapes lifted directly from `daterangepicker.js` and jQuery UI Datepicker conventions (§6, §9 of options tables) since those are what most integrators (especially in Laravel/Blade-admin-template land) already know by muscle memory.

Nothing from v1's layering (§5 below) changed — it was already correct and is the reason all of this could be added without a rewrite.

---

## 1. Non-negotiable constraints

| Constraint | Detail |
|---|---|
| **Nepali calendar engine is self-owned** | BS↔AD conversion is a vendored static data table + our own arithmetic (§4). No runtime `<script src>` to any CDN, no npm dependency on a third-party Nepali-date package. This is the one piece of domain logic that *is* the product. |
| **AD-side date math may use a library** | Formatting, parsing, relative-date strings ("+7d"), month/year arithmetic on the Gregorian side may depend on **dayjs** (default) or **moment** (accepted alternative) — see §1.1. Not "zero-dependency-at-all-costs"; that was over-scoping. |
| **Framework-agnostic core** | All domain/state-machine logic lives in one pure TS package with no DOM-framework import. jQuery/Vue/React packages are thin shells over the core controller — never reimplement date logic per framework. |
| **Zero-JS usage must work** | A `<script>` tag + HTML attributes produces a working picker with no JS written by the integrator (auto-init from `data-*`), matching the reference plugin's own "tie it to a standard input field" simplicity. |
| **Familiar, not novel, API surface** | Where a gold-standard convention already exists (jQuery UI Datepicker's `beforeShowDay`/`onSelect`, `daterangepicker.js`'s `ranges`/`locale`/`opens`/`drops`, the reference plugin's `container` + `NepaliFunctions` naming), **mirror it** rather than inventing new names. Lowers the adoption cost to near zero for anyone who has used any of these before. |
| **Fully configurable, nothing hardcoded** | Every literal in the prototype's `NDRP_CONFIG` becomes a typed, documented option (§6, §7). |
| **SOLID / DI at the seams that matter** | Two swappable boundaries: `CalendarAdapter` (BS↔AD engine, §4) and `DateMath` (AD-side library, §1.1). Everything else (controller, renderer, framework wrappers) depends on interfaces, never concrete implementations. |
| **No big-bang rewrite** | Reuse the prototype's Domain → Adapter → Application → Render pipeline as-is; add the jQuery package, positioning, a11y, and instance-API as new layers on top, not replacements. |

### 1.1 Dependency tradeoff — dayjs vs moment

| | dayjs (recommended default) | moment (accepted alternative) |
|---|---|---|
| Size | ~2 KB min+gzip | ~70 KB min+gzip |
| API | moment-compatible (`.add()`, `.format()`, `.diff()`) | itself |
| Maintenance | actively maintained | in maintenance mode by its own team; no new features |
| When to choose | new installs, size-sensitive bundles | host app already depends on moment elsewhere — avoid shipping two date libs |

Both sit behind one internal `DateMath` interface (`add`, `diff`, `format`, `parse`, `startOf`, `endOf`). Core ships a dayjs-backed implementation by default; passing `{ dateMath: momentAdapter(moment) }` swaps it — same DI pattern as `CalendarAdapter`, so the choice never leaks into Domain/Application code.

---

## 2. Package structure & npm packages

```
nepali-datepicker/
├── packages/
│   ├── core/            # @nepali-picker/core    — engine + vanilla API, dayjs as its only dep
│   │   ├── src/
│   │   │   ├── domain/          # DateValue, DateRange, TimeValue — pure value objects
│   │   │   ├── calendar-data/   # vendored BS<->AD table (generated, §4.1)
│   │   │   ├── adapters/        # CalendarAdapter, BsAdCalendarAdapter (default)
│   │   │   ├── date-math/       # DateMath seam, dayjs adapter (default), moment adapter
│   │   │   ├── functions/       # NepaliFunctions-compatible compat layer (§4.2)
│   │   │   ├── application/     # controllers: datetime, range; presets; instance API (§10)
│   │   │   ├── render/          # framework-free DOM renderer (vanilla target)
│   │   │   ├── position/        # appendTo/portal + collision-flip (§8)
│   │   │   ├── a11y/            # keyboard nav + ARIA wiring (§9), shared by all render targets
│   │   │   ├── format/          # display tokens, locale objects
│   │   │   ├── autoinit/        # data-attribute scanner for zero-JS usage
│   │   │   └── index.ts
│   │   └── package.json
│   ├── jquery/           # @nepali-picker/jquery  — $.fn plugin, peerDep: jquery
│   ├── vue/              # @nepali-picker/vue     — peerDep: vue
│   ├── react/             # @nepali-picker/react   — peerDep: react
│   └── style/            # @nepali-picker/style   — CSS custom-property theme, framework-free
├── examples/
│   ├── vanilla-html/
│   ├── jquery-app/
│   ├── vue-app/
│   └── react-app/
├── docs/
├── .github/workflows/ci.yml
└── package.json          # workspaces root
```

**Why `jquery` is its own package, not bundled into `core`:** jQuery is a peer dependency only that package needs; `core`/`vue`/`react` consumers must never pay for it. This mirrors why `vue`/`react` are already separate — one rendering shell per ecosystem, one shared engine underneath.

---

## 3. Gold-standard prior art (what this spec deliberately mirrors)

| Convention | Source | Adopted as |
|---|---|---|
| `$(el).datepicker(options)`, method-call API (`'destroy'`, `'setDate'`, `'option'`), `$.datepicker.setDefaults()`, `$.datepicker.regional['xx']` | jQuery UI Datepicker | §7.4/§10 instance methods; §6/§7 `regional`-style locale packs |
| `beforeShowDay(date) → [selectable, cssClass, tooltip]`, `onSelect`, `onChangeMonthYear`, `onClose` | jQuery UI Datepicker | §7.1 callback options |
| `ranges` object, `locale` object (`format`, `separator`, `applyLabel`, `cancelLabel`, `daysOfWeek`, `monthNames`, `firstDay`), `opens`, `drops`, `linkedCalendars`, `autoApply`, `alwaysShowCalendars` | `daterangepicker.js` (Dan Grossman) | §7.2 range-picker options — this is the most-recognized range-picker API in the Bootstrap-admin-template world, worth matching closely |
| `appendTo`, auto-flip positioning | flatpickr, Air Datepicker | §8 |
| `{container: "#modal-id"}`, "tied to any standard input field, shown on focus, hidden on select/blur", `AD2BS`/`BS2AD`/`BS.GetDaysInMonth`/`ConvertToUnicode`/`BS.GetMonthsInUnicode` naming | **nepalidatepicker.sajanmaharjan.com.np v5** (confirmed live, see below) | §4.2 compat layer; `container` kept as an alias of `appendTo` in the jQuery package specifically |

### 3.1 Reference plugin surface (confirmed, not assumed)

The reference site initializes via `element.NepaliDatePicker(options)` directly on the DOM element (its own vanilla-plugin convention, no jQuery required by v5) and documents these globally-available functions once its script is loaded: `Get2DigitNo`, `ParseDate`, `ConvertToDateObject`, `ConvertToDateFormat`, `AD2BS`, `BS2AD`, `ConvertToUnicode`, `ConvertToNumber`, `NumberToWords`, `NumberToWordsUnicode`, plus namespaced `AD.*` / `BS.*` methods (`GetCurrentDate`, `GetCurrentYear/Month/Day`, `GetMonths`, `GetDays(Short)`, `GetDaysInMonth`, `DatesDiff`, `AddDays`, `GetFullDate`, and BS-only `ValidateDate`, `IsBetweenDates`, `GetMonthsInUnicode`, `GetDaysUnicodeShort`, `IsEqualTo/GreaterThan/LessThan`). §4.2 reproduces this exact shape under our own namespace.

---

## 4. Calendar engine

### 4.1 Vendored BS↔AD data (unchanged from v1 — this is the part that stays "from zero")

```ts
// packages/core/src/calendar-data/bs-month-lengths.ts
export const BS_YEAR_MIN = 1970;
export const BS_YEAR_MAX = 2099;
export const BS_MONTH_LENGTHS: readonly (readonly number[])[] = [ /* [year-BS_YEAR_MIN] => [d1..d12] */ ];
export const BS_EPOCH_AD: Readonly<Record<number, string>> = { /* bsYear => ISO date of 1 Baishakh AD */ };
```

```ts
// packages/core/src/adapters/calendar-adapter.ts
export interface CalendarAdapter {
  adToBs(adDate: Date): { year: number; month: number; day: number };
  bsToAd(year: number, month: number, day: number): Date;
  daysInBsMonth(year: number, month: number): number;
  todayBs(): { year: number; month: number; day: number };
  bsMonthNames(locale: 'ne' | 'en'): string[];
  bsWeekdayShort(locale: 'ne' | 'en'): string[];
  toLocaleDigits(n: number, locale: 'ne' | 'en'): string;
  minSupportedYear: number;
  maxSupportedYear: number;
}
```

`BsAdCalendarAdapter implements CalendarAdapter` using only the two tables above — pure arithmetic, zero I/O, zero dependency, unit-testable by round-tripping every year in range (§12).

### 4.2 `NepaliFunctions`-compatible utility layer (new)

Own implementation, same names/signatures as §3.1, exported under our own namespace so it never collides with the real CDN script if a page happens to load both:

```ts
// packages/core/src/functions/index.ts
export const nepaliFunctions = {
  AD2BS: (d: Date) => adapter.adToBs(d),
  BS2AD: (y: number, m: number, d: number) => adapter.bsToAd(y, m, d),
  ConvertToUnicode: (n: number) => adapter.toLocaleDigits(n, 'ne'),
  AD: {
    GetCurrentDate: () => new Date(),
    GetDaysInMonth: (y: number, m: number) => dateMath.daysInMonth(y, m),
    DatesDiff: (a: Date, b: Date) => dateMath.diff(a, b, 'day'),
    AddDays: (d: Date, n: number) => dateMath.add(d, n, 'day'),
  },
  BS: {
    GetCurrentDate: () => adapter.todayBs(),
    GetDaysInMonth: (y: number, m: number) => adapter.daysInBsMonth(y, m),
    GetMonthsInUnicode: () => adapter.bsMonthNames('ne'),
    GetDaysUnicodeShort: () => adapter.bsWeekdayShort('ne'),
    ValidateDate: (y: number, m: number, d: number) => d >= 1 && d <= adapter.daysInBsMonth(y, m),
    IsEqualTo: (a: BsDate, b: BsDate) => /* ... */ false,
    IsGreaterThan: (a: BsDate, b: BsDate) => /* ... */ false,
  },
};
```

**Purpose:** anyone migrating off the reference plugin (or off code that already calls `NepaliFunctions.*`) gets a near-drop-in replacement — same method shape, no CDN, no global script tag, tree-shakeable (import only what's used).

---

## 5. Layering (unchanged from v1 — still the backbone)

```
Framework/plugin wrappers (jQuery $.fn / Vue SFC / React component / auto-init)   ← thin, per-ecosystem
Render (framework-free DOM builder — vanilla target, + position + a11y wiring)    ← pure functions of state
Application (controllers: state machine, presets, instance-method API)           ← no DOM, no framework
Adapters (CalendarAdapter + DateMath — the two DI seams)                         ← swappable
Domain (DateValue, DateRange, TimeValue — pure value objects)                    ← no I/O at all
```

Dependencies point downward only. Application never imports a framework or jQuery. Render never imports Vue/React/jQuery. Wrappers contain no date logic — they call the controller and re-render/re-emit on `onChange`.

---

## 6. Component 1 — `NepaliDateTimePicker`

### 6.1 Config

```ts
export interface DateTimePickerOptions {
  // calendar
  mode?: 'BS' | 'AD';
  allowModeToggle?: boolean;           // default true
  locale?: 'ne' | 'en';                // default 'ne'
  weekStartsOn?: 0|1|2|3|4|5|6;        // default 0

  // value & bounds
  value?: Date | null;
  defaultValue?: Date | null;
  minDate?: Date | string | null;      // string: 'today' | '+7d' | '-1m' | '+2y' (parsed via DateMath)
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
  beforeShowDay?: (date: Date) => { selectable: boolean; cssClass?: string; tooltip?: string };
                                        // jQuery UI Datepicker convention — per-day override

  // time
  withTime?: boolean;                  // default false
  timeFormat?: '12h' | '24h';          // default '24h'
  minuteStep?: number;                 // default 1
  secondsPrecision?: boolean;          // default false
  minTime?: { hour: number; minute: number };
  maxTime?: { hour: number; minute: number };
  disabledTimes?: (h: number, m: number) => boolean;
  defaultTime?: { hour: number; minute: number; second?: number };
  timeInputStyle?: 'spinner' | 'dropdown'; // default 'spinner'

  // formatting / form integration
  displayFormat?: string;              // dayjs/moment-style tokens, §9
  valueFormat?: 'iso' | 'timestamp' | 'date-object';
  altField?: string | HTMLElement;     // jQuery UI convention — hidden input for the "real" value
  altFormat?: string;                  // format written into altField (e.g. always ISO AD for a Laravel form post)

  // presentation
  inline?: boolean;                    // render calendar permanently in container, no popup/trigger
  appendTo?: string | HTMLElement;     // portal target, escapes overflow:hidden/modal clipping (§8)
  opens?: 'left' | 'right' | 'center' | 'auto'; // default 'auto'
  drops?: 'down' | 'up' | 'auto';      // default 'auto'
  showButtonPanel?: { today?: boolean; clear?: boolean; close?: boolean }; // default all true
  closeOnSelect?: boolean;             // default true when withTime=false
  clearable?: boolean;                 // default true

  // callbacks (named to match jQuery UI Datepicker where a direct equivalent exists)
  onChange?: (value: DateTimeResult) => void;   // ~ onSelect
  onOpen?: () => void;                          // ~ beforeShow / onShow
  onClose?: () => void;                         // ~ onClose
  onChangeMonthYear?: (year: number, month: number) => void;

  adapter?: CalendarAdapter;           // advanced DI override, rarely needed
  dateMath?: DateMath;                 // advanced DI override (swap dayjs ↔ moment), rarely needed
}

export interface DateTimeResult {
  ad: Date;
  bs: { year: number; month: number; day: number };
  time?: { hour: number; minute: number; second: number };
  formatted: string;
}
```

### 6.2 Controller state

```
state = {
  mode, isOpen, viewYear, viewMonth,
  selected: DateValue | null,
  time: { hour, minute, second } | null,
  activeTab: 'date' | 'time',
}
```

Actions: `open()`, `close()`, `toggleMode()`, `navigateMonth(delta)`, `navigateYear(delta)`, `selectDay(dv)`, `setTime(h,m,s)`, `confirm()`, `clear()` — `confirm()` is the single commit point that builds `DateTimeResult`, writes `altField` (if configured), and fires `onChange`.

---

## 7. Component 2 — `NepaliDateRangePicker`

### 7.1 Config

```ts
export interface DateRangePickerOptions {
  mode?: 'BS' | 'AD';
  allowModeToggle?: boolean;
  locale?: RangePickerLocale;          // §7.2 — daterangepicker.js-shaped
  weekStartsOn?: 0|1|2|3|4|5|6;        // alias: locale.firstDay

  value?: { start: Date; end: Date } | null;
  defaultValue?: { start: Date; end: Date } | null;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  maxRangeSpanDays?: number | null;

  presets?: PresetDefinition[] | 'default' | false;
  defaultPresetId?: string | null;
  fiscalStartMonth?: number;           // default 4 (Shrawan)
  fiscalYearLookback?: number;         // default 5

  // gold-standard daterangepicker.js behaviors
  numberOfMonths?: 1 | 2;              // default 2 — dual-pane, side-by-side calendars
  linkedCalendars?: boolean;           // default true — right pane always = left pane + 1 month
  autoApply?: boolean;                 // default false — if true, second click commits immediately, no Apply button
  alwaysShowCalendars?: boolean;       // default true — keep calendars visible even before a preset/custom pick
  autoUpdateInput?: boolean;           // default true — write formatted range into the bound input immediately

  // presentation (shared naming with §6.1)
  appendTo?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';

  displayFormat?: string;
  valueFormat?: 'iso' | 'timestamp' | 'date-object';
  altField?: { start: string | HTMLElement; end: string | HTMLElement };
  altFormat?: string;

  onApply?: (range: DateRangeResult) => void;
  onChange?: (partial: { start?: Date; end?: Date }) => void;
  onOpen?: () => void;
  onClose?: () => void;

  adapter?: CalendarAdapter;
  dateMath?: DateMath;
}
```

### 7.2 Locale object (mirrors `daterangepicker.js` exactly — the most recognized shape for this component)

```ts
export interface RangePickerLocale {
  format?: string;
  separator?: string;          // default ' – '
  applyLabel?: string;         // default 'Apply'
  cancelLabel?: string;        // default 'Cancel'
  customRangeLabel?: string;   // default 'Custom Range'
  weekLabel?: string;
  daysOfWeek?: string[];       // locale-driven short weekday labels
  monthNames?: string[];
  firstDay?: number;           // alias of weekStartsOn, kept for migrators
}
```

### 7.3 Presets

```ts
export interface PresetDefinition {
  id: string; label: string; kind: 'range' | 'submenu';
  resolve?: (ctx: PresetContext) => { start: Date; end: Date };
  items?: PresetDefinition[];
}
export interface PresetContext { today: Date; fiscalStartMonth: number; adapter: CalendarAdapter; dateMath: DateMath; }
```

`presets: 'default'` expands to the prototype's exact list (today, last 7/15/30/45/60, fiscal-year-to-date, fiscal-year submenu, custom) — nothing regresses for the common case. A plain `ranges` object shorthand (matching `daterangepicker.js`'s `ranges: { 'Today': [start,end], ... }`) is accepted as sugar that compiles to `PresetDefinition[]` under the hood, for anyone copy-pasting from existing `daterangepicker.js` configs.

Controller reuses the prototype's `pendingStart`/`hoverDate`/`range`/`activePresetId`/`openSubmenuId` state machine verbatim; `apply()` remains the single commit point (or fires immediately from `selectDay` when `autoApply: true`).

---

## 8. Positioning & portaling (new — was entirely missing in v1)

The single most common real-world bug in DIY date pickers: the popup gets clipped by a `overflow: hidden` modal/scroll container, or is covered by other UI due to z-index conflicts. Three additions close this:

1. **`appendTo`** (core canonical option; the jQuery package additionally accepts `container` as an alias, matching the reference plugin's own `{container: "#modal-id"}` convention exactly) — mounts the popup into `document.body` or a specified element, positioned `fixed`, coordinates computed from the trigger's `getBoundingClientRect()` on open and on scroll/resize while open.
2. **Collision-flip** — on open, measure remaining viewport space below the trigger; if insufficient and more room exists above, flip (`drops: 'auto'` default). Horizontally, `opens: 'auto'` picks left/right/center based on remaining width. No positioning library needed — this is `getBoundingClientRect()` arithmetic, keeping the zero-dependency promise intact for this concern.
3. **z-index token** — `--ndp-z-index` CSS variable (default `1000`), documented, so it's a one-line override rather than a fork when it conflicts with a host app's own modal stack.

---

## 9. Accessibility & keyboard interaction (new — was entirely missing in v1)

| Key | Action |
|---|---|
| `←` / `→` | move focus ±1 day |
| `↑` / `↓` | move focus ±7 days |
| `Page Up` / `Page Down` | previous/next month |
| `Shift + Page Up/Down` | previous/next year |
| `Home` / `End` | first/last day of the focused week (respects `weekStartsOn`) |
| `Enter` / `Space` | select focused day |
| `Esc` | close popup, return focus to trigger |
| `Tab` | cycles trigger → grid → button panel, focus-trapped while open |

ARIA: trigger gets `role="combobox" aria-haspopup="dialog" aria-expanded`; popup gets `role="dialog"`; month grid gets `role="grid"` with `role="row"`/`role="columnheader"` weekdays and `role="gridcell" aria-selected aria-disabled` day cells; month/year label is an `aria-live="polite"` region so screen readers announce navigation. (This intentionally updates jQuery UI Datepicker's older `role="application"` pattern, which is now considered an anti-pattern — `dialog` + `grid` is the current correct mapping for this widget shape.) Focus moves to the selected/today cell on open and returns to the trigger on close — implemented once in `core/src/a11y`, shared by every render target so jQuery/Vue/React consumers get it for free.

---

## 10. Instance / method API (new)

Every `mount*()` call (vanilla) and every framework wrapper returns/exposes the same shape — this is what makes the jQuery package's method-call style (§3, jQuery UI convention) possible without duplicating logic:

```ts
export interface PickerInstance<TValue, TOptions> {
  getState(): unknown;
  getValue(): TValue | null;
  setValue(value: TValue | null): void;
  show(): void;
  hide(): void;
  update(patch: Partial<TOptions>): void;   // patch config without remounting
  destroy(): void;                          // detach listeners, remove DOM/portal — SPA-safe
  onChange(cb: (value: TValue) => void): () => void; // returns an unsubscribe fn
}
```

- **Vanilla:** `const inst = NepaliPicker.mountDateRangePicker(el, options); inst.destroy();`
- **jQuery package:** `$(el).nepaliDateRangePicker(options)` to init; `$(el).nepaliDateRangePicker('getValue')`, `$(el).nepaliDateRangePicker('destroy')`, `$(el).nepaliDateRangePicker('option', 'minDate', d)` for method calls — one `$.data(el, key, instance)` per element, zero duplicated logic, matches `$.datepicker`'s own method-call idiom.
- **Vue/React:** call `instance.destroy()` in `onUnmounted` / the `useEffect` cleanup function respectively — closes the SPA memory-leak gap that v1 didn't address.

Static, global-default setters mirror `$.datepicker.setDefaults()`:
```ts
NepaliPicker.setDefaults(options: Partial<DateTimePickerOptions>): void;
NepaliPicker.regional = { ne: {...}, en: {...} }; // jQuery UI's regional[] pattern
```

---

## 11. Formatting tokens

dayjs/moment-compatible tokens (the de facto standard today — more portable than jQuery UI's own `dd`/`mm`/`yy` dialect):

| Token | Meaning | Example (BS) |
|---|---|---|
| `YYYY` | 4-digit year | २०८२ |
| `MM` | 2-digit month | ०४ |
| `MMMM` | full month name (locale) | श्रावण |
| `DD` | 2-digit day | ०५ |
| `dddd` | full weekday name (locale) | आइतबार |
| `HH`/`hh` | 24h/12h hour | 14 / 02 |
| `mm` / `ss` | minute / second | 30 / 00 |
| `A` | AM/PM | PM |

Default: `YYYY-MM-DD` (date), `YYYY-MM-DD HH:mm` (datetime). Digits render per `locale` (Devanagari for `ne`) regardless of token case.

---

## 12. Theming

`@nepali-picker/style`, prefix `--ndp-*` (carried over from the prototype's variable set, renamed for public stability):

```css
:root {
  --ndp-color-primary: #3aa856;
  --ndp-color-primary-hover: #339349;
  --ndp-color-primary-bg: #eaf7ec;
  --ndp-color-text: #33383d;
  --ndp-color-text-muted: #8a9099;
  --ndp-color-border: #e3e6ea;
  --ndp-radius: 6px;
  --ndp-shadow: 0 8px 24px rgba(20,30,40,0.14);
  --ndp-z-index: 1000;
  --ndp-font: -apple-system, 'Segoe UI', Roboto, 'Noto Sans Devanagari', Arial, sans-serif;
}
```

No CSS-in-JS, no build step required to theme. RTL is explicitly N/A (Devanagari is LTR).

---

## 13. Framework & ecosystem integration

### 13.1 Vanilla / plain HTML — zero JS

```html
<link rel="stylesheet" href="https://unpkg.com/@nepali-picker/style/dist/theme.css">
<script src="https://unpkg.com/@nepali-picker/core/dist/umd/index.js"></script>

<input type="text" data-nepali-datepicker data-with-time="true" readonly>
<input type="text" data-nepali-daterange data-fiscal-start-month="4" readonly>
```

### 13.2 jQuery (`@nepali-picker/jquery`) — gold-standard drop-in for existing admin templates

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://unpkg.com/@nepali-picker/jquery/dist/umd/index.js"></script>

<input id="range" name="range" type="text">
<script>
  $.fn.nepaliDateRangePicker.setDefaults($.fn.nepaliDateRangePicker.regional['ne']);
  $('#range').nepaliDateRangePicker({ fiscalStartMonth: 4, container: '#modal-id' })
    .on('apply.nepaliDateRangePicker', function (e, range) { console.log(range); });
</script>
```

### 13.3 Vue 3 (`@nepali-picker/vue`)

```vue
<script setup lang="ts">
import { NepaliDateRangePicker } from '@nepali-picker/vue'
import '@nepali-picker/style/dist/theme.css'
import { ref } from 'vue'
const range = ref<{ start: Date; end: Date } | null>(null)
</script>
<template>
  <NepaliDateRangePicker v-model="range" :fiscal-start-month="4" />
</template>
```

Composable for headless use: `useNepaliDateRangePicker(options)` — wraps the core controller, calls `instance.destroy()` in `onUnmounted` automatically.

### 13.4 React (`@nepali-picker/react`)

```tsx
import { NepaliDateRangePicker } from '@nepali-picker/react'
const [range, setRange] = useState<{start:Date;end:Date}|null>(null);
<NepaliDateRangePicker value={range} onApply={setRange} fiscalStartMonth={4} />
```

Controlled (`value`+`onApply`) and uncontrolled (`defaultValue`) both supported; `useNepaliDateRangePicker(options)` hook for headless use, `destroy()` called in the `useEffect` cleanup.

### 13.5 Any other framework (Svelte, Angular, Solid, …)

Because `core` exposes a plain `PickerInstance` (§10) with `onChange`/`show`/`hide`/`destroy`, a wrapper is: subscribe on mount, call action methods from template bindings, call `destroy()` on unmount. No core changes required.

---

## 14. Public API surface (`@nepali-picker/core/index.ts`)

```ts
export { mountDateTimePicker, mountDateRangePicker, setDefaults, regional } from './autoinit';
export { createDateTimeController, createDateRangeController } from './application';
export type { CalendarAdapter, DateMath, PickerInstance } from './types';
export { BsAdCalendarAdapter } from './adapters/bs-ad-calendar-adapter';
export { nepaliFunctions } from './functions';
export { formatDateValue, parseDateValue } from './format';
export type {
  DateTimePickerOptions, DateTimeResult,
  DateRangePickerOptions, DateRangeResult,
  PresetDefinition, PresetContext, RangePickerLocale,
} from './types';
```

Named exports only (tree-shaking), `sideEffects: false`, strict TypeScript throughout.

---

## 15. Build, packaging, bundle targets

| Target | Format | Consumers |
|---|---|---|
| `dist/esm/` | ES modules, unbundled | bundler apps — tree-shakeable |
| `dist/cjs/` | CommonJS, single file | Node/SSR |
| `dist/umd/index.js` | UMD, single file, `window.NepaliPicker` global | `<script>` tag / CDN |

Build tool: `tsup`. Bundle-size budget: **core (incl. dayjs + vendored BS table) < 20 KB min+gzip**, enforced with `size-limit` in CI. `jquery`/`vue`/`react` packages each target **< 5 KB** on top of `core` (thin shells only).

---

## 16. Testing strategy

| Layer | What's tested | How |
|---|---|---|
| Domain | `DateValue`/`DateRange` invariants | pure unit tests |
| Adapter | `bsToAd(adToBs(x)) === x` across the full supported year range; leap/short-month edges | property-style tests over `BS_YEAR_MIN..BS_YEAR_MAX` |
| `functions` compat layer | Each method's output matches hand-verified BS calendar data for a sample of known dates | fixture-based parity tests |
| Application | State transitions (range two-click, presets, fiscal-year math, `autoApply`) | unit tests, no DOM |
| Position | Flip logic under constrained viewport sizes | jsdom + mocked `getBoundingClientRect` |
| A11y | Keyboard map, ARIA roles/attributes present | `@testing-library` + `axe-core` |
| Render (vanilla) | DOM output for a state snapshot | jsdom snapshot tests |
| jQuery wrapper | Method-call API (`'getValue'`, `'destroy'`, `'option'`), event namespacing | jsdom + jQuery |
| Vue/React wrappers | `v-model`/controlled-prop wiring, `destroy()` on unmount (no leaked listeners) | `@testing-library/vue`, `@testing-library/react` |
| Integration | Each `examples/*` app builds, opens, selects, applies | Playwright smoke test per example |

---

## 17. CI/CD pipeline

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint          # eslint + tsc --noEmit
      - run: npm run test          # vitest, all packages, incl. axe-core a11y checks
      - run: npm run build         # tsup, all packages
      - run: npm run size-check    # size-limit against §15 budget
      - run: npx changeset publish
        if: github.ref == 'refs/heads/main'
        env: { NODE_AUTH_TOKEN: "${{ secrets.NPM_TOKEN }}" }
```

Release flow: Changesets — PRs carry a changeset, a bot opens a "Version Packages" PR, merging triggers publish. No manual `npm publish` ever.

---

## 18. Documentation to ship

1. **Quick start** per ecosystem — vanilla `<script>`, jQuery, Vue, React — each under 10 lines.
2. **Full options reference** — §6.1/§7.1 tables, one docs page per component.
3. **Migration guide** — "coming from `nepalidatepicker.sajanmaharjan.com.np`" (map `NepaliFunctions.*` calls to §4.2) and "coming from `daterangepicker.js`" (map `ranges`/`locale`/`opens`/`drops` 1:1, since they're already the same shape here).
4. **Theming guide** — §12 variable table, live demo.
5. **Recipes** — modal usage (`appendTo`/`container`), Laravel form integration via `altField`/`altFormat` (visible BS input + hidden ISO-AD input posted to the backend), disabling weekends/holidays, custom presets.
6. **Accessibility statement** — §9, keyboard map, ARIA mapping, axe-core CI status badge.
7. **Changelog** — auto-generated from Changesets.

---

## 19. Delta summary vs. the attached prototype

| Prototype | Final spec |
|---|---|
| Single HTML file, IIFE | Monorepo: `core` + `jquery` + `vue` + `react` + `style` |
| `window.NepaliFunctions` via CDN `<script>` | Vendored BS table + own adapter; optional dayjs/moment for AD-side math only |
| `NDRP_CONFIG` module-level object | Typed per-instance options; multiple independently-configured pickers trivially supported |
| Range picker only | Range picker (generalized) **+** new DateTime picker, same Domain/Adapter/Application core |
| Boolean preset flags | `PresetDefinition[]` (or `ranges` shorthand) — data-driven, extensible |
| No time-of-day concept | `TimeValue` + time controller slice + spinner/dropdown UI |
| No jQuery path | Full `$.fn` plugin package with method-call API, `regional[]` locales, namespaced events |
| No positioning/portal handling | `appendTo`/`container` + auto-flip collision logic (§8) |
| No accessibility spec | Full keyboard map + ARIA roles (§9) |
| No instance/destroy API | `PickerInstance` (§10) — `show/hide/update/destroy/onChange` everywhere, SPA-safe |
| Inline `<style>` in the HTML file | Extracted `@nepali-picker/style`, `--ndp-*` contract |

No behavior from the prototype is discarded — the preset rail, dual-input layout, BS/AD toggle, and rebuild-on-change render strategy are generalized, not replaced.
