import type { TimePickerController } from '../application/time-picker-controller.js';
import {
  announce,
  button,
  el,
  pad2,
  panelShell,
  resetRoot,
  restoreFocus,
} from './parts.js';
import { renderTimeControls } from './time.js';

// ---- time ---------------------------------------------------------------------

// The field already takes typed time, so the panel is just the wheels (each a
// keyboard listbox) and one footer: Now on the left, Clear / Done on the right.
export function renderTimePickerPanel(root: HTMLElement, controller: TimePickerController): void {
  const inner = controller.inner();
  const ui = controller.getUi();
  const s = ui.strings;
  const focusKey = resetRoot(root);
  const panel = panelShell(root, 'ndp-panel ndp-panel--time', s.timePicker, ui);
  const controls = renderTimeControls(inner, controller.getOptions().timeInputStyle !== 'dropdown')!;
  controls.classList.add('ndp-time-panel--standalone');
  const now = controls.querySelector('.ndp-time-now');
  panel.appendChild(controls);
  const footer = el('div', 'ndp-time-footer');
  if (now) footer.appendChild(now);
  footer.append(
    button('ndp-secondary', s.clear, 'clear', () => { controller.clear(); controller.hide(); }),
    button('ndp-apply', s.done, 'done', () => controller.confirm()),
  );
  panel.appendChild(footer);
  root.appendChild(panel);
  const t = inner.getState().time!;
  announce(root, { month: '', selection: `${pad2(t.hour)}:${pad2(t.minute)}` });
  // Keep focus where it is on open (someone may be typing in the field);
  // the phone sheet moves focus in itself (see makeModal in autoinit/shell).
  restoreFocus(root, focusKey);
}
