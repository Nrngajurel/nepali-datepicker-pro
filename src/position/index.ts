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

export interface PopupPosition {
  top: number;
  left: number;
  placementY: 'up' | 'down';
  placementX: 'left' | 'right' | 'center';
  /** Set when the popup is taller than the room on its side: cap it to this and scroll. */
  maxHeight: number | null;
  /** The anchor is scrolled entirely out of the viewport. */
  anchorHidden: boolean;
}

// The smallest height worth capping to; below this, overlapping the field
// beats a uselessly short scroll box.
const MIN_CAPPED_HEIGHT = 220;

export function computePopupPosition(anchor: AnchorRect, popup: PopupSize, viewport: { width: number; height: number }, options: {
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  gap?: number;
} = {}): PopupPosition {
  const gap = options.gap ?? 6;
  const spaceBelow = viewport.height - anchor.bottom - gap * 2;
  const spaceAbove = anchor.top - gap * 2;
  // Flip up only when it doesn't fit below and there's more room above.
  const placementY = options.drops === 'up' || (options.drops !== 'down' && spaceBelow < popup.height && spaceAbove > spaceBelow) ? 'up' : 'down';
  const room = placementY === 'down' ? spaceBelow : spaceAbove;
  const maxHeight = popup.height > room && room >= MIN_CAPPED_HEIGHT ? Math.floor(room) : null;
  const height = maxHeight ?? popup.height;
  let top = placementY === 'down' ? anchor.bottom + gap : anchor.top - height - gap;
  // Never off the top or bottom edge of the viewport.
  top = Math.max(gap, Math.min(top, viewport.height - height - gap));

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
    maxHeight,
    anchorHidden: anchor.bottom < 0 || anchor.top > viewport.height || anchor.right < 0 || anchor.left > viewport.width,
  };
}
