import type { MultiDateController } from '../application/multi-date-controller.js';
import { viewYearMonthOf } from '../application/calendar-view.js';
import { digits } from '../application/ui.js';
import { fill } from '../i18n/strings.js';
import {
  announce,
  button,
  dayKey,
  el,
  footerRow,
  isSameDay,
  motionFor,
  panelShell,
  renderDayGrid,
  renderHeader,
  renderMonthGrid,
  renderYearGrid,
  resetRoot,
  restoreFocus,
  setText,
  uid,
  viewAnnouncement,
  wireDayKeyboard,
} from './parts.js';

// ---- multiple dates ---------------------------------------------------------------

export function renderMultiDatePanel(root: HTMLElement, controller: MultiDateController): void {
  const inner = controller.inner();
  const state = inner.getState();
  const adapter = inner.getAdapter();
  const ui = inner.getUi();
  const s = ui.strings;
  const picked = controller.getState().selected;
  const focusKey = resetRoot(root);
  const panel = panelShell(root, 'ndp-panel ndp-panel--datetime ndp-panel--date-only ndp-panel--multi', s.datePicker, ui);
  const calCol = el('div', 'ndp-cal-col');
  const labelId = uid('ndp-label');
  calCol.appendChild(renderHeader(inner, { labelId }));
  const todayRow = el('div', 'ndp-today-row');
  todayRow.appendChild(setText(el('span', 'ndp-multi-count', { 'aria-hidden': 'true' }), picked.length ? fill(s.datesSelected, { n: digits(picked.length, state.mode, adapter, ui) }) : ''));
  todayRow.appendChild(button('ndp-today-btn', s.today, 'today', () => {
    const today = viewYearMonthOf(state.mode, adapter, new Date());
    inner.navigateMonth((today.year * 12 + today.month) - (state.viewYear * 12 + state.viewMonth));
    if (state.view !== 'day') inner.setView('day');
  }));
  calCol.appendChild(todayRow);
  if (state.view === 'day') {
    const todayBs = adapter.todayBs();
    const today = inner.cellForBs(todayBs.year, todayBs.month, todayBs.day);
    const grid = renderDayGrid({
      host: inner,
      cells: inner.buildMonthCells(state.viewYear, state.viewMonth),
      labelId,
      multiselectable: true,
      cellState: (cell) => ({ selected: controller.isSelected(cell), today: isSameDay(cell, today), disabled: inner.isDisabled(cell) }),
      onSelect: (cell) => controller.toggleDay(cell),
    });
    wireDayKeyboard(root, grid, inner, [picked[picked.length - 1], today]);
    const keys = picked.map((v) => dayKey(v.ad));
    const motion = motionFor(root, { index: state.viewYear * 12 + state.viewMonth, mode: state.mode, view: 'day', selection: keys.join('|') });
    if (motion.body) grid.classList.add(motion.body);
    calCol.appendChild(grid);
  } else {
    calCol.appendChild(state.view === 'month' ? renderMonthGrid(inner) : renderYearGrid(inner));
  }
  panel.appendChild(calCol);
  panel.appendChild(footerRow(
    button('ndp-secondary', s.clear, 'clear', () => controller.clear(), !picked.length),
    button('ndp-apply', s.done, 'done', () => controller.hide()),
  ));
  root.appendChild(panel);
  announce(root, {
    month: viewAnnouncement(state.view, state.mode, adapter, ui, state.viewYear, state.viewMonth),
    selection: picked.length ? fill(s.datesSelected, { n: picked.length }) : '',
  });
  restoreFocus(root, focusKey);
}
