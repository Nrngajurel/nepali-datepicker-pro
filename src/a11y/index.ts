export type GridKeyAction =
  | 'prev-day'
  | 'next-day'
  | 'prev-week'
  | 'next-week'
  | 'prev-month'
  | 'next-month'
  | 'prev-year'
  | 'next-year'
  | 'week-start'
  | 'week-end'
  | 'select'
  | 'close'
  | null;

export function mapGridKey(event: Pick<KeyboardEvent, 'key' | 'shiftKey'>): GridKeyAction {
  if (event.key === 'ArrowLeft') return 'prev-day';
  if (event.key === 'ArrowRight') return 'next-day';
  if (event.key === 'ArrowUp') return 'prev-week';
  if (event.key === 'ArrowDown') return 'next-week';
  if (event.key === 'PageUp') return event.shiftKey ? 'prev-year' : 'prev-month';
  if (event.key === 'PageDown') return event.shiftKey ? 'next-year' : 'next-month';
  if (event.key === 'Home') return 'week-start';
  if (event.key === 'End') return 'week-end';
  if (event.key === 'Enter' || event.key === ' ') return 'select';
  if (event.key === 'Escape') return 'close';
  return null;
}
