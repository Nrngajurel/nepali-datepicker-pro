// Phone-width viewports get the popup as a bottom sheet (full width, docked to
// the bottom, scrollable, over a dimmed backdrop) instead of a dropdown pinned
// under the input — a dropdown taller than the screen gets cut off on a phone.
// Matches the `max-width: 560px` breakpoint in theme.css.
export function isSheetViewport(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') return window.matchMedia('(max-width: 560px)').matches;
  return window.innerWidth <= 560;
}
