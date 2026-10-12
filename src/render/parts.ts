// Building blocks shared by the three panels: DOM helpers, the live region and
// focus keeping across re-renders, the view-aware header, the day grid (ARIA
// grid with rows, labelled cells, keyboard navigation) and the month / year
// grids. Panels are rebuilt from scratch on every state change, so anything
// that must survive a rebuild (focus, the last announcement) is kept per root.
import { clampViewMonth, crossCalendarMonthSpan, firstOfViewMonth, viewYearBounds, viewYearMonthOf } from '../application/calendar-view.js';
import type { MonthSpan, ViewYearMonth } from '../application/calendar-view.js';
import { digits, monthNames, weekdayColumns } from '../application/ui.js';
import type { DayInfo, UiConfig } from '../application/ui.js';
import { nativeDateMath } from '../date-math/native-date-math.js';
import { formatDateValue } from '../format/index.js';
import { mapGridKey } from '../a11y/index.js';
import type { GridKeyAction } from '../a11y/index.js';
import type { CalendarAdapter, CalendarMode, DateRange, DateValue } from '../types.js';
import { lastAnnounced, lastMotion } from './panel-state.js';
import { paintModeToggle } from './mode-toggle.js';

export { paintModeToggle } from './mode-toggle.js';
export { resetAnnouncements } from './panel-state.js';

export type CalendarView = 'day' | 'month' | 'year';

// ---- DOM helpers ------------------------------------------------------------

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

export function setText<T extends HTMLElement>(node: T, text: string): T {
  node.textContent = text;
  return node;
}

/** Text only screen readers get. */
export function srOnly(text: string): HTMLElement {
  return setText(el('span', 'ndp-sr-only'), text);
}

let idCounter = 0;
export function uid(prefix = 'ndp'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export { pad2 } from '../date-math/native-date-math.js';

export function isSameDay(a: DateValue | null | undefined, b: DateValue | null | undefined): boolean {
  return !!a && !!b && a.ad.getTime() === b.ad.getTime();
}

// ---- root lifecycle: live region + focus kept across rebuilds ---------------


/**
 * Empty a panel root for a rebuild, keeping its live region (a live region
 * must already be in the page when its text changes, or nothing is read).
 * Returns the focus key to restore afterwards.
 */
export function resetRoot(root: HTMLElement): string | null {
  const focusKey = captureFocus(root);
  let live = root.querySelector<HTMLElement>(':scope > .ndp-live');
  Array.from(root.childNodes).forEach((node) => { if (node !== live) node.remove(); });
  if (!live) {
    live = el('div', 'ndp-live ndp-sr-only', { 'aria-live': 'polite', 'aria-atomic': 'true' });
    root.appendChild(live);
  }
  return focusKey;
}

/**
 * Announce what changed since the last render. `parts` maps a topic (month,
 * selection) to its current text; only topics whose text changed are read, so
 * re-renders for unrelated reasons stay silent.
 */
export function announce(root: HTMLElement, parts: Record<string, string>): void {
  const previous = lastAnnounced.get(root);
  lastAnnounced.set(root, parts);
  if (!previous) return; // the first render after opening only sets the baseline
  const changed = Object.keys(parts).filter((key) => parts[key] && parts[key] !== previous[key]).map((key) => parts[key]);
  const live = root.querySelector<HTMLElement>(':scope > .ndp-live');
  if (live && changed.length) live.textContent = changed.join('. ');
}

// ---- motion: what changed since the last render, as a CSS class ----------
// Paging slides the grid in from the side it came from, switching BS/AD or
// the view cross-fades, and a newly picked day pops — so every action has a
// visible response. Reduced-motion users get none of it (theme.css).

export interface MotionState {
  /** Months since year 0 of the first shown month, in the active calendar. */
  index: number;
  mode: string;
  view: string;
  /** dayKey of the selected day (or range ends), '' for none. */
  selection: string;
}

/** The animation class for the calendar body, and whether the selection changed. */
export function motionFor(root: HTMLElement, next: MotionState): { body: string; selectionChanged: boolean } {
  const previous = lastMotion.get(root);
  lastMotion.set(root, next);
  if (!previous) return { body: '', selectionChanged: false };
  let body = '';
  if (previous.mode !== next.mode || previous.view !== next.view) body = 'ndp-anim-fade';
  else if (next.index > previous.index) body = 'ndp-anim-next';
  else if (next.index < previous.index) body = 'ndp-anim-prev';
  return { body, selectionChanged: !!next.selection && previous.selection !== next.selection };
}

/** Mark freshly selected day cells so they pop once. */
export function popSelection(container: HTMLElement, keys: string[]): void {
  keys.forEach((key) => container.querySelector(`[data-ndp-day="${key}"]`)?.classList.add('is-just-selected'));
}

// Focus is remembered by a stable key: a day cell by its date, anything else
// by its data-ndp-field tag. After the rebuild the same element gets focus.
const pendingFocus = new WeakMap<HTMLElement, string>();

function captureFocus(root: HTMLElement): string | null {
  const pending = pendingFocus.get(root);
  if (pending) return pending;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !root.contains(active)) return null;
  const day = active.getAttribute('data-ndp-day');
  if (day) return `day:${day}`;
  const field = active.getAttribute('data-ndp-field');
  return field ? `field:${field}` : null;
}

/** Ask the next rebuild to focus a specific day (keyboard paging). */
export function focusDayAfterRender(root: HTMLElement, key: string): void {
  pendingFocus.set(root, `day:${key}`);
}

// True while restoreFocus moves focus, so focus listeners can tell a rebuild
// apart from the user moving.
let restoring = false;

function isKeyboardFocus(node: HTMLElement): boolean {
  if (restoring) return false;
  try {
    return node.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function restoreFocus(root: HTMLElement, key: string | null): void {
  pendingFocus.delete(root);
  if (!key) return;
  let target: HTMLElement | null = null;
  if (key.startsWith('day:')) {
    target = root.querySelector<HTMLElement>(`[data-ndp-day="${key.slice(4)}"]`) ?? root.querySelector<HTMLElement>('.ndp-cell[data-ndp-entry]');
  } else {
    target = root.querySelector<HTMLElement>(`[data-ndp-field="${key.slice(6)}"]`);
    // The control is gone (e.g. a header arrow hidden in the new view): keep
    // focus inside the popup on its natural entry point.
    target ??= root.querySelector<HTMLElement>('[data-ndp-entry]');
  }
  if (!target) return;
  restoring = true;
  try {
    // Never scroll the page: the popup may not be positioned yet on the
    // render that opens it.
    target.focus({ preventScroll: true });
  } finally {
    restoring = false;
  }
  if (target instanceof HTMLInputElement && target.type === 'text') target.select();
}

// ---- names ------------------------------------------------------------------

export function otherMode(mode: CalendarMode): CalendarMode {
  return mode === 'AD' ? 'BS' : 'AD';
}

function monthSpanText(span: MonthSpan, calendar: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, primary: CalendarMode, withYear = true): string {
  const names = monthNames(calendar, adapter, ui, primary);
  const startName = names[span.start.month - 1];
  const endName = names[span.end.month - 1];
  const months = startName === endName ? startName : `${startName}/${endName}`;
  if (!withYear) return months;
  const yearOf = (y: number) => digits(y, calendar, adapter, ui);
  const years = span.start.year === span.end.year ? yearOf(span.start.year) : `${yearOf(span.start.year)}/${yearOf(span.end.year)}`;
  return `${months} ${years}`;
}

// BS year shown as the hint for an AD year: taken from the year's first month
// the conversion table covers (1 January can fall before the table's start).
export function bsYearOfAdYear(adapter: CalendarAdapter, year: number): number {
  const first = clampViewMonth('AD', adapter, year, 1);
  return adapter.adToBs(firstOfViewMonth('AD', adapter, first.year, first.month)).year;
}

/** The secondary-calendar year shown under a primary year. */
export function otherYearLabel(mode: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, year: number): string {
  if (mode === 'AD') return `${digits(bsYearOfAdYear(adapter, year), 'BS', adapter, ui)} BS`;
  return `${digits(adapter.bsToAd(year, 1, 1).getFullYear(), 'AD', adapter, ui)} AD`;
}

/** "Baisakh 2081" / "Apr 2024" — the viewed month in the primary calendar. */
export function monthTitle(mode: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, year: number, month: number): string {
  return `${monthNames(mode, adapter, ui, mode)[month - 1]} ${digits(year, mode, adapter, ui)}`;
}

/** The secondary line under a month title ("Apr/May 2024"). */
export function monthSubtitle(mode: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, year: number, month: number): string {
  const span = crossCalendarMonthSpan(mode, adapter, nativeDateMath, year, month);
  return monthSpanText(span, otherMode(mode), adapter, ui, mode);
}

/** A day's full name for screen readers, in the UI language. */
export function dayLabel(value: DateValue, mode: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, withSecondary: boolean, language: 'ne' | 'en'): string {
  const fmt = (calendar: CalendarMode) => formatDateValue(value.ad, adapter, { mode: calendar, format: 'dddd, DD MMMM YYYY', locale: language });
  const primary = fmt(mode);
  if (!withSecondary) return primary;
  const secondary = formatDateValue(value.ad, adapter, { mode: otherMode(mode), format: 'DD MMMM YYYY', locale: language });
  return `${primary} (${secondary})`;
}

/** UI-language locale for spoken labels: Nepali only when the UI is Nepali. */
export function speechLanguage(ui: UiConfig): 'ne' | 'en' {
  return ui.language === 'ne' ? 'ne' : 'en';
}

// ---- buttons ----------------------------------------------------------------

export function navButton(glyph: string, label: string, field: string, onClick: (() => void) | null): HTMLElement {
  const button = el('button', 'ndp-nav', { type: 'button', 'aria-label': label || glyph, 'data-ndp-field': field });
  button.appendChild(setText(el('span', '', { 'aria-hidden': 'true' }), glyph));
  if (!onClick) {
    button.classList.add('is-hidden');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('aria-hidden', 'true');
  } else {
    button.addEventListener('click', onClick);
  }
  return button;
}

// The BS/AD switch inside the range panel.
export function renderModeSwitch(mode: CalendarMode, ui: UiConfig, toggle: () => void): HTMLElement {
  const btn = el('button', 'ndp-mode-toggle', { type: 'button', 'data-ndp-field': 'mode-toggle' });
  paintModeToggle(btn, mode, ui);
  btn.addEventListener('click', toggle);
  return btn;
}

// ---- header -----------------------------------------------------------------

// The subset of controller behaviour the shared header + month/year grids use.
// The datetime, range and month controllers satisfy this structurally. `mode`
// is absent on the month picker (always BS), so it's read as `mode ?? 'BS'`.
export interface ViewControls {
  getState(): { view: CalendarView; viewYear: number; viewMonth: number; mode?: CalendarMode; showSecondaryCalendar?: boolean };
  navigateMonth(delta: number): void;
  navigateYear(delta: number): void;
  setView(view: CalendarView): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
  getAdapter(): CalendarAdapter;
  getUi(): UiConfig;
  isMonthDisabled?(year: number, month: number): boolean;
}

export interface HeaderOptions {
  /** Which month the header shows (defaults to the view month). */
  month?: ViewYearMonth;
  /** Paging handlers; null hides that arrow. Defaults follow the view. */
  prevMonth?: (() => void) | null;
  nextMonth?: (() => void) | null;
  prevYear?: (() => void) | null;
  nextYear?: (() => void) | null;
  /** The label switches views (default true). */
  interactive?: boolean;
  /** id for the label, so a grid can be labelled by it. */
  labelId?: string;
  /** Field-key suffix keeping focus apart between two headers. */
  suffix?: string;
}

// View-aware header: the label drills down day → month → year, and the arrows
// step month/year depending on which view is showing. The active `mode`
// decides which calendar is the big/primary label (what's navigated) and which
// is the small/secondary hint — the two swap when mode is 'AD'.
export function renderHeader(controller: ViewControls, options: HeaderOptions = {}): HTMLElement {
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const s = ui.strings;
  const state = controller.getState();
  const { view, mode = 'BS', showSecondaryCalendar = true } = state;
  const shown = options.month ?? { year: state.viewYear, month: state.viewMonth };
  const sfx = options.suffix ?? '';
  const header = el('div', 'ndp-cal-header');

  const pick = (given: (() => void) | null | undefined, fallback: (() => void) | null): (() => void) | null => (given === undefined ? fallback : given);
  let outerPrev: HTMLElement;
  let innerPrev: HTMLElement;
  let innerNext: HTMLElement;
  let outerNext: HTMLElement;
  if (view === 'day') {
    outerPrev = navButton('«', s.previousYear, `prev-year${sfx}`, pick(options.prevYear, () => controller.navigateYear(-1)));
    innerPrev = navButton('‹', s.previousMonth, `prev-month${sfx}`, pick(options.prevMonth, () => controller.navigateMonth(-1)));
    innerNext = navButton('›', s.nextMonth, `next-month${sfx}`, pick(options.nextMonth, () => controller.navigateMonth(1)));
    outerNext = navButton('»', s.nextYear, `next-year${sfx}`, pick(options.nextYear, () => controller.navigateYear(1)));
  } else if (view === 'month') {
    outerPrev = navButton('«', '', `outer-prev${sfx}`, null);
    innerPrev = navButton('‹', s.previousYear, `prev-year${sfx}`, () => controller.navigateYear(-1));
    innerNext = navButton('›', s.nextYear, `next-year${sfx}`, () => controller.navigateYear(1));
    outerNext = navButton('»', '', `outer-next${sfx}`, null);
  } else {
    // The year grid scrolls through every year, so no paging arrows.
    outerPrev = navButton('«', '', `outer-prev${sfx}`, null);
    innerPrev = navButton('‹', '', `inner-prev${sfx}`, null);
    innerNext = navButton('›', '', `inner-next${sfx}`, null);
    outerNext = navButton('»', '', `outer-next${sfx}`, null);
  }

  const interactive = options.interactive !== false;
  const label = interactive
    ? el('button', 'ndp-cal-label', { type: 'button', 'data-ndp-field': `view-label${sfx}` })
    : el('div', 'ndp-cal-label ndp-cal-label--static');
  if (options.labelId) label.id = options.labelId;
  let primary: string;
  let secondary: string;
  let hint: string;
  if (view === 'day') {
    primary = monthTitle(mode, adapter, ui, shown.year, shown.month);
    secondary = monthSubtitle(mode, adapter, ui, shown.year, shown.month);
    hint = s.chooseMonth;
    if (interactive) label.addEventListener('click', () => controller.setView('month'));
  } else {
    primary = digits(shown.year, mode, adapter, ui);
    secondary = otherYearLabel(mode, adapter, ui, shown.year);
    hint = view === 'month' ? s.chooseYear : s.backToDays;
    if (interactive) label.addEventListener('click', () => controller.setView(view === 'month' ? 'year' : 'day'));
  }
  const primaryEl = el('div', 'ndp-cal-label-primary');
  primaryEl.append(primary);
  if (interactive) primaryEl.appendChild(setText(el('span', 'ndp-cal-caret', { 'aria-hidden': 'true' }), '▾'));
  label.appendChild(primaryEl);
  if (showSecondaryCalendar) label.appendChild(setText(el('div', 'ndp-cal-label-secondary'), secondary));
  label.appendChild(srOnly(`, ${mode === 'BS' ? s.calendarBsLong : s.calendarAdLong}${interactive ? `, ${hint}` : ''}`));

  header.append(outerPrev, innerPrev, label, innerNext, outerNext);
  return header;
}

// ---- day grid ---------------------------------------------------------------

export interface DayGridHost {
  getState(): { viewYear: number; viewMonth: number; mode: CalendarMode; showSecondaryCalendar: boolean };
  getAdapter(): CalendarAdapter;
  getUi(): UiConfig;
  dayInfo(value: DateValue): DayInfo;
  navigateMonth(delta: number): void;
}

export interface CellState {
  selected?: boolean;
  rangeStart?: boolean;
  rangeEnd?: boolean;
  inRange?: boolean;
  disabled: boolean;
  today: boolean;
}

export interface DayGridOptions {
  host: DayGridHost;
  cells: Array<DateValue | null>;
  labelId?: string;
  multiselectable?: boolean;
  cellState(value: DateValue): CellState;
  onSelect(value: DateValue): void;
  /** Hover / keyboard-focus preview (range picking). */
  onPreview?(value: DateValue): void;
}

/** A day's DOM key, also its data-ndp-day value. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** One month's day grid: a header row of weekdays and six rows of days. */
export function renderDayGrid(options: DayGridOptions): HTMLElement {
  const { host } = options;
  const adapter = host.getAdapter();
  const ui = host.getUi();
  const s = ui.strings;
  const { mode, showSecondaryCalendar } = host.getState();
  const language = speechLanguage(ui);
  const columns = weekdayColumns(adapter, ui, mode);

  const grid = el('div', 'ndp-grid', { role: 'grid' });
  if (options.labelId) grid.setAttribute('aria-labelledby', options.labelId);
  if (options.multiselectable) grid.setAttribute('aria-multiselectable', 'true');

  const head = el('div', 'ndp-weekdays', { role: 'row' });
  columns.forEach((column) => {
    const cell = setText(el('div', `ndp-weekday${ui.weekendDays.includes(column.weekday) ? ' is-weekend' : ''}`, { role: 'columnheader', 'aria-label': column.full, title: column.full }), column.label);
    head.appendChild(cell);
  });
  grid.appendChild(head);

  for (let row = 0; row < options.cells.length / 7; row += 1) {
    const week = el('div', 'ndp-week', { role: 'row' });
    options.cells.slice(row * 7, row * 7 + 7).forEach((cell) => {
      if (!cell) {
        week.appendChild(el('div', 'ndp-cell ndp-cell--empty', { role: 'gridcell' }));
        return;
      }
      week.appendChild(renderDayCell(cell, options, ui, mode, adapter, showSecondaryCalendar, language, s));
    });
    grid.appendChild(week);
  }
  return grid;
}

function renderDayCell(
  cell: DateValue,
  options: DayGridOptions,
  ui: UiConfig,
  mode: CalendarMode,
  adapter: CalendarAdapter,
  showSecondary: boolean,
  language: 'ne' | 'en',
  s: UiConfig['strings'],
): HTMLElement {
  const info = options.host.dayInfo(cell);
  const st = options.cellState(cell);
  const classes = ['ndp-cell'];
  if (st.today) classes.push('is-today');
  if (st.inRange) classes.push('is-in-range');
  if (st.rangeStart || st.selected) classes.push('is-range-start');
  if (st.rangeEnd) classes.push('is-range-end');
  if (st.selected) classes.push('is-selected');
  if (st.disabled) classes.push('is-disabled');
  if (info.weekend) classes.push('is-weekend');
  if (info.holiday) classes.push('is-holiday');
  if (info.events.length) classes.push('has-events');
  if (info.className) classes.push(info.className);
  const selected = !!(st.selected || st.rangeStart || st.rangeEnd || st.inRange);
  const btn = el('button', classes.join(' '), { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false' });
  btn.setAttribute('data-ndp-day', dayKey(cell.ad));
  btn.tabIndex = -1;
  if (st.today) btn.setAttribute('aria-current', 'date');
  if (st.disabled) btn.setAttribute('aria-disabled', 'true');
  if (info.title) btn.title = info.title;

  const extras: string[] = [];
  if (st.rangeStart && !st.rangeEnd) extras.push(s.rangeStart);
  if (st.rangeEnd && !st.rangeStart) extras.push(s.rangeEnd);
  if (st.inRange && !st.rangeStart && !st.rangeEnd) extras.push(s.inRange);
  if (info.holiday) extras.push(s.holiday);
  info.events.forEach((event) => extras.push(event.label));
  if (info.title && !info.events.length) extras.push(info.title);
  if (st.disabled) extras.push(s.unavailable);
  btn.setAttribute('aria-label', [dayLabel(cell, mode, adapter, ui, showSecondary, language), ...extras].join(', '));

  const primaryDay = mode === 'AD' ? digits(cell.ad.getDate(), 'AD', adapter, ui) : digits(cell.bs.day, 'BS', adapter, ui);
  btn.appendChild(setText(el('span', 'ndp-cell-primary', { 'aria-hidden': 'true' }), primaryDay));
  if (showSecondary) {
    const secondaryDay = mode === 'AD' ? digits(cell.bs.day, 'BS', adapter, ui) : digits(cell.ad.getDate(), 'AD', adapter, ui);
    btn.appendChild(setText(el('span', 'ndp-cell-secondary', { 'aria-hidden': 'true' }), secondaryDay));
  }
  if (info.badge) btn.appendChild(setText(el('span', 'ndp-cell-badge', { 'aria-hidden': 'true' }), info.badge));
  const dots = info.events.filter((event) => event.type !== 'holiday').slice(0, 3);
  if (dots.length) {
    const wrap = el('span', 'ndp-cell-dots', { 'aria-hidden': 'true' });
    dots.forEach((event) => {
      const dot = el('span', 'ndp-dot');
      if (event.color) dot.style.background = event.color;
      wrap.appendChild(dot);
    });
    btn.appendChild(wrap);
  }
  if (!st.disabled) {
    btn.addEventListener('click', () => options.onSelect(cell));
    if (options.onPreview) {
      const preview = options.onPreview;
      btn.addEventListener('mouseenter', () => preview(cell));
      // Keyboard focus previews too — but not focus a rebuild restores, or
      // hover and focus would re-render each other forever.
      btn.addEventListener('focus', () => { if (isKeyboardFocus(btn)) preview(cell); });
    }
  }
  return btn;
}

// ---- keyboard navigation in the day grid ------------------------------------
// Roving tabindex across every day grid in `container` (one or two months):
// one day cell is tabbable (data-ndp-entry, the target of Alt+↓ from the
// field); arrows / PageUp / PageDown / Home / End move between days, turning
// the page when they leave the visible months. Enter / Space press the
// focused day button.

function moveDay(from: Date, action: GridKeyAction, weekStartsOn: number): Date {
  const to = new Date(from);
  const column = (to.getDay() - weekStartsOn + 7) % 7;
  if (action === 'prev-day') to.setDate(to.getDate() - 1);
  if (action === 'next-day') to.setDate(to.getDate() + 1);
  if (action === 'prev-week') to.setDate(to.getDate() - 7);
  if (action === 'next-week') to.setDate(to.getDate() + 7);
  if (action === 'week-start') to.setDate(to.getDate() - column);
  if (action === 'week-end') to.setDate(to.getDate() + (6 - column));
  if (action === 'prev-month') return nativeDateMath.add(from, -1, 'month');
  if (action === 'next-month') return nativeDateMath.add(from, 1, 'month');
  if (action === 'prev-year') return nativeDateMath.add(from, -1, 'year');
  if (action === 'next-year') return nativeDateMath.add(from, 1, 'year');
  return to;
}

export function wireDayKeyboard(root: HTMLElement, container: HTMLElement, host: DayGridHost, preferred: Array<DateValue | null | undefined>): void {
  const cellFor = (key: string) => container.querySelector<HTMLElement>(`[data-ndp-day="${key}"]`);
  const entry = preferred.map((v) => (v ? cellFor(dayKey(v.ad)) : null)).find(Boolean)
    ?? container.querySelector<HTMLElement>('[data-ndp-day]:not(.is-disabled)')
    ?? container.querySelector<HTMLElement>('[data-ndp-day]');
  if (entry) {
    entry.tabIndex = 0;
    entry.setAttribute('data-ndp-entry', '');
  }
  container.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const action = mapGridKey(e);
    if (!action || action === 'select' || action === 'close') return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-ndp-day]');
    if (!cell) return;
    e.preventDefault();
    const [y, m, d] = cell.getAttribute('data-ndp-day')!.split('-').map(Number);
    const target = moveDay(new Date(y, m - 1, d), action, host.getUi().weekStartsOn);
    const key = dayKey(target);
    const inView = cellFor(key);
    if (inView) {
      container.querySelectorAll<HTMLElement>('[data-ndp-day]').forEach((c) => { c.tabIndex = -1; });
      inView.tabIndex = 0;
      inView.focus();
      return;
    }
    const state = host.getState();
    const view = viewYearMonthOf(state.mode, host.getAdapter(), target);
    const delta = (view.year * 12 + view.month) - (state.viewYear * 12 + state.viewMonth);
    focusDayAfterRender(root, key);
    // With two months, a day just past the right-hand month only needs one page.
    const shown = container.matches('.ndp-grid') ? 1 : container.querySelectorAll('.ndp-grid').length;
    host.navigateMonth(delta > 0 ? Math.max(1, delta - (shown - 1)) : delta);
  });
}

// ---- month & year grids -----------------------------------------------------

/** Arrow / Home / End movement between the buttons of a fixed-column grid. */
export function wireRovingGrid(grid: HTMLElement, columns: number): void {
  const cells = Array.from(grid.querySelectorAll<HTMLElement>('[role="gridcell"]'));
  const entry = cells.find((c) => c.hasAttribute('data-ndp-entry')) ?? cells.find((c) => c.getAttribute('aria-disabled') !== 'true') ?? cells[0];
  cells.forEach((c) => { c.tabIndex = c === entry ? 0 : -1; });
  if (entry && !entry.hasAttribute('data-ndp-entry')) entry.setAttribute('data-ndp-entry', '');
  grid.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const index = cells.indexOf(e.target as HTMLElement);
    if (index < 0) return;
    let next = index;
    if (e.key === 'ArrowLeft') next = index - 1;
    else if (e.key === 'ArrowRight') next = index + 1;
    else if (e.key === 'ArrowUp') next = index - columns;
    else if (e.key === 'ArrowDown') next = index + columns;
    else if (e.key === 'Home') next = index - (index % columns);
    else if (e.key === 'End') next = index - (index % columns) + columns - 1;
    else if (e.key === 'PageUp') next = index - columns * 4;
    else if (e.key === 'PageDown') next = index + columns * 4;
    else return;
    e.preventDefault();
    next = Math.max(0, Math.min(cells.length - 1, next));
    cells[index].tabIndex = -1;
    cells[next].tabIndex = 0;
    cells[next].focus();
    cells[next].scrollIntoView?.({ block: 'nearest' });
  });
}

export function renderMonthGrid(controller: ViewControls, selectedMonth?: ViewYearMonth | null): HTMLElement {
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const { viewYear, viewMonth, mode = 'BS', showSecondaryCalendar = true } = controller.getState();
  const names = monthNames(mode, adapter, ui, mode);
  const grid = el('div', 'ndp-monthgrid', { role: 'grid', 'aria-label': ui.strings.selectMonth });
  let row = el('div', 'ndp-gridrow', { role: 'row' });
  for (let index = 0; index < 12; index += 1) {
    const month = index + 1;
    const current = month === viewMonth;
    const selected = selectedMonth ? selectedMonth.year === viewYear && selectedMonth.month === month : current;
    const btn = el('button', `ndp-monthcell${selected ? ' is-selected' : ''}`, { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false', 'data-ndp-field': `month-${month}` });
    btn.appendChild(document.createTextNode(names[index]));
    const outOfTable = !isViewMonthInRange(mode, adapter, viewYear, month);
    const disabled = outOfTable || !!controller.isMonthDisabled?.(viewYear, month);
    if (current) btn.setAttribute('data-ndp-entry', '');
    if (disabled) {
      btn.classList.add('is-disabled');
      btn.setAttribute('aria-disabled', 'true');
    }
    if (showSecondaryCalendar && !outOfTable) {
      // The other calendar's month usually straddles this one (~half-month
      // offset), so show both overlapped months, e.g. "Baisakh/Jestha".
      const span = crossCalendarMonthSpan(mode, adapter, nativeDateMath, viewYear, month);
      btn.appendChild(setText(el('span', 'ndp-monthcell-en'), monthSpanText(span, otherMode(mode), adapter, ui, mode, false)));
    }
    if (!disabled) btn.addEventListener('click', () => controller.selectMonthView(month));
    row.appendChild(btn);
    if (month % 3 === 0) {
      grid.appendChild(row);
      row = el('div', 'ndp-gridrow', { role: 'row' });
    }
  }
  wireRovingGrid(grid, 3);
  return grid;
}

// Whether (year, month) in `mode` is a month the table fully covers.
export function isViewMonthInRange(mode: CalendarMode, adapter: CalendarAdapter, year: number, month: number): boolean {
  const clamped = clampViewMonth(mode, adapter, year, month);
  return clamped.year === year && clamped.month === month;
}

// Every supported year in one scrollable grid (rather than paging 12 at a
// time with ‹ ›), opened scrolled so the current view year sits in the middle.
// Scrolling / flicking is far quicker than stepping pages, especially on touch.
export function renderYearGrid(controller: ViewControls, bounds?: { min: number; max: number }, isDisabled?: (year: number) => boolean): HTMLElement {
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const { viewYear, mode = 'BS', showSecondaryCalendar = true } = controller.getState();
  const { min, max } = bounds ?? viewYearBounds(mode, adapter);
  const grid = el('div', 'ndp-yeargrid', { role: 'grid', 'aria-label': ui.strings.selectYear });
  let selectedCell: HTMLElement | null = null;
  let row = el('div', 'ndp-gridrow', { role: 'row' });
  let inRow = 0;
  for (let year = min; year <= max; year += 1) {
    const selected = year === viewYear;
    const btn = el('button', `ndp-yearcell${selected ? ' is-selected' : ''}`, { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false', 'data-ndp-field': `year-${year}` });
    btn.appendChild(setText(el('span', 'ndp-yearcell-bs'), digits(year, mode, adapter, ui)));
    if (showSecondaryCalendar) {
      const secondaryLabel = mode === 'AD' ? String(adapter.adToBs(new Date(year, 0, 1)).year) : String(adapter.bsToAd(year, 1, 1).getFullYear());
      btn.appendChild(setText(el('span', 'ndp-yearcell-en'), digits(secondaryLabel, otherMode(mode), adapter, ui)));
    }
    if (isDisabled?.(year)) {
      btn.classList.add('is-disabled');
      btn.setAttribute('aria-disabled', 'true');
    } else {
      btn.addEventListener('click', () => controller.selectYearView(year));
    }
    if (selected) {
      selectedCell = btn;
      btn.setAttribute('data-ndp-entry', '');
    }
    row.appendChild(btn);
    inRow += 1;
    if (inRow === 3 || year === max) {
      grid.appendChild(row);
      row = el('div', 'ndp-gridrow', { role: 'row' });
      inRow = 0;
    }
  }
  wireRovingGrid(grid, 3);
  // Center the selected year once the grid is laid out (it isn't attached yet).
  // The popup may not be laid out yet on the first frame (still hidden or
  // being positioned), so retry for a few frames until the grid has a height.
  const center = (tries = 0): void => {
    if (!selectedCell) return;
    if (!grid.clientHeight && tries < 10 && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => center(tries + 1));
      return;
    }
    grid.scrollTop = selectedCell.offsetTop - (grid.clientHeight - selectedCell.offsetHeight) / 2;
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => center());
  else center();
  return grid;
}

// ---- panel helpers ----------------------------------------------------------

export function inRange(range: DateRange | null, value: DateValue): boolean {
  if (!range) return false;
  return value.ad.getTime() >= range.start.ad.getTime() && value.ad.getTime() <= range.end.ad.getTime();
}

// The popup's outer element: a dialog, modal while it's a bottom sheet.
export function panelShell(root: HTMLElement, className: string, label: string, ui: UiConfig): HTMLElement {
  const panel = el('div', className, { role: 'dialog', 'aria-label': label });
  if (ui.density) panel.classList.add(`ndp-density-${ui.density}`);
  if (root.classList.contains('ndp-sheet')) panel.setAttribute('aria-modal', 'true');
  return panel;
}

// A spoken date in the UI language (announcements).
export function spokenDate(date: Date, mode: CalendarMode, adapter: CalendarAdapter, ui: UiConfig): string {
  return formatDateValue(date, adapter, { mode, format: 'DD MMMM YYYY', locale: speechLanguage(ui) });
}

// What the live region reads about the view: the month (day view), the year
// (month view) or nothing (year view — the list itself is the content).
export function viewAnnouncement(view: 'day' | 'month' | 'year', mode: CalendarMode, adapter: CalendarAdapter, ui: UiConfig, year: number, month: number): string {
  if (view === 'day') return monthTitle(mode, adapter, ui, year, month);
  if (view === 'month') return digits(year, mode, adapter, ui);
  return ui.strings.selectYear;
}

export function button(className: string, text: string, field: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const btn = setText(el('button', className, { type: 'button', 'data-ndp-field': field }), text);
  if (disabled) btn.disabled = true;
  else btn.addEventListener('click', onClick);
  return btn;
}

export function footerRow(...buttons: HTMLElement[]): HTMLElement {
  const footer = el('div', 'ndp-button-row');
  if (buttons.length === 1) footer.classList.add('ndp-button-row--single');
  footer.append(...buttons);
  return footer;
}
