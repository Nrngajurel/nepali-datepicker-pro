// The popup's placement: a dropdown beside the field, or a bottom sheet on
// phone-width screens.
import { computePopupPosition } from '../position/index.js';
import { isSheetViewport } from './viewport.js';

export { isSheetViewport } from './viewport.js';

// ---- sheet + positioning ------------------------------------------------------


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
  popup.querySelector(':scope > .ndp-panel')?.toggleAttribute('aria-modal', sheet);
  if (sheet) {
    // Placement comes from the .ndp-sheet CSS (left/right/bottom: 0).
    popup.style.position = 'fixed';
    popup.style.top = '';
    popup.style.left = '';
    popup.style.maxHeight = '';
    popup.style.visibility = '';
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
  popup.style.maxHeight = '';
  void popup.offsetHeight;
  const rect = trigger.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const pos = computePopupPosition(rect, { width: popupRect.width, height: popupRect.height }, { width: window.innerWidth, height: window.innerHeight }, options);
  popup.style.top = `${pos.top}px`;
  popup.style.left = `${pos.left}px`;
  // Taller than the room on either side: cap it and let the panel scroll.
  popup.style.maxHeight = pos.maxHeight != null ? `${pos.maxHeight}px` : '';
  popup.classList.toggle('ndp-popup--capped', pos.maxHeight != null);
  popup.setAttribute('data-placement', pos.placementY);
  // The field scrolled out of view: hide the popup rather than float it over unrelated content.
  popup.style.visibility = pos.anchorHidden ? 'hidden' : '';
}

// ---- behaviour while open ---------------------------------------------------

// While the popup is a bottom sheet it is modal: the page behind is inert
// (when the popup is a direct child of <body>, the common case) and Tab
// cycles inside the sheet.
export function makeModal(portal: HTMLElement): { enter: () => void; leave: () => void } {
  let inerted: HTMLElement[] = [];
  return {
    enter() {
      if (!portal.classList.contains('ndp-sheet')) return;
      if (portal.parentElement === document.body) {
        inerted = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== portal && !node.hasAttribute('inert') && node.tagName !== 'SCRIPT');
        inerted.forEach((node) => node.setAttribute('inert', ''));
      }
      const entry = portal.querySelector<HTMLElement>('[data-ndp-entry]') ?? portal.querySelector<HTMLElement>('button:not([disabled]), [tabindex="0"]');
      entry?.focus({ preventScroll: true });
    },
    leave() {
      inerted.forEach((node) => node.removeAttribute('inert'));
      inerted = [];
    },
  };
}

export function trapTab(portal: HTMLElement, signal: AbortSignal): void {
  portal.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    if (e.key !== 'Tab' || !portal.classList.contains('ndp-sheet')) return;
    const focusables = Array.from(portal.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'))
      .filter((node) => node.tabIndex >= 0 && node.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, { signal });
}

// Horizontal swipe on the day / month grid pages the calendar on touch screens.
export function wireSwipe(portal: HTMLElement, signal: AbortSignal, page: (delta: number) => void): void {
  let start: { x: number; y: number } | null = null;
  portal.addEventListener('touchstart', (event) => {
    const e = event as TouchEvent;
    const target = e.target as HTMLElement;
    start = e.touches.length === 1 && target.closest('.ndp-grid, .ndp-monthgrid') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true, signal });
  portal.addEventListener('touchend', (event) => {
    const e = event as TouchEvent;
    if (!start || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 2) page(dx < 0 ? 1 : -1);
  }, { passive: true, signal });
}
