// Per-popup memory that has to outlive a re-render: the last announcement
// (so only what changed is read out) and the last motion state (so paging
// slides the right way). Its own module so the field can reset it on close
// without loading the panel renderers.
export const lastAnnounced = new WeakMap<HTMLElement, Record<string, string>>();
export const lastMotion = new WeakMap<HTMLElement, { index: number; mode: string; view: string; selection: string }>();

/** Forget the announcement baseline (the popup closed). */
export function resetAnnouncements(root: HTMLElement): void {
  lastMotion.delete(root);
  lastAnnounced.delete(root);
  const live = root.querySelector<HTMLElement>(':scope > .ndp-live');
  if (live) live.textContent = '';
}
