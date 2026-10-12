// The vanilla-JS public surface. Each picker's mount lives in its own module
// (so a bundle carries only the pickers it uses); autoInit wires the
// data-* attribute pickers.
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatDateValue, formatRange } from '../format/index.js';
import type { DateRangeResult, DateTimeResult } from '../types.js';
import { mountDateTimePicker } from './mount-date.js';
import { mountDateRangePicker } from './mount-range.js';
import { mountMonthPicker } from './mount-month.js';
import { scanFields } from './scan.js';

export { mountDateTimePicker } from './mount-date.js';
export { mountDateRangePicker } from './mount-range.js';
export { mountMonthPicker } from './mount-month.js';
export { mountYearPicker } from './mount-year.js';
export { mountTimePicker } from './mount-time.js';
export { mountMultiDatePicker } from './mount-multi.js';
export { setDefaults, regional } from './shell.js';
export { isSheetViewport } from '../render/viewport.js';

export function autoInit(root: ParentNode = document): void {
  scanFields(root, { date: mountDateTimePicker, range: mountDateRangePicker, month: mountMonthPicker });
}

export function formatBoundRange(value: DateRangeResult): string {
  return formatRange(value.start, value.end, defaultCalendarAdapter, { mode: 'BS', locale: 'ne' });
}

export function formatBoundDate(value: DateTimeResult): string {
  return formatDateValue(value.ad, defaultCalendarAdapter, { mode: 'BS', locale: 'ne' });
}

