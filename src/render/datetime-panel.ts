import type { DateTimeController } from '../application/date-time-controller.js';
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
  popSelection,
  renderDayGrid,
  renderHeader,
  renderMonthGrid,
  renderYearGrid,
  resetRoot,
  restoreFocus,
  spokenDate,
  uid,
  viewAnnouncement,
  wireDayKeyboard,
} from './parts.js';
import { isSheetViewport } from './viewport.js';
import { loaded } from './lazy.js';

// ---- date / date-time ---------------------------------------------------------

export function renderDateTimePanel(root: HTMLElement, controller: DateTimeController): void {
  const state = controller.getState();
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const s = ui.strings;
  const options = controller.getOptions();
  const focusKey = resetRoot(root);
  const dateOnly = !state.time;
  const panel = panelShell(root, `ndp-panel ndp-panel--datetime${dateOnly ? ' ndp-panel--date-only' : ''}`, s.datePicker, ui);
  const buttons = options.showButtonPanel ?? {};
  const showClear = buttons.clear ?? !dateOnly;
  const showToday = buttons.today !== false;

  const selection = state.selected ? fill(s.announceSelected, { date: spokenDate(state.selected.ad, state.mode, adapter, ui) }) : '';

  // On a phone (bottom sheet) a date-time pick is two steps — calendar, then
  // time — instead of one long scroll. Wider screens keep both side by side.
  const stepped = !dateOnly && !options.inline && isSheetViewport();
  // The time module is loaded alongside this one when the picker has a time.
  const time = loaded('timeControls');
  if (time && stepped && state.panelStep === 'time' && state.selected) {
    panel.classList.add('ndp-panel--time-step');
    panel.appendChild(time.renderTimeStep(controller));
    panel.appendChild(footerRow(
      ...(showClear ? [button('ndp-secondary', s.clear, 'clear', () => controller.clear())] : []),
      button('ndp-apply', s.done, 'done', () => controller.confirm()),
    ));
    root.appendChild(panel);
    announce(root, { month: '', selection });
    restoreFocus(root, focusKey ?? 'field:wheel-hour');
    return;
  }

  const calCol = el('div', 'ndp-cal-col');
  const labelId = uid('ndp-label');
  calCol.appendChild(renderHeader(controller, { labelId }));

  // Small "Today" shortcut, tucked above the grid rather than taking a full
  // footer row — jumps back regardless of which month/year/view is showing,
  // mirroring the time panel's "Now" button.
  if (showToday) {
    const todayRow = el('div', 'ndp-today-row');
    todayRow.appendChild(button('ndp-today-btn', s.today, 'today', () => controller.goToday()));
    calCol.appendChild(todayRow);
  }

  if (state.view === 'day') {
    const todayBs = adapter.todayBs();
    const today = controller.cellForBs(todayBs.year, todayBs.month, todayBs.day);
    const grid = renderDayGrid({
      host: controller,
      cells: controller.buildMonthCells(state.viewYear, state.viewMonth),
      labelId,
      cellState: (cell) => ({
        selected: isSameDay(cell, state.selected),
        today: isSameDay(cell, today),
        disabled: controller.isDisabled(cell),
      }),
      onSelect: (cell) => controller.selectDay(cell),
    });
    wireDayKeyboard(root, grid, controller, [state.selected, today]);
    const selectedKey = state.selected ? dayKey(state.selected.ad) : '';
    const motion = motionFor(root, { index: state.viewYear * 12 + state.viewMonth, mode: state.mode, view: 'day', selection: selectedKey });
    if (motion.body) grid.classList.add(motion.body);
    if (motion.selectionChanged) popSelection(grid, [selectedKey]);
    calCol.appendChild(grid);
  } else {
    const grid = state.view === 'month' ? renderMonthGrid(controller) : renderYearGrid(controller);
    const motion = motionFor(root, { index: state.viewYear * 12, mode: state.mode, view: state.view, selection: state.selected ? dayKey(state.selected.ad) : '' });
    if (motion.body) grid.classList.add(motion.body);
    calCol.appendChild(grid);
  }

  // Calendar and time sit side by side on one screen (stacks on narrow widths);
  // the action row spans the full width beneath both. The time panel only shows
  // in the day view — month/year views are just for navigating.
  const body = el('div', 'ndp-datetime-body');
  body.appendChild(calCol);
  const timeControls = time && state.view === 'day' && !stepped ? time.renderTimeControls(controller) : null;
  if (timeControls) body.appendChild(timeControls);
  panel.appendChild(body);

  // Footer: with a time, Clear + Done (the panel stays open while the time is
  // set). The phone date step offers Next (to the time step) instead of Done.
  // Date-only pickers close on pick, so they show a footer only when
  // showButtonPanel asks for Clear / Close.
  if (timeControls) {
    panel.appendChild(footerRow(
      ...(showClear ? [button('ndp-secondary', s.clear, 'clear', () => controller.clear())] : []),
      button('ndp-apply', s.done, 'done', () => controller.confirm()),
    ));
  } else if (stepped && state.view === 'day') {
    panel.appendChild(footerRow(
      ...(showClear ? [button('ndp-secondary', s.clear, 'clear', () => controller.clear())] : []),
      button('ndp-apply', s.nextToTime, 'next-step', () => controller.setPanelStep('time'), !state.selected),
    ));
  } else if (dateOnly && (buttons.clear || buttons.close)) {
    panel.appendChild(footerRow(
      ...(buttons.clear ? [button('ndp-secondary', s.clear, 'clear', () => controller.clear())] : []),
      ...(buttons.close ? [button('ndp-apply', s.close, 'close', () => controller.hide())] : []),
    ));
  }

  root.appendChild(panel);
  announce(root, { month: viewAnnouncement(state.view, state.mode, adapter, ui, state.viewYear, state.viewMonth), selection });
  restoreFocus(root, focusKey);
}
