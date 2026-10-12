import type { DateRangeController } from '../application/date-range-controller.js';
import { previewRange } from '../application/date-range-controller.js';
import { viewYearMonthOf } from '../application/calendar-view.js';
import { digits, monthNames, scriptLocale } from '../application/ui.js';
import { formatDateValue } from '../format/index.js';
import { fill } from '../i18n/strings.js';
import type { DateValue } from '../types.js';
import {
  announce,
  button,
  dayKey,
  el,
  footerRow,
  inRange,
  isSameDay,
  monthSubtitle,
  monthTitle,
  motionFor,
  navButton,
  otherYearLabel,
  panelShell,
  popSelection,
  renderDayGrid,
  renderHeader,
  renderModeSwitch,
  renderMonthGrid,
  renderYearGrid,
  resetRoot,
  restoreFocus,
  setText,
  spokenDate,
  uid,
  viewAnnouncement,
  wireDayKeyboard,
  wireRovingGrid,
} from './parts.js';
import { loaded } from './lazy.js';

const DAY_MS = 86_400_000;

// ---- range ------------------------------------------------------------------

// Year navigation header used while picking a month. The grid is months, so the
// inner ‹ › step whole years; the outer slots stay hidden so the header keeps
// the same 5-column layout (and full-width centered label) as the day header.
// Mode-aware: "Pick a Month" spans a BS or a Gregorian month depending on mode.
function renderMonthRangeHeader(controller: DateRangeController): HTMLElement {
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const { viewYear, mode, showSecondaryCalendar } = controller.getState();
  const header = el('div', 'ndp-cal-header');
  const label = el('div', 'ndp-cal-label ndp-cal-label--static');
  label.appendChild(setText(el('div', 'ndp-cal-label-primary'), `${digits(viewYear, mode, adapter, ui)} ${mode}`));
  if (showSecondaryCalendar) label.appendChild(setText(el('div', 'ndp-cal-label-secondary'), otherYearLabel(mode, adapter, ui, viewYear)));
  header.append(
    navButton('«', '', 'outer-prev', null),
    navButton('‹', ui.strings.previousYear, 'prev-year', () => controller.navigateYear(-1)),
    label,
    navButton('›', ui.strings.nextYear, 'next-year', () => controller.navigateYear(1)),
    navButton('»', '', 'outer-next', null),
  );
  return header;
}

// The 12-month grid for month mode: one click selects the whole month (BS or
// Gregorian, per the active mode), and the range spans that month's first →
// last day.
function renderMonthRangeGrid(controller: DateRangeController): HTMLElement {
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const state = controller.getState();
  const { viewYear, mode } = state;
  const names = monthNames(mode, adapter, ui, mode);
  const sel = state.range;
  const selStart = sel ? viewYearMonthOf(mode, adapter, sel.start.ad) : null;
  const grid = el('div', 'ndp-monthgrid ndp-monthgrid--range', { role: 'grid', 'aria-label': ui.strings.selectMonth });
  let row = el('div', 'ndp-gridrow', { role: 'row' });
  for (let index = 0; index < 12; index += 1) {
    const month = index + 1;
    const disabled = controller.isMonthDisabled(viewYear, month);
    const selected = !!selStart && selStart.year === viewYear && selStart.month === month;
    const classes = ['ndp-monthcell'];
    if (selected) classes.push('is-selected');
    if (disabled) classes.push('is-disabled');
    const btn = el('button', classes.join(' '), { type: 'button', role: 'gridcell', 'aria-selected': selected ? 'true' : 'false', 'data-ndp-field': `month-${month}` });
    btn.appendChild(document.createTextNode(names[index]));
    if (selected) btn.setAttribute('data-ndp-entry', '');
    if (state.showSecondaryCalendar) {
      const sub = monthSubtitle(mode, adapter, ui, viewYear, month).replace(/ \S+$/, '');
      btn.appendChild(setText(el('span', 'ndp-monthcell-en'), sub));
    }
    if (disabled) btn.setAttribute('aria-disabled', 'true');
    else btn.addEventListener('click', () => controller.selectMonth(viewYear, month));
    row.appendChild(btn);
    if (month % 3 === 0) {
      grid.appendChild(row);
      row = el('div', 'ndp-gridrow', { role: 'row' });
    }
  }
  wireRovingGrid(grid, 3);
  return grid;
}

export function renderRangePanel(root: HTMLElement, controller: DateRangeController): void {
  const state = controller.getState();
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const s = ui.strings;
  const options = controller.getOptions();
  const fmt = (value: DateValue) => formatDateValue(value.ad, adapter, { mode: state.mode, locale: scriptLocale(state.mode, ui.script) });
  const focusKey = resetRoot(root);
  const months = controller.visibleMonths();
  const twoMonths = months.length > 1;
  const panel = panelShell(root, `ndp-panel ndp-panel--range ndp-panel--compact${twoMonths ? ' ndp-panel--two-months' : ''}`, s.rangePicker, ui);

  const presets = controller.getPresets();
  const presetRail = el('div', 'ndp-presets', { role: 'group', 'aria-label': s.presetsLabel });
  presets.forEach((preset) => {
    const active = state.activePresetId === preset.id;
    if (preset.kind === 'range') {
      const btn = button(`ndp-preset${active ? ' is-active' : ''}`, preset.label, `preset-${preset.id}`, () => controller.selectPreset(preset.id));
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      presetRail.appendChild(btn);
      return;
    }
    const open = state.openSubmenuId === preset.id;
    const btn = button(`ndp-preset ndp-preset--submenu${active ? ' is-active' : ''}${open ? ' is-open' : ''}`, preset.label, `preset-${preset.id}`, () => {
      if (preset.id === 'custom') controller.startCustomRange();
      else if (preset.id === 'month') controller.startMonthSelect();
      else controller.toggleSubmenu(preset.id);
    });
    if (preset.id === 'custom' || preset.id === 'month') btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    else btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    presetRail.appendChild(btn);
    if (open) {
      const list = el('div', 'ndp-submenu-list');
      preset.items?.forEach((item) => {
        const itemActive = state.activePresetId === item.id;
        const itemBtn = button(`ndp-submenu-item${itemActive ? ' is-active' : ''}`, item.label, `preset-${item.id}`, () => controller.selectSubmenuItem(preset.id, item.id));
        itemBtn.setAttribute('aria-pressed', itemActive ? 'true' : 'false');
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
  const startText = state.pendingStart ? fmt(state.pendingStart) : state.range ? fmt(state.range.start) : s.start;
  const endText = state.pendingStart ? s.end : state.range ? fmt(state.range.end) : s.end;
  const length = state.range ? Math.round((state.range.end.ad.getTime() - state.range.start.ad.getTime()) / DAY_MS) + 1 : 0;
  const group = el('div', 'ndp-input-group');
  const startField = el('div', `ndp-ig-field${awaitingStart ? ' is-active' : ''}`);
  startField.append(setText(el('span', 'ndp-ig-label'), s.start), setText(el('span', 'ndp-ig-value'), startText));
  const endField = el('div', `ndp-ig-field${awaitingEnd ? ' is-active' : ''}`);
  const endLabel = el('span', 'ndp-ig-label');
  endLabel.append(s.end);
  if (length) endLabel.appendChild(setText(el('span', 'ndp-ig-span'), ` · ${fill(s.nights, { n: digits(length, state.mode, adapter, ui) })}`));
  endField.append(endLabel, setText(el('span', 'ndp-ig-value'), endText));
  group.append(startField, setText(el('span', 'ndp-ig-arrow', { 'aria-hidden': 'true' }), '→'), endField);
  if (state.allowModeToggle) group.appendChild(renderModeSwitch(state.mode, ui, () => controller.toggleMode()));
  calCol.appendChild(group);

  const monthUnit = state.selectionUnit === 'month';
  if (monthUnit) {
    calCol.appendChild(setText(el('div', 'ndp-range-hint'), s.pickMonthHint));
  } else if (state.activePresetId === 'custom' || state.pendingStart) {
    // Guidance shown while picking a custom day range, so clicking "Custom
    // Range" has an obvious effect instead of feeling like nothing happened.
    let message = state.pendingStart ? s.pickEnd : s.pickStart;
    if (state.pendingStart && options.maxRangeSpanDays) message += ` · ${fill(s.maxSpan, { n: options.maxRangeSpanDays })}`;
    else if (state.pendingStart && options.minRangeSpanDays) message += ` · ${fill(s.minSpan, { n: options.minRangeSpanDays })}`;
    calCol.appendChild(setText(el('div', 'ndp-range-hint'), message));
  }

  // With alwaysShowCalendars: false the presets stand alone until the user
  // asks for a custom range (or the value isn't one of the presets).
  const showCalendars = options.alwaysShowCalendars !== false
    || !presets.length
    || monthUnit
    || state.activePresetId === 'custom'
    || !!state.pendingStart
    || (!!state.range && !state.activePresetId);

  if (!showCalendars) {
    panel.classList.add('ndp-panel--presets-only');
  } else if (monthUnit) {
    calCol.appendChild(renderMonthRangeHeader(controller));
    calCol.appendChild(renderMonthRangeGrid(controller));
  } else if (state.view === 'day') {
    const container = el('div', 'ndp-months');
    const linked = options.linkedCalendars ?? true;
    const preview = previewRange(state);
    const today = controller.getToday();
    months.forEach((shown, index) => {
      const block = el('div', 'ndp-month');
      const labelId = uid('ndp-label');
      const headerOptions = !twoMonths
        ? { labelId }
        : index === 0
          ? { labelId, suffix: '-0', ...(linked ? { nextMonth: null, nextYear: null } : {}) }
          : linked
            ? { labelId, suffix: '-1', month: shown, prevMonth: null, prevYear: null, interactive: false }
            : {
              labelId,
              suffix: '-1',
              month: shown,
              interactive: false,
              prevMonth: () => controller.navigateMonthAt(1, -1),
              nextMonth: () => controller.navigateMonthAt(1, 1),
              prevYear: () => controller.navigateMonthAt(1, -12),
              nextYear: () => controller.navigateMonthAt(1, 12),
            };
      // Linked: the right month's › » page both months forward.
      if (twoMonths && linked && index === 1) {
        Object.assign(headerOptions, { nextMonth: () => controller.navigateMonth(1), nextYear: () => controller.navigateYear(1) });
      }
      block.appendChild(renderHeader(controller, headerOptions));
      block.appendChild(renderDayGrid({
        host: controller,
        cells: controller.buildMonthCells(shown.year, shown.month),
        labelId,
        multiselectable: true,
        cellState: (cell) => ({
          today: isSameDay(cell, today),
          inRange: inRange(preview, cell),
          rangeStart: isSameDay(preview?.start, cell),
          rangeEnd: isSameDay(preview?.end, cell),
          disabled: !controller.isSelectable(cell),
        }),
        onSelect: (cell) => controller.selectDay(cell),
        onPreview: (cell) => controller.hoverDay(cell),
      }));
      container.appendChild(block);
    });
    container.addEventListener('mouseleave', () => controller.hoverDay(null));
    const ends = state.range ? [dayKey(state.range.start.ad), dayKey(state.range.end.ad)] : state.pendingStart ? [dayKey(state.pendingStart.ad)] : [];
    const motion = motionFor(root, { index: state.viewYear * 12 + state.viewMonth, mode: state.mode, view: 'day', selection: ends.join('|') });
    if (motion.body) container.classList.add(motion.body);
    if (motion.selectionChanged) popSelection(container, ends);
    wireDayKeyboard(root, container, controller, [state.pendingStart, state.range?.end, state.range?.start, today]);
    calCol.appendChild(container);
  } else {
    calCol.appendChild(renderHeader(controller));
    const grid = state.view === 'month' ? renderMonthGrid(controller) : renderYearGrid(controller);
    const motion = motionFor(root, { index: state.viewYear * 12, mode: state.mode, view: state.view, selection: '' });
    if (motion.body) grid.classList.add(motion.body);
    calCol.appendChild(grid);
  }

  const times = loaded('timeControls')?.renderRangeTimeRow(controller) ?? null;
  if (times && showCalendars) calCol.appendChild(times);

  calCol.appendChild(footerRow(
    button('ndp-secondary', s.cancel, 'cancel', () => controller.cancel()),
    button('ndp-apply', s.apply, 'apply', () => controller.apply(), !state.range),
  ));

  panel.append(presetRail, calCol);
  root.appendChild(panel);

  announce(root, {
    month: state.view === 'day' && !monthUnit ? months.map((m) => monthTitle(state.mode, adapter, ui, m.year, m.month)).join(' – ') : viewAnnouncement(state.view, state.mode, adapter, ui, state.viewYear, state.viewMonth),
    selection: state.pendingStart
      ? fill(s.announceStart, { date: spokenDate(state.pendingStart.ad, state.mode, adapter, ui) })
      : state.range
        ? fill(s.announceRange, { start: spokenDate(state.range.start.ad, state.mode, adapter, ui), end: spokenDate(state.range.end.ad, state.mode, adapter, ui) })
        : '',
  });
  restoreFocus(root, focusKey);
}
