import type { DateRangeController } from '../application/date-range-controller.js';
import { previewRange } from '../application/date-range-controller.js';
import type { DateTimeController } from '../application/date-time-controller.js';
import { clampViewMonth, crossCalendarMonthSpan, firstOfViewMonth, viewYearBounds, viewYearMonthOf } from '../application/calendar-view.js';
import type { MonthSpan } from '../application/calendar-view.js';
import type { MonthPickerController } from '../application/month-picker-controller.js';
import { GREGORIAN_MONTHS_SHORT, nativeDateMath } from '../date-math/native-date-math.js';
import { formatDateValue } from '../format/index.js';
import { normalizeDigits } from '../format/parse.js';
import { computePopupPosition } from '../position/index.js';
import type { CalendarAdapter, CalendarMode, DateRange, DateValue } from '../types.js';

type CalendarView = 'day' | 'month' | 'year';

// The subset of controller behaviour the shared header + month/year grids use.
// Both the datetime and range controllers satisfy this structurally. `mode` is
// absent on the month picker (always BS), so it's read as `mode ?? 'BS'`.
interface ViewControls {
  getState(): { view: CalendarView; viewYear: number; viewMonth: number; yearGroupStart: number; mode?: CalendarMode; showSecondaryCalendar?: boolean };
  navigateMonth(delta: number): void;
  navigateYear(delta: number): void;
  navigateYearGroup(delta: number): void;
  setView(view: CalendarView): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
  getAdapter(): CalendarAdapter;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function setText(node: HTMLElement, text: string): HTMLElement {
  node.textContent = text;
  return node;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isSameDay(a: DateValue | null | undefined, b: DateValue | null | undefined): boolean {
  return !!a && !!b && a.ad.getTime() === b.ad.getTime();
}

function inRange(range: DateRange | null, value: DateValue): boolean {
  if (!range) return false;
  return value.ad.getTime() >= range.start.ad.getTime() && value.ad.getTime() <= range.end.ad.getTime();
}

function classForRange(value: DateValue, range: DateRange | null, today: DateValue): string {
  const classes = ['ndp-cell'];
  if (isSameDay(value, today)) classes.push('is-today');
  if (inRange(range, value)) classes.push('is-in-range');
  if (isSameDay(range?.start, value)) classes.push('is-range-start');
  if (isSameDay(range?.end, value)) classes.push('is-range-end');
  return classes.join(' ');
}

function navButton(glyph: string, aria: string, onClick: () => void, hidden = false): HTMLElement {
  const button = setText(el('button', 'ndp-nav', { type: 'button', 'aria-label': aria || glyph }), glyph);
  if (hidden) {
    button.classList.add('is-hidden');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('aria-hidden', 'true');
  } else {
    button.addEventListener('click', onClick);
  }
  return button;
}

// Label a cross-calendar month span as "Month/Month[ Year/Year]" when the
// viewed month overlaps two months of the other calendar (the usual case —
// BS/AD months are offset by roughly half a month), or a single name when it
// doesn't. BS names render in Devanagari, AD names in English, matching how
// each calendar is always scripted regardless of primary/secondary position.
// BS year shown as the hint for an AD year: taken from the year's first month
// the conversion table covers (1 January can fall before the table's start).
function bsYearOfAdYear(adapter: CalendarAdapter, year: number): number {
  const first = clampViewMonth('AD', adapter, year, 1);
  return adapter.adToBs(firstOfViewMonth('AD', adapter, first.year, first.month)).year;
}

// Whether (year, month) in `mode` is a month the table fully covers.
function isViewMonthInRange(mode: CalendarMode, adapter: CalendarAdapter, year: number, month: number): boolean {
  const clamped = clampViewMonth(mode, adapter, year, month);
  return clamped.year === year && clamped.month === month;
}

function monthSpanText(span: MonthSpan, otherMode: CalendarMode, adapter: CalendarAdapter, withYear = true): string {
  const names = otherMode === 'AD' ? GREGORIAN_MONTHS_SHORT : adapter.bsMonthNames('ne');
  const startName = names[span.start.month - 1];
  const endName = names[span.end.month - 1];
  const months = startName === endName ? startName : `${startName}/${endName}`;
  if (!withYear) return months;
  const yearOf = (y: number) => (otherMode === 'AD' ? String(y) : adapter.toLocaleDigits(y, 'ne'));
  const years = span.start.year === span.end.year ? yearOf(span.start.year) : `${yearOf(span.start.year)}/${yearOf(span.end.year)}`;
  return `${months} ${years}`;
}

// View-aware header: the label drills down day → month → year, and the arrows
// step month/year/year-group depending on which view is showing. The active
// `mode` decides which calendar is the big/primary label (what's navigated)
// and which is the small/secondary hint — the two swap when mode is 'AD'.
function renderHeader(controller: ViewControls): HTMLElement {
  const adapter = controller.getAdapter();
  const { view, viewYear, viewMonth, mode = 'BS', showSecondaryCalendar = true } = controller.getState();
  const header = el('div', 'ndp-cal-header');

  let outerPrev: HTMLElement;
  let innerPrev: HTMLElement;
  let innerNext: HTMLElement;
  let outerNext: HTMLElement;
  if (view === 'day') {
    outerPrev = navButton('«', 'Previous year', () => controller.navigateYear(-1));
    innerPrev = navButton('‹', 'Previous month', () => controller.navigateMonth(-1));
    innerNext = navButton('›', 'Next month', () => controller.navigateMonth(1));
    outerNext = navButton('»', 'Next year', () => controller.navigateYear(1));
  } else if (view === 'month') {
    outerPrev = navButton('«', '', () => {}, true);
    innerPrev = navButton('‹', 'Previous year', () => controller.navigateYear(-1));
    innerNext = navButton('›', 'Next year', () => controller.navigateYear(1));
    outerNext = navButton('»', '', () => {}, true);
  } else {
    // The year grid scrolls through every year, so no paging arrows.
    outerPrev = navButton('«', '', () => {}, true);
    innerPrev = navButton('‹', '', () => {}, true);
    innerNext = navButton('›', '', () => {}, true);
    outerNext = navButton('»', '', () => {}, true);
  }

  const label = el('button', 'ndp-cal-label', { type: 'button', 'aria-live': 'polite', 'aria-label': 'Switch calendar view' });
  let primary: string;
  let secondary: string;
  if (view === 'day') {
    const span = crossCalendarMonthSpan(mode, adapter, nativeDateMath, viewYear, viewMonth);
    if (mode === 'AD') {
      primary = `${GREGORIAN_MONTHS_SHORT[viewMonth - 1]} ${viewYear}`;
      secondary = monthSpanText(span, 'BS', adapter);
    } else {
      primary = `${adapter.bsMonthNames('ne')[viewMonth - 1]} ${adapter.toLocaleDigits(viewYear, 'ne')}`;
      secondary = monthSpanText(span, 'AD', adapter);
    }
    label.addEventListener('click', () => controller.setView('month'));
  } else {
    if (mode === 'AD') {
      primary = String(viewYear);
      secondary = `${bsYearOfAdYear(adapter, viewYear)} BS`;
    } else {
      primary = adapter.toLocaleDigits(viewYear, 'ne');
      secondary = `${adapter.bsToAd(viewYear, 1, 1).getFullYear()} AD`;
    }
    label.addEventListener('click', () => controller.setView(view === 'month' ? 'year' : 'day'));
  }
  label.appendChild(setText(el('div', 'ndp-cal-label-primary'), `${primary} ▾`));
  if (showSecondaryCalendar) label.appendChild(setText(el('div', 'ndp-cal-label-secondary'), secondary));

  header.append(outerPrev, innerPrev, label, innerNext, outerNext);
  return header;
}

function renderWeekdays(adapter: CalendarAdapter, mode: CalendarMode = 'BS'): HTMLElement {
  const row = el('div', 'ndp-weekdays', { role: 'row' });
  adapter.bsWeekdayShort(mode === 'AD' ? 'en' : 'ne').forEach((weekday) => row.appendChild(setText(el('div', 'ndp-weekday', { role: 'columnheader' }), weekday)));
  return row;
}

function renderMonthGrid(controller: ViewControls): HTMLElement {
  const adapter = controller.getAdapter();
  const { viewYear, viewMonth, mode = 'BS', showSecondaryCalendar = true } = controller.getState();
  const otherMode: CalendarMode = mode === 'AD' ? 'BS' : 'AD';
  const grid = el('div', 'ndp-monthgrid', { role: 'grid' });
  for (let index = 0; index < 12; index += 1) {
    const month = index + 1;
    const selected = month === viewMonth;
    const primaryName = mode === 'AD' ? GREGORIAN_MONTHS_SHORT[index] : adapter.bsMonthNames('ne')[index];
    const btn = setText(el('button', `ndp-monthcell${selected ? ' is-selected' : ''}`, { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false' }), primaryName);
    if (!isViewMonthInRange(mode, adapter, viewYear, month)) {
      // Outside the supported calendar range (only at its very ends).
      btn.classList.add('is-disabled');
      btn.setAttribute('aria-disabled', 'true');
      grid.appendChild(btn);
      continue;
    }
    if (showSecondaryCalendar) {
      // The other calendar's month usually straddles this one (~half-month
      // offset), so show both overlapped months, e.g. "Baisakh/Jestha".
      const span = crossCalendarMonthSpan(mode, adapter, nativeDateMath, viewYear, month);
      btn.appendChild(setText(el('span', 'ndp-monthcell-en'), monthSpanText(span, otherMode, adapter, false)));
    }
    btn.addEventListener('click', () => controller.selectMonthView(month));
    grid.appendChild(btn);
  }
  return grid;
}

// Every supported year in one scrollable grid (rather than paging 12 at a
// time with ‹ ›), opened scrolled so the current view year sits in the middle.
// Scrolling / flicking is far quicker than stepping pages, especially on touch.
function renderYearGrid(controller: ViewControls): HTMLElement {
  const adapter = controller.getAdapter();
  const { viewYear, mode = 'BS', showSecondaryCalendar = true } = controller.getState();
  const { min, max } = viewYearBounds(mode, adapter);
  const grid = el('div', 'ndp-yeargrid', { role: 'grid', 'aria-label': 'Select year' });
  let selectedCell: HTMLElement | null = null;
  for (let year = min; year <= max; year += 1) {
    const selected = year === viewYear;
    const btn = el('button', `ndp-yearcell${selected ? ' is-selected' : ''}`, { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false' });
    const primaryDigits = mode === 'AD' ? String(year) : adapter.toLocaleDigits(year, 'ne');
    btn.appendChild(setText(el('span', 'ndp-yearcell-bs'), primaryDigits));
    if (showSecondaryCalendar) {
      const secondaryLabel = mode === 'AD' ? String(adapter.adToBs(new Date(year, 0, 1)).year) : String(adapter.bsToAd(year, 1, 1).getFullYear());
      btn.appendChild(setText(el('span', 'ndp-yearcell-en'), secondaryLabel));
    }
    btn.addEventListener('click', () => controller.selectYearView(year));
    if (selected) selectedCell = btn;
    grid.appendChild(btn);
  }
  // Center the selected year once the grid is laid out (it isn't attached yet).
  const center = (): void => {
    if (selectedCell) grid.scrollTop = selectedCell.offsetTop - (grid.clientHeight - selectedCell.offsetHeight) / 2;
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(center);
  else center();
  return grid;
}

// Year navigation header used while picking a month. The grid is months, so the
// inner ‹ › step whole years; the outer slots stay hidden so the header keeps
// the same 5-column layout (and full-width centered label) as the day header.
// Mode-aware: "Pick a Month" spans a BS or a Gregorian month depending on mode.
function renderMonthRangeHeader(controller: DateRangeController): HTMLElement {
  const adapter = controller.getAdapter();
  const { viewYear, mode, showSecondaryCalendar } = controller.getState();
  const header = el('div', 'ndp-cal-header');
  const outerPrev = navButton('«', '', () => {}, true);
  const innerPrev = navButton('‹', 'Previous year', () => controller.navigateYear(-1));
  const innerNext = navButton('›', 'Next year', () => controller.navigateYear(1));
  const outerNext = navButton('»', '', () => {}, true);
  const label = el('div', 'ndp-cal-label ndp-cal-label--static');
  if (mode === 'AD') {
    label.appendChild(setText(el('div', 'ndp-cal-label-primary'), `${viewYear} AD`));
    if (showSecondaryCalendar) label.appendChild(setText(el('div', 'ndp-cal-label-secondary'), `${bsYearOfAdYear(adapter, viewYear)} BS`));
  } else {
    label.appendChild(setText(el('div', 'ndp-cal-label-primary'), `${adapter.toLocaleDigits(viewYear, 'ne')} BS`));
    if (showSecondaryCalendar) label.appendChild(setText(el('div', 'ndp-cal-label-secondary'), `${adapter.bsToAd(viewYear, 1, 1).getFullYear()} AD`));
  }
  header.append(outerPrev, innerPrev, label, innerNext, outerNext);
  return header;
}

// The 12-month grid for month mode: one click selects the whole month (BS or
// Gregorian, per the active mode), and the range spans that month's first →
// last day.
function renderMonthRangeGrid(controller: DateRangeController): HTMLElement {
  const adapter = controller.getAdapter();
  const state = controller.getState();
  const viewYear = state.viewYear;
  const mode = state.mode;
  const otherMode: CalendarMode = mode === 'AD' ? 'BS' : 'AD';
  const sel = state.range;
  const selStart = sel ? viewYearMonthOf(mode, adapter, sel.start.ad) : null;
  const grid = el('div', 'ndp-monthgrid ndp-monthgrid--range', { role: 'grid' });
  for (let index = 0; index < 12; index += 1) {
    const month = index + 1;
    const disabled = controller.isMonthDisabled(viewYear, month);
    const selected = !!selStart && selStart.year === viewYear && selStart.month === month;
    const primaryName = mode === 'AD' ? GREGORIAN_MONTHS_SHORT[index] : adapter.bsMonthNames('ne')[index];
    const classes = ['ndp-monthcell'];
    if (selected) classes.push('is-selected');
    if (disabled) classes.push('is-disabled');
    const btn = setText(el('button', classes.join(' '), { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false' }), primaryName);
    if (state.showSecondaryCalendar) {
      const span = crossCalendarMonthSpan(mode, adapter, nativeDateMath, viewYear, month);
      btn.appendChild(setText(el('span', 'ndp-monthcell-en'), monthSpanText(span, otherMode, adapter, false)));
    }
    if (disabled) btn.setAttribute('aria-disabled', 'true');
    else btn.addEventListener('click', () => controller.selectMonth(viewYear, month));
    grid.appendChild(btn);
  }
  return grid;
}

const MODE_TOGGLE_SVG ='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>';

// A single-button BS/AD toggle with a swap glyph.
function renderModeSwitch(mode: CalendarMode, toggle: () => void): HTMLElement {
  const btn = el('button', 'ndp-mode-toggle', { type: 'button', 'aria-label': `Switch to ${mode === 'BS' ? 'AD' : 'BS'}` });
  btn.setAttribute('data-mode', mode);
  btn.innerHTML = MODE_TOGGLE_SVG;
  btn.addEventListener('click', toggle);
  return btn;
}

export function renderRangePanel(root: HTMLElement, controller: DateRangeController): void {
  const state = controller.getState();
  const adapter = controller.getAdapter();
  const fmt = (value: DateValue) => formatDateValue(value.ad, adapter, { mode: state.mode, locale: state.mode === 'BS' ? 'ne' : 'en' });
  root.innerHTML = '';
  const panel = el('div', 'ndp-panel ndp-panel--range ndp-panel--compact', { role: 'dialog', 'aria-label': 'Date range picker' });

  const presetRail = el('div', 'ndp-presets');
  controller.getPresets().forEach((preset) => {
    if (preset.kind === 'range') {
      const btn = setText(el('button', `ndp-preset${state.activePresetId === preset.id ? ' is-active' : ''}`, { type: 'button' }), preset.label);
      btn.addEventListener('click', () => controller.selectPreset(preset.id));
      presetRail.appendChild(btn);
      return;
    }
    const btn = setText(el('button', `ndp-preset ndp-preset--submenu${state.activePresetId === preset.id ? ' is-active' : ''}${state.openSubmenuId === preset.id ? ' is-open' : ''}`, { type: 'button' }), preset.label);
    btn.addEventListener('click', () => {
      if (preset.id === 'custom') controller.startCustomRange();
      else if (preset.id === 'month') controller.startMonthSelect();
      else controller.toggleSubmenu(preset.id);
    });
    presetRail.appendChild(btn);
    if (state.openSubmenuId === preset.id) {
      const list = el('div', 'ndp-submenu-list');
      preset.items?.forEach((item) => {
        const itemBtn = setText(el('button', 'ndp-submenu-item', { type: 'button' }), item.label);
        itemBtn.addEventListener('click', () => controller.selectSubmenuItem(preset.id, item.id));
        list.appendChild(itemBtn);
      });
      presetRail.appendChild(list);
    }
  });

  const calCol = el('div', 'ndp-cal-col');

  // Input group: Start · End · BS/AD switch, joined as one control. The active
  // field is highlighted so custom-range selection has clear, live feedback.
  const awaitingStart = !state.pendingStart && !state.range;
  const awaitingEnd = !!state.pendingStart;
  const startText = state.pendingStart ? fmt(state.pendingStart) : state.range ? fmt(state.range.start) : 'Start';
  const endText = state.pendingStart ? 'End' : state.range ? fmt(state.range.end) : 'End';
  const group = el('div', 'ndp-input-group');
  const startField = el('div', `ndp-ig-field${awaitingStart ? ' is-active' : ''}`);
  startField.append(setText(el('span', 'ndp-ig-label'), 'Start'), setText(el('span', 'ndp-ig-value'), startText));
  const endField = el('div', `ndp-ig-field${awaitingEnd ? ' is-active' : ''}`);
  endField.append(setText(el('span', 'ndp-ig-label'), 'End'), setText(el('span', 'ndp-ig-value'), endText));
  group.append(startField, setText(el('span', 'ndp-ig-arrow', { 'aria-hidden': 'true' }), '→'), endField);
  if (state.allowModeToggle) {
    group.appendChild(renderModeSwitch(state.mode, () => controller.toggleMode()));
  }
  calCol.appendChild(group);

  const monthUnit = state.selectionUnit === 'month';

  if (monthUnit) {
    calCol.appendChild(setText(el('div', 'ndp-range-hint'), 'महिना छान्नुहोस् · pick a month for its full date span'));
  } else if (state.activePresetId === 'custom' || state.pendingStart) {
    // Guidance shown while picking a custom day range, so clicking "Custom
    // Range" has an obvious effect instead of feeling like nothing happened.
    const message = state.pendingStart ? 'अन्त्य मिति छान्नुहोस् · now pick the end date' : 'सुरु मिति छान्नुहोस् · pick the start date';
    calCol.appendChild(setText(el('div', 'ndp-range-hint'), message));
  }

  if (monthUnit) {
    calCol.appendChild(renderMonthRangeHeader(controller));
    calCol.appendChild(renderMonthRangeGrid(controller));
  } else {
    calCol.appendChild(renderHeader(controller));
    if (state.view === 'day') {
      calCol.appendChild(renderWeekdays(adapter, state.mode));
      const grid = el('div', 'ndp-grid', { role: 'grid' });
      const preview = previewRange(state);
      controller.buildMonthCells(state.viewYear, state.viewMonth).forEach((cell) => {
        if (!cell) {
          grid.appendChild(el('div', 'ndp-cell ndp-cell--empty', { role: 'gridcell' }));
          return;
        }
        const disabled = controller.isDisabled(cell);
        const cls = classForRange(cell, preview, controller.getToday()) + (disabled ? ' is-disabled' : '');
        const btn = el('button', cls, { type: 'button', role: 'gridcell', 'aria-selected': inRange(preview, cell) ? 'true' : 'false' });
        if (disabled) btn.setAttribute('aria-disabled', 'true');
        const primaryDay = state.mode === 'AD' ? String(cell.ad.getDate()) : adapter.toLocaleDigits(cell.bs.day, 'ne');
        btn.appendChild(setText(el('span', 'ndp-cell-primary'), primaryDay));
        if (state.showSecondaryCalendar) {
          const secondaryDay = state.mode === 'AD' ? adapter.toLocaleDigits(cell.bs.day, 'ne') : String(cell.ad.getDate());
          btn.appendChild(setText(el('span', 'ndp-cell-secondary'), secondaryDay));
        }
        if (!disabled) {
          btn.addEventListener('click', () => controller.selectDay(cell));
          btn.addEventListener('mouseenter', () => controller.hoverDay(cell));
        }
        grid.appendChild(btn);
      });
      calCol.appendChild(grid);
    } else if (state.view === 'month') {
      calCol.appendChild(renderMonthGrid(controller));
    } else {
      calCol.appendChild(renderYearGrid(controller));
    }
  }

  const apply = setText(el('button', 'ndp-apply', { type: 'button' }), 'Apply');
  apply.addEventListener('click', () => controller.apply());
  calCol.appendChild(apply);

  panel.append(presetRail, calCol);
  root.appendChild(panel);
}

function meridiemOf(hour: number): 'AM' | 'PM' {
  return hour < 12 ? 'AM' : 'PM';
}

function to12h(hour: number): number {
  const h = hour % 12;
  return h === 0 ? 12 : h;
}

interface WheelItem {
  value: number;
  text: string;
  disabled: boolean;
}

// A scrollable "drum" column, iOS-style. The row nearest the center band is the
// selection; disabled rows are shown struck-through and skipped when the scroll
// settles. Clicking a row selects it directly — the deterministic path used by
// keyboard/touch/tests — while a flick-scroll commits the centered value once it
// comes to rest (a full re-render then re-centers on the committed row).
function timeWheel(label: string, items: WheelItem[], selectedValue: number, onSelect: (value: number) => void): HTMLElement {
  const wheel = el('div', 'ndp-wheel', { role: 'listbox', 'aria-label': label });
  const list = el('div', 'ndp-wheel-list');
  const rows: HTMLElement[] = [];
  let selectedIndex = Math.max(0, items.findIndex((it) => it.value === selectedValue));

  items.forEach((it) => {
    const classes = ['ndp-wheel-item'];
    if (it.disabled) classes.push('is-disabled');
    if (it.value === selectedValue) classes.push('is-selected');
    const row = setText(el('button', classes.join(' '), {
      type: 'button',
      role: 'option',
      tabindex: '-1',
      'aria-selected': it.value === selectedValue ? 'true' : 'false',
      'aria-disabled': it.disabled ? 'true' : 'false',
    }), it.text);
    if (!it.disabled) row.addEventListener('click', () => onSelect(it.value));
    rows.push(row);
    list.appendChild(row);
  });
  wheel.appendChild(list);

  const center = (): void => {
    const row = rows[selectedIndex];
    if (row) list.scrollTop = row.offsetTop - (list.clientHeight - row.clientHeight) / 2;
  };

  let settle = 0;
  list.addEventListener('scroll', () => {
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      // A tap re-renders the panel, replacing this wheel; a settle timer still
      // pending on the old one must not override what was just tapped.
      if (!list.isConnected) return;
      const mid = list.scrollTop + list.clientHeight / 2;
      let bestIndex = selectedIndex;
      let bestDist = Infinity;
      rows.forEach((row, i) => {
        if (items[i].disabled) return;
        const dist = Math.abs(row.offsetTop + row.clientHeight / 2 - mid);
        if (dist < bestDist) { bestDist = dist; bestIndex = i; }
      });
      if (items[bestIndex] && items[bestIndex].value !== selectedValue) onSelect(items[bestIndex].value);
      else { selectedIndex = bestIndex; center(); }
    }, 130);
  }, { passive: true });

  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(center);
  else center();
  return wheel;
}

// An accessible, keyboard-first numeric field for one time segment. It's an
// ARIA spinbutton: type digits (masked to two, Nepali digits accepted), Arrow
// Up/Down steps, Enter/blur commits. `onCommit` returns false for an invalid or
// disabled value, and the field reverts to the last good display. `field` tags
// the element so focus can be restored after the panel re-renders.
function timeInput(opts: {
  field: string;
  label: string;
  display: string;
  min: number;
  max: number;
  now: number;
  onCommit: (raw: string) => boolean;
  onStep: (delta: number) => void;
}): HTMLInputElement {
  const input = el('input', 'ndp-time-input', {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: '2',
    role: 'spinbutton',
    'aria-label': opts.label,
    'aria-valuemin': String(opts.min),
    'aria-valuemax': String(opts.max),
    'aria-valuenow': String(opts.now),
    'aria-valuetext': opts.display,
    'data-ndp-field': opts.field,
  }) as HTMLInputElement;
  input.value = opts.display;
  const revert = () => { input.value = opts.display; input.classList.remove('ndp-input-invalid'); };
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    input.value = normalizeDigits(input.value).replace(/\D/g, '').slice(0, 2);
    // Live invalid hint without committing (empty is neutral, not invalid).
    const n = Number(input.value);
    const bad = input.value !== '' && (Number.isNaN(n) || n < opts.min || n > opts.max);
    input.classList.toggle('ndp-input-invalid', bad);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); opts.onStep(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); opts.onStep(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!opts.onCommit(input.value)) revert(); }
  });
  input.addEventListener('blur', () => { if (!opts.onCommit(input.value)) revert(); });
  return input;
}

// `touch` is the phone time step: just big wheels (spinning is the touch idiom;
// typing digits on an on-screen keyboard is not), without the typed entry.
function renderTimeControls(controller: DateTimeController, touch = false): HTMLElement | null {
  const state = controller.getState();
  if (!state.time) return null;
  const { hour, minute, second } = state.time;
  const is12h = state.timeFormat === '12h';
  const step = state.minuteStep > 0 ? state.minuteStep : 1;
  const pm = meridiemOf(hour) === 'PM';

  const panel = el('div', touch ? 'ndp-time-panel ndp-time-panel--touch' : 'ndp-time-panel');
  if (!touch) panel.appendChild(setText(el('div', 'ndp-time-title'), 'समय / Time'));

  const to24 = (display: number): number => (is12h ? (display % 12) + (pm ? 12 : 0) : display);
  const hourDisplay = is12h ? to12h(hour) : hour;

  // ---- editable entry (keyboard-first): type HH : mm [AM/PM] ----
  const entry = el('div', 'ndp-time-entry', { role: 'group', 'aria-label': 'Enter time' });
  entry.appendChild(timeInput({
    field: 'hour',
    label: is12h ? 'Hour (1–12)' : 'Hour (0–23)',
    display: pad2(hourDisplay),
    min: is12h ? 1 : 0,
    max: is12h ? 12 : 23,
    now: hourDisplay,
    onCommit: (raw) => {
      if (raw === '') return false;
      const n = Number(normalizeDigits(raw));
      if (!Number.isInteger(n)) return false;
      if (is12h) return n >= 1 && n <= 12 ? controller.setHour((n % 12) + (pm ? 12 : 0)) : false;
      return controller.setHour(n);
    },
    onStep: (d) => controller.stepHour(d),
  }));
  entry.appendChild(setText(el('span', 'ndp-time-entry-colon', { 'aria-hidden': 'true' }), ':'));
  entry.appendChild(timeInput({
    field: 'minute',
    label: 'Minute (0–59)',
    display: pad2(minute),
    min: 0,
    max: 59,
    now: minute,
    onCommit: (raw) => {
      if (raw === '') return false;
      const n = Number(normalizeDigits(raw));
      return Number.isInteger(n) ? controller.setMinute(n) : false;
    },
    onStep: (d) => controller.stepMinute(d),
  }));
  if (is12h) {
    const ampm = setText(el('button', 'ndp-time-ampm', {
      type: 'button',
      'data-ndp-field': 'ampm',
      'aria-label': `Meridiem, currently ${pm ? 'PM' : 'AM'}`,
    }), pm ? 'PM' : 'AM');
    ampm.addEventListener('click', () => controller.toggleMeridiem());
    ampm.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); controller.toggleMeridiem(); }
    });
    entry.appendChild(ampm);
  }
  if (!touch) {
    panel.appendChild(entry);
    panel.appendChild(setText(el('div', 'ndp-time-scroll-hint', { 'aria-hidden': 'true' }), 'or scroll'));
  }

  const wheels = el('div', 'ndp-time-wheels');

  // ---- hours ----
  const hourItems: WheelItem[] = [];
  if (is12h) {
    for (let d = 1; d <= 12; d += 1) hourItems.push({ value: d, text: pad2(d), disabled: controller.isHourDisabled(to24(d)) });
  } else {
    for (let h = 0; h < 24; h += 1) hourItems.push({ value: h, text: pad2(h), disabled: controller.isHourDisabled(h) });
  }
  wheels.appendChild(timeWheel('Hour', hourItems, is12h ? to12h(hour) : hour, (display) => controller.setTime(to24(display), minute, second)));

  wheels.appendChild(setText(el('span', 'ndp-wheel-colon'), ':'));

  // ---- minutes ----
  const minuteItems: WheelItem[] = [];
  for (let m = 0; m < 60; m += step) minuteItems.push({ value: m, text: pad2(m), disabled: controller.isMinuteDisabled(hour, m) });
  wheels.appendChild(timeWheel('Min', minuteItems, minute, (m) => controller.setTime(hour, m, second)));

  // ---- meridiem (12h only) ----
  if (is12h) {
    const merItems: WheelItem[] = [
      { value: 0, text: 'AM', disabled: false },
      { value: 1, text: 'PM', disabled: false },
    ];
    wheels.appendChild(timeWheel('AM/PM', merItems, pm ? 1 : 0, (v) => { if ((v === 1) !== pm) controller.toggleMeridiem(); }));
  }

  panel.appendChild(wheels);

  const now = setText(el('button', 'ndp-time-now', { type: 'button' }), 'अहिले / Now');
  now.addEventListener('click', () => controller.setTimeToNow());
  panel.appendChild(now);
  return panel;
}

// Step 2 of the phone date-time sheet: which date you picked (tap to go back
// and change it), the time as a big readout, and the wheels.
function renderTimeStep(controller: DateTimeController): HTMLElement {
  const adapter = controller.getAdapter();
  const state = controller.getState();
  const selected = state.selected!;
  const time = state.time!;
  const wrap = el('div', 'ndp-time-step');

  const bsLabel = `${adapter.toLocaleDigits(selected.bs.day, 'ne')} ${adapter.bsMonthNames('ne')[selected.bs.month - 1]} ${adapter.toLocaleDigits(selected.bs.year, 'ne')}`;
  const adLabel = `${selected.ad.getDate()} ${GREGORIAN_MONTHS_SHORT[selected.ad.getMonth()]} ${selected.ad.getFullYear()}`;
  const back = el('button', 'ndp-step-back', { type: 'button', 'aria-label': 'Change date' });
  back.appendChild(setText(el('span', 'ndp-step-back-icon', { 'aria-hidden': 'true' }), '‹'));
  const dateText = el('span', 'ndp-step-date');
  dateText.appendChild(setText(el('span', 'ndp-step-date-primary'), state.mode === 'AD' ? adLabel : bsLabel));
  if (state.showSecondaryCalendar) dateText.appendChild(setText(el('span', 'ndp-step-date-secondary'), state.mode === 'AD' ? bsLabel : adLabel));
  back.appendChild(dateText);
  back.addEventListener('click', () => controller.setPanelStep('date'));
  wrap.appendChild(back);

  const is12h = state.timeFormat === '12h';
  const readout = is12h
    ? `${pad2(to12h(time.hour))}:${pad2(time.minute)} ${meridiemOf(time.hour)}`
    : `${pad2(time.hour)}:${pad2(time.minute)}`;
  wrap.appendChild(setText(el('div', 'ndp-time-readout', { 'aria-live': 'polite' }), readout));
  wrap.appendChild(renderTimeControls(controller, true)!);
  return wrap;
}

export function renderDateTimePanel(root: HTMLElement, controller: DateTimeController): void {
  const state = controller.getState();
  const adapter = controller.getAdapter();
  // Preserve keyboard focus (and caret) across the full re-render so typing/
  // arrowing in a time field isn't interrupted. Fields are tagged data-ndp-field.
  const active = document.activeElement as HTMLElement | null;
  const restoreField = active && root.contains(active) ? active.getAttribute('data-ndp-field') : null;
  root.innerHTML = '';
  const dateOnly = !state.time;
  const panelClass = `ndp-panel ndp-panel--datetime${dateOnly ? ' ndp-panel--date-only' : ''}`;
  const panel = el('div', panelClass, { role: 'dialog', 'aria-label': 'Date time picker' });
  const footerRow = (secondary: [string, () => void], primary: [string, () => void, boolean?]): HTMLElement => {
    const footer = el('div', 'ndp-button-row');
    const a = setText(el('button', 'ndp-secondary', { type: 'button' }), secondary[0]);
    const b = setText(el('button', 'ndp-apply', { type: 'button' }), primary[0]);
    a.addEventListener('click', secondary[1]);
    if (primary[2]) b.setAttribute('disabled', '');
    else b.addEventListener('click', primary[1]);
    footer.append(a, b);
    return footer;
  };

  // On a phone (bottom sheet) a date-time pick is two steps — calendar, then
  // time — instead of one long scroll. Wider screens keep both side by side.
  const stepped = !dateOnly && isSheetViewport();
  if (stepped && state.panelStep === 'time' && state.selected) {
    panel.classList.add('ndp-panel--time-step');
    panel.appendChild(renderTimeStep(controller));
    panel.appendChild(footerRow(['Clear', () => controller.clear()], ['Done', () => controller.confirm()]));
    root.appendChild(panel);
    return;
  }

  const calCol = el('div', 'ndp-cal-col');
  calCol.appendChild(renderHeader(controller));

  // Small "Today" shortcut, tucked above the grid rather than taking a full
  // footer row — jumps back regardless of which month/year/view is showing,
  // mirroring the time panel's "Now" button.
  const todayRow = el('div', 'ndp-today-row');
  const todayBtn = setText(el('button', 'ndp-today-btn', { type: 'button' }), 'आज / Today');
  todayBtn.addEventListener('click', () => controller.goToday());
  todayRow.appendChild(todayBtn);
  calCol.appendChild(todayRow);

  if (state.view === 'day') {
    calCol.appendChild(renderWeekdays(adapter, state.mode));
    const grid = el('div', 'ndp-grid', { role: 'grid' });
    const todayBs = adapter.todayBs();
    const today = controller.cellForBs(todayBs.year, todayBs.month, todayBs.day);
    controller.buildMonthCells(state.viewYear, state.viewMonth).forEach((cell) => {
      if (!cell) {
        grid.appendChild(el('div', 'ndp-cell ndp-cell--empty', { role: 'gridcell' }));
        return;
      }
      const disabled = controller.isDisabled(cell);
      const classes = ['ndp-cell'];
      if (isSameDay(cell, today)) classes.push('is-today');
      if (isSameDay(cell, state.selected)) classes.push('is-range-start');
      if (disabled) classes.push('is-disabled');
      const btn = el('button', classes.join(' '), { type: 'button', role: 'gridcell', 'aria-selected': isSameDay(cell, state.selected) ? 'true' : 'false' });
      if (disabled) btn.setAttribute('aria-disabled', 'true');
      const primaryDay = state.mode === 'AD' ? String(cell.ad.getDate()) : adapter.toLocaleDigits(cell.bs.day, 'ne');
      btn.appendChild(setText(el('span', 'ndp-cell-primary'), primaryDay));
      if (state.showSecondaryCalendar) {
        const secondaryDay = state.mode === 'AD' ? adapter.toLocaleDigits(cell.bs.day, 'ne') : String(cell.ad.getDate());
        btn.appendChild(setText(el('span', 'ndp-cell-secondary'), secondaryDay));
      }
      if (!disabled) btn.addEventListener('click', () => controller.selectDay(cell));
      grid.appendChild(btn);
    });
    calCol.appendChild(grid);
  } else if (state.view === 'month') {
    calCol.appendChild(renderMonthGrid(controller));
  } else {
    calCol.appendChild(renderYearGrid(controller));
  }

  // Calendar and time sit side by side on one screen (stacks on narrow widths);
  // the action row spans the full width beneath both. The time panel only shows
  // in the day view — month/year views are just for navigating.
  const body = el('div', 'ndp-datetime-body');
  body.appendChild(calCol);
  const timeControls = state.view === 'day' && !stepped ? renderTimeControls(controller) : null;
  if (timeControls) body.appendChild(timeControls);
  panel.appendChild(body);

  // Show Clear/Done only when the panel stays open after selecting a date
  // (i.e. withTime mode). In date-only mode the panel auto-closes on pick
  // so the footer buttons would never be seen. The phone date step offers
  // Next (to the time step) instead of Done.
  if (timeControls) {
    panel.appendChild(footerRow(['Clear', () => controller.clear()], ['Done', () => controller.confirm()]));
  } else if (stepped && state.view === 'day') {
    panel.appendChild(footerRow(['Clear', () => controller.clear()], ['Next: time ›', () => controller.setPanelStep('time'), !state.selected]));
  }

  root.appendChild(panel);

  if (restoreField) {
    const next = panel.querySelector<HTMLElement>(`[data-ndp-field="${restoreField}"]`);
    if (next) {
      next.focus();
      if (next instanceof HTMLInputElement) next.select();
    }
  }
}

export function renderMonthPickerPanel(root: HTMLElement, controller: MonthPickerController): void {
  const state = controller.getState();
  root.innerHTML = '';
  const panel = el('div', 'ndp-panel ndp-panel--month', { role: 'dialog', 'aria-label': 'Month picker' });
  const col = el('div', 'ndp-cal-col');
  col.appendChild(renderHeader(controller));
  col.appendChild(state.view === 'year' ? renderYearGrid(controller) : renderMonthGrid(controller));
  panel.appendChild(col);
  root.appendChild(panel);
}

// Phone-width viewports get the popup as a bottom sheet (full width, docked to
// the bottom, scrollable, over a dimmed backdrop) instead of a dropdown pinned
// under the input — a dropdown taller than the screen gets cut off on a phone.
// Matches the `max-width: 560px` breakpoint in theme.css.
export function isSheetViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') return window.matchMedia('(max-width: 560px)').matches;
  return window.innerWidth <= 560;
}

// Slide the bottom sheet up once per open. The panel element is rebuilt on
// every state change, so a plain CSS animation on it would replay on each tap
// inside the sheet; the enter class scopes it to the opening moment.
const sheetEnterCleanup = new WeakMap<HTMLElement, () => void>();

export function playSheetEnter(popup: HTMLElement): void {
  if (!popup.classList.contains('ndp-sheet')) return;
  // A quick close + reopen must not let the previous open's fallback timer
  // cut this slide short.
  sheetEnterCleanup.get(popup)?.();
  popup.classList.add('ndp-sheet--enter');
  let timer = 0;
  const done = (): void => {
    window.clearTimeout(timer);
    popup.classList.remove('ndp-sheet--enter');
    popup.removeEventListener('animationend', onEnd);
    sheetEnterCleanup.delete(popup);
  };
  // The backdrop's shorter fade ends first and bubbles here too — wait for
  // the slide itself, or it would be cut off mid-way.
  const onEnd = (event: AnimationEvent): void => {
    if (event.animationName === 'ndp-sheet-up') done();
  };
  popup.addEventListener('animationend', onEnd);
  timer = window.setTimeout(done, 1000); // reduced motion: no animation, no animationend
  sheetEnterCleanup.set(popup, () => {
    window.clearTimeout(timer);
    popup.removeEventListener('animationend', onEnd);
  });
}

export function positionPopup(trigger: HTMLElement, popup: HTMLElement, options: { opens?: 'left' | 'right' | 'center' | 'auto'; drops?: 'down' | 'up' | 'auto' } = {}): void {
  const sheet = isSheetViewport();
  popup.classList.toggle('ndp-sheet', sheet);
  if (sheet) {
    // Placement comes from the .ndp-sheet CSS (left/right/bottom: 0).
    popup.style.position = 'fixed';
    popup.style.top = '';
    popup.style.left = '';
    return;
  }
  // Set fixed position + a throwaway top/left so the browser computes
  // the correct shrink-wrap box before we measure it. On first open the
  // portal is position:static and spans the full viewport width — the
  // inner panel is much narrower, so measuring in static flow gives a
  // wildly wrong width. All four assignments happen in one synchronous
  // block; the browser won't paint until we return.
  popup.style.position = 'fixed';
  popup.style.top = '0px';
  popup.style.left = '0px';
  void popup.offsetHeight;
  const rect = trigger.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const pos = computePopupPosition(rect, { width: popupRect.width, height: popupRect.height }, { width: window.innerWidth, height: window.innerHeight }, options);
  popup.style.top = `${pos.top}px`;
  popup.style.left = `${pos.left}px`;
}
