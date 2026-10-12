import type { YearPickerController } from '../application/year-picker-controller.js';
import { digits } from '../application/ui.js';
import { fill } from '../i18n/strings.js';
import {
  announce,
  el,
  motionFor,
  panelShell,
  renderHeader,
  renderYearGrid,
  resetRoot,
  restoreFocus,
} from './parts.js';

// ---- year ---------------------------------------------------------------------

export function renderYearPickerPanel(root: HTMLElement, controller: YearPickerController): void {
  const state = controller.getState();
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const focusKey = resetRoot(root);
  const panel = panelShell(root, 'ndp-panel ndp-panel--month ndp-panel--year', ui.strings.yearPicker, ui);
  const col = el('div', 'ndp-cal-col');
  // BS/AD is switched from the field's own switch, as on the date picker.
  col.appendChild(renderHeader(controller, { interactive: false }));
  const grid = renderYearGrid({
    ...controller,
    getState: () => ({ ...state, viewYear: state.selected ?? state.viewYear }),
  }, controller.yearBounds(), (year) => controller.isYearDisabled(year));
  const motion = motionFor(root, { index: 0, mode: state.mode, view: 'year', selection: String(state.selected ?? '') });
  if (motion.body) grid.classList.add(motion.body);
  col.appendChild(grid);
  panel.appendChild(col);
  root.appendChild(panel);
  announce(root, {
    month: ui.strings.selectYear,
    selection: state.selected != null ? fill(ui.strings.announceSelected, { date: digits(state.selected, state.mode, adapter, ui) }) : '',
  });
  restoreFocus(root, focusKey);
}
