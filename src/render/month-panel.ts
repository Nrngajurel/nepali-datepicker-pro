import type { MonthPickerController } from '../application/month-picker-controller.js';
import { digits, monthNames } from '../application/ui.js';
import { fill } from '../i18n/strings.js';
import {
  announce,
  el,
  motionFor,
  panelShell,
  renderHeader,
  renderMonthGrid,
  renderYearGrid,
  resetRoot,
  restoreFocus,
  viewAnnouncement,
} from './parts.js';

// ---- month --------------------------------------------------------------------

export function renderMonthPickerPanel(root: HTMLElement, controller: MonthPickerController): void {
  const state = controller.getState();
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const focusKey = resetRoot(root);
  const panel = panelShell(root, 'ndp-panel ndp-panel--month', ui.strings.monthPicker, ui);
  const col = el('div', 'ndp-cal-col');
  col.appendChild(renderHeader(controller));
  const grid = state.view === 'year' ? renderYearGrid(controller, controller.yearBounds()) : renderMonthGrid(controller);
  const motion = motionFor(root, { index: state.viewYear, mode: 'BS', view: state.view, selection: '' });
  if (motion.body) grid.classList.add(motion.body);
  col.appendChild(grid);
  panel.appendChild(col);
  root.appendChild(panel);
  announce(root, {
    month: viewAnnouncement(state.view === 'year' ? 'year' : 'month', 'BS', adapter, ui, state.viewYear, state.viewMonth),
    selection: state.selected ? fill(ui.strings.announceSelected, { date: `${monthNames('BS', adapter, ui, 'BS')[state.selected.month - 1]} ${digits(state.selected.year, 'BS', adapter, ui)}` }) : '',
  });
  restoreFocus(root, focusKey);
}
