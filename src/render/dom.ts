import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import type { DateRangeController } from '../application/date-range-controller.js';
import { previewRange } from '../application/date-range-controller.js';
import type { DateTimeController } from '../application/date-time-controller.js';
import type { MonthPickerController } from '../application/month-picker-controller.js';
import { formatDateValue } from '../format/index.js';
import { computePopupPosition } from '../position/index.js';
import type { CalendarMode, DateRange, DateValue } from '../types.js';

type CalendarView = 'day' | 'month' | 'year';

// The subset of controller behaviour the shared header + month/year grids use.
// Both the datetime and range controllers satisfy this structurally.
interface ViewControls {
  getState(): { view: CalendarView; viewYear: number; viewMonth: number; yearGroupStart: number };
  navigateMonth(delta: number): void;
  navigateYear(delta: number): void;
  navigateYearGroup(delta: number): void;
  setView(view: CalendarView): void;
  selectMonthView(month: number): void;
  selectYearView(year: number): void;
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

// View-aware header: the label drills down day → month → year, and the arrows
// step month/year/year-group depending on which view is showing.
function renderHeader(controller: ViewControls): HTMLElement {
  const adapter = defaultCalendarAdapter;
  const { view, viewYear, viewMonth, yearGroupStart } = controller.getState();
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
    outerPrev = navButton('«', '', () => {}, true);
    innerPrev = navButton('‹', 'Previous years', () => controller.navigateYearGroup(-1));
    innerNext = navButton('›', 'Next years', () => controller.navigateYearGroup(1));
    outerNext = navButton('»', '', () => {}, true);
  }

  const label = el('button', 'ndp-cal-label', { type: 'button', 'aria-live': 'polite', 'aria-label': 'Switch calendar view' });
  let primary: string;
  let secondary: string;
  if (view === 'day') {
    primary = `${adapter.bsMonthNames('ne')[viewMonth - 1]} ${adapter.toLocaleDigits(viewYear, 'ne')}`;
    secondary = formatDateValue(adapter.bsToAd(viewYear, viewMonth, 1), adapter, { mode: 'AD', format: 'MMMM YYYY', locale: 'en' });
    label.addEventListener('click', () => controller.setView('month'));
  } else if (view === 'month') {
    primary = adapter.toLocaleDigits(viewYear, 'ne');
    secondary = `${adapter.bsToAd(viewYear, 1, 1).getFullYear()} AD`;
    label.addEventListener('click', () => controller.setView('year'));
  } else {
    const end = Math.min(yearGroupStart + 11, adapter.maxSupportedYear);
    primary = `${adapter.toLocaleDigits(yearGroupStart, 'ne')} – ${adapter.toLocaleDigits(end, 'ne')}`;
    secondary = `${adapter.bsToAd(yearGroupStart, 1, 1).getFullYear()} – ${adapter.bsToAd(end, 1, 1).getFullYear()}`;
    label.addEventListener('click', () => controller.setView('day'));
  }
  label.appendChild(setText(el('div', 'ndp-cal-label-primary'), `${primary} ▾`));
  label.appendChild(setText(el('div', 'ndp-cal-label-secondary'), secondary));

  header.append(outerPrev, innerPrev, label, innerNext, outerNext);
  return header;
}

function renderWeekdays(): HTMLElement {
  const row = el('div', 'ndp-weekdays', { role: 'row' });
  defaultCalendarAdapter.bsWeekdayShort('ne').forEach((weekday) => row.appendChild(setText(el('div', 'ndp-weekday', { role: 'columnheader' }), weekday)));
  return row;
}

function renderMonthGrid(controller: ViewControls): HTMLElement {
  const adapter = defaultCalendarAdapter;
  const { viewMonth } = controller.getState();
  const grid = el('div', 'ndp-monthgrid', { role: 'grid' });
  adapter.bsMonthNames('ne').forEach((name, index) => {
    const month = index + 1;
    const selected = month === viewMonth;
    const btn = setText(el('button', `ndp-monthcell${selected ? ' is-selected' : ''}`, { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false' }), name);
    btn.appendChild(setText(el('span', 'ndp-monthcell-en'), adapter.bsMonthNames('en')[index]));
    btn.addEventListener('click', () => controller.selectMonthView(month));
    grid.appendChild(btn);
  });
  return grid;
}

function renderYearGrid(controller: ViewControls): HTMLElement {
  const adapter = defaultCalendarAdapter;
  const { viewYear, yearGroupStart } = controller.getState();
  const grid = el('div', 'ndp-yeargrid', { role: 'grid' });
  for (let i = 0; i < 12; i += 1) {
    const year = yearGroupStart + i;
    if (year < adapter.minSupportedYear || year > adapter.maxSupportedYear) {
      grid.appendChild(el('div', 'ndp-yearcell ndp-yearcell--empty', { role: 'gridcell' }));
      continue;
    }
    const selected = year === viewYear;
    const btn = el('button', `ndp-yearcell${selected ? ' is-selected' : ''}`, { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false' });
    btn.appendChild(setText(el('span', 'ndp-yearcell-bs'), adapter.toLocaleDigits(year, 'ne')));
    btn.appendChild(setText(el('span', 'ndp-yearcell-en'), String(adapter.bsToAd(year, 1, 1).getFullYear())));
    btn.addEventListener('click', () => controller.selectYearView(year));
    grid.appendChild(btn);
  }
  return grid;
}

// A segmented BS/AD switch with a swap glyph, styled as one input-group control.
function renderModeSwitch(mode: CalendarMode, toggle: () => void): HTMLElement {
  const sw = el('div', 'ndp-mode-switch', { role: 'group', 'aria-label': 'Calendar system' });
  sw.appendChild(setText(el('span', 'ndp-mode-icon', { 'aria-hidden': 'true' }), '⇄'));
  (['BS', 'AD'] as const).forEach((option) => {
    const active = mode === option;
    const btn = setText(el('button', `ndp-mode-opt${active ? ' is-active' : ''}`, { type: 'button', 'aria-pressed': active ? 'true' : 'false' }), option);
    btn.addEventListener('click', () => { if (mode !== option) toggle(); });
    sw.appendChild(btn);
  });
  return sw;
}

export function renderRangePanel(root: HTMLElement, controller: DateRangeController): void {
  const state = controller.getState();
  const adapter = defaultCalendarAdapter;
  const fmt = (value: DateValue) => formatDateValue(value.ad, adapter, { mode: state.mode, locale: state.mode === 'BS' ? 'ne' : 'en' });
  root.innerHTML = '';
  const panel = el('div', 'ndp-panel ndp-panel--range', { role: 'dialog', 'aria-label': 'Date range picker' });

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
  group.append(startField, setText(el('span', 'ndp-ig-arrow', { 'aria-hidden': 'true' }), '→'), endField, renderModeSwitch(state.mode, () => controller.toggleMode()));
  calCol.appendChild(group);

  // Guidance shown while picking a custom range, so clicking "Custom Range" has
  // an obvious effect instead of feeling like nothing happened.
  if (state.activePresetId === 'custom' || state.pendingStart) {
    const message = state.pendingStart ? 'अन्त्य मिति छान्नुहोस् · now pick the end date' : 'सुरु मिति छान्नुहोस् · pick the start date';
    calCol.appendChild(setText(el('div', 'ndp-range-hint'), message));
  }

  calCol.appendChild(renderHeader(controller));

  if (state.view === 'day') {
    calCol.appendChild(renderWeekdays());
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
      btn.appendChild(setText(el('span', 'ndp-cell-primary'), adapter.toLocaleDigits(cell.bs.day, 'ne')));
      btn.appendChild(setText(el('span', 'ndp-cell-secondary'), String(cell.ad.getDate())));
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

interface SpinnerConfig {
  label: string;
  value: string;
  onUp: () => void;
  onDown: () => void;
  onCommit: (raw: string) => void;
}

// A single vertical spinner: ▲ / editable value / ▼ / caption. Button-driven so
// the full-panel re-render on each change never steals focus mid-interaction;
// the value stays typeable and also responds to mouse-wheel for quick scrubbing.
function timeSpinner(config: SpinnerConfig): HTMLElement {
  const spin = el('div', 'ndp-spinner');
  const up = setText(el('button', 'ndp-spin-btn', { type: 'button', 'aria-label': `Increase ${config.label.toLowerCase()}`, tabindex: '-1' }), '▲');
  const down = setText(el('button', 'ndp-spin-btn', { type: 'button', 'aria-label': `Decrease ${config.label.toLowerCase()}`, tabindex: '-1' }), '▼');
  const input = el('input', 'ndp-spin-value', { type: 'text', inputmode: 'numeric', 'aria-label': config.label });
  input.value = config.value;
  up.addEventListener('click', config.onUp);
  down.addEventListener('click', config.onDown);
  input.addEventListener('change', () => config.onCommit(input.value));
  input.addEventListener('focus', () => input.select());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') { event.preventDefault(); config.onUp(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); config.onDown(); }
  });
  input.addEventListener('wheel', (event) => {
    event.preventDefault();
    (event.deltaY < 0 ? config.onUp : config.onDown)();
  }, { passive: false });
  spin.append(up, input, down, setText(el('div', 'ndp-spin-cap'), config.label));
  return spin;
}

function renderTimeControls(controller: DateTimeController): HTMLElement | null {
  const state = controller.getState();
  if (!state.time) return null;
  const { hour, minute, second } = state.time;
  const is12h = state.timeFormat === '12h';

  const panel = el('div', 'ndp-time-panel');
  panel.appendChild(setText(el('div', 'ndp-time-title'), 'समय / Time'));

  const spinners = el('div', 'ndp-time-spinners');
  spinners.appendChild(timeSpinner({
    label: 'Hour',
    value: pad2(is12h ? to12h(hour) : hour),
    onUp: () => controller.stepHour(1),
    onDown: () => controller.stepHour(-1),
    onCommit: (raw) => {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed)) return;
      const h24 = is12h ? (parsed % 12) + (meridiemOf(hour) === 'PM' ? 12 : 0) : parsed;
      controller.setTime(h24, minute, second);
    },
  }));
  spinners.appendChild(setText(el('span', 'ndp-spin-colon'), ':'));
  spinners.appendChild(timeSpinner({
    label: 'Min',
    value: pad2(minute),
    onUp: () => controller.stepMinute(1),
    onDown: () => controller.stepMinute(-1),
    onCommit: (raw) => {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed)) controller.setTime(hour, parsed, second);
    },
  }));
  if (is12h) {
    const meridiem = meridiemOf(hour);
    const seg = el('div', 'ndp-meridiem', { role: 'group', 'aria-label': 'AM or PM' });
    const am = setText(el('button', `ndp-meridiem-btn${meridiem === 'AM' ? ' is-active' : ''}`, { type: 'button', 'aria-pressed': meridiem === 'AM' ? 'true' : 'false' }), 'AM');
    const pm = setText(el('button', `ndp-meridiem-btn${meridiem === 'PM' ? ' is-active' : ''}`, { type: 'button', 'aria-pressed': meridiem === 'PM' ? 'true' : 'false' }), 'PM');
    am.addEventListener('click', () => { if (meridiemOf(hour) === 'PM') controller.toggleMeridiem(); });
    pm.addEventListener('click', () => { if (meridiemOf(hour) === 'AM') controller.toggleMeridiem(); });
    seg.append(am, pm);
    spinners.appendChild(seg);
  }
  panel.appendChild(spinners);

  const now = setText(el('button', 'ndp-time-now', { type: 'button' }), 'अहिले / Now');
  now.addEventListener('click', () => controller.setTimeToNow());
  panel.appendChild(now);
  return panel;
}

export function renderDateTimePanel(root: HTMLElement, controller: DateTimeController): void {
  const state = controller.getState();
  const adapter = defaultCalendarAdapter;
  root.innerHTML = '';
  const panel = el('div', 'ndp-panel ndp-panel--datetime', { role: 'dialog', 'aria-label': 'Date time picker' });
  const calCol = el('div', 'ndp-cal-col');
  calCol.appendChild(renderHeader(controller));

  if (state.view === 'day') {
    calCol.appendChild(renderWeekdays());
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
      btn.appendChild(setText(el('span', 'ndp-cell-primary'), adapter.toLocaleDigits(cell.bs.day, 'ne')));
      btn.appendChild(setText(el('span', 'ndp-cell-secondary'), String(cell.ad.getDate())));
      if (!disabled) btn.addEventListener('click', () => controller.selectDay(cell));
      grid.appendChild(btn);
    });
    calCol.appendChild(grid);
  } else if (state.view === 'month') {
    calCol.appendChild(renderMonthGrid(controller));
  } else {
    calCol.appendChild(renderYearGrid(controller));
  }

  const footer = el('div', 'ndp-button-row');
  const clear = setText(el('button', 'ndp-secondary', { type: 'button' }), 'Clear');
  const done = setText(el('button', 'ndp-apply', { type: 'button' }), 'Done');
  clear.addEventListener('click', () => controller.clear());
  done.addEventListener('click', () => controller.confirm());
  footer.append(clear, done);

  // Calendar and time sit side by side on one screen (stacks on narrow widths);
  // the action row spans the full width beneath both. The time panel only shows
  // in the day view — month/year views are just for navigating.
  const body = el('div', 'ndp-datetime-body');
  body.appendChild(calCol);
  const timeControls = state.view === 'day' ? renderTimeControls(controller) : null;
  if (timeControls) body.appendChild(timeControls);
  panel.append(body, footer);
  root.appendChild(panel);
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

export function positionPopup(trigger: HTMLElement, popup: HTMLElement, options: { opens?: 'left' | 'right' | 'center' | 'auto'; drops?: 'down' | 'up' | 'auto' } = {}): void {
  const rect = trigger.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const pos = computePopupPosition(rect, { width: popupRect.width || 360, height: popupRect.height || 360 }, { width: window.innerWidth, height: window.innerHeight }, options);
  popup.style.position = 'fixed';
  popup.style.top = `${pos.top}px`;
  popup.style.left = `${pos.left}px`;
}
