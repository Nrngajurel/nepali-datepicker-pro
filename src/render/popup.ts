// The popup's placement: a dropdown beside the field, or a bottom sheet on
// phone-width screens.
import { computePopupPosition } from '../position/index.js';

// ---- sheet + positioning ------------------------------------------------------

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
