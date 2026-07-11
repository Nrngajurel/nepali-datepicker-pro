export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface PopupSize {
  width: number;
  height: number;
}

export function computePopupPosition(anchor: AnchorRect, popup: PopupSize, viewport: { width: number; height: number }, options: {
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  gap?: number;
} = {}): { top: number; left: number; placementY: 'up' | 'down'; placementX: 'left' | 'right' | 'center' } {
  const gap = options.gap ?? 6;
  const spaceBelow = viewport.height - anchor.bottom;
  const spaceAbove = anchor.top;
  const placementY = options.drops === 'up' || (options.drops !== 'down' && spaceBelow < popup.height && spaceAbove > spaceBelow) ? 'up' : 'down';
  const top = placementY === 'down' ? anchor.bottom + gap : Math.max(gap, anchor.top - popup.height - gap);

  let placementX: 'left' | 'right' | 'center' = options.opens === 'left' || options.opens === 'right' || options.opens === 'center' ? options.opens : 'left';
  if (options.opens === 'auto' || !options.opens) {
    if (anchor.left + popup.width <= viewport.width) placementX = 'left';
    else if (anchor.right - popup.width >= 0) placementX = 'right';
    else placementX = 'center';
  }

  const rawLeft = placementX === 'right'
    ? anchor.right - popup.width
    : placementX === 'center'
      ? anchor.left + anchor.width / 2 - popup.width / 2
      : anchor.left;

  return {
    top,
    left: Math.max(gap, Math.min(rawLeft, viewport.width - popup.width - gap)),
    placementY,
    placementX,
  };
}
