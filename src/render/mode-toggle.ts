import type { UiConfig } from '../application/ui.js';
import type { CalendarMode } from '../types.js';

const MODE_TOGGLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>';

/** Paint the BS/AD switch: a single swap-icon button. Shared by the field's
 *  switch and the range panel's. Which calendar is active is shown next to
 *  the value in the field (the "BS"/"AD" suffix) and in the panel header. */
export function paintModeToggle(btn: HTMLElement, mode: CalendarMode, ui: UiConfig): void {
  const s = ui.strings;
  btn.classList.add('ndp-mode-toggle');
  btn.setAttribute('data-mode', mode);
  btn.setAttribute('aria-label', mode === 'BS' ? s.switchToAd : s.switchToBs);
  btn.title = mode === 'BS' ? s.switchToAd : s.switchToBs;
  if (!btn.firstElementChild) btn.innerHTML = MODE_TOGGLE_SVG;
}
