// The vanilla-JS public surface. Each picker's mount lives in its own module
// (so a bundle carries only the pickers it uses); autoInit wires the
// data-* attribute pickers.
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatDateValue, formatRange } from '../format/index.js';
import type { DateRangePickerOptions, DateRangeResult, DateTimePickerOptions, DateTimeResult, MonthPickerOptions, PickerTheme, ValueFormat } from '../types.js';
import { mountDateTimePicker } from './mount-date.js';
import { mountDateRangePicker } from './mount-range.js';
import { mountMonthPicker } from './mount-month.js';
import { isMounted } from './shell.js';

export { mountDateTimePicker } from './mount-date.js';
export { mountDateRangePicker } from './mount-range.js';
export { mountMonthPicker } from './mount-month.js';
export { mountYearPicker } from './mount-year.js';
export { mountTimePicker } from './mount-time.js';
export { mountMultiDatePicker } from './mount-multi.js';
export { setDefaults, regional } from './shell.js';
export { isSheetViewport } from '../render/popup.js';

// Options expressible as plain data-* attributes, shared by every picker.
function dataOptions(ds: DOMStringMap): Partial<DateTimePickerOptions & DateRangePickerOptions & MonthPickerOptions> {
  const valueFormat = ds.valueFormat as ValueFormat | undefined;
  const flag = (value?: string) => (value === undefined ? undefined : value !== 'false');
  return {
    valueFormat: valueFormat || undefined,
    submitName: ds.submitName || undefined,
    altField: ds.altField || undefined,
    language: (ds.language as 'en' | 'ne' | 'bilingual' | undefined) || undefined,
    theme: (ds.theme as PickerTheme | undefined) || undefined,
    mode: ds.mode === 'AD' || ds.mode === 'BS' ? ds.mode : undefined,
    displayFormat: ds.displayFormat || undefined,
    minDate: ds.minDate || undefined,
    maxDate: ds.maxDate || undefined,
    inline: flag(ds.inline),
    required: flag(ds.required),
  };
}

const definedOnly = <T extends object>(obj: T): Partial<T> => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

export function autoInit(root: ParentNode = document): void {
  root.querySelectorAll<HTMLInputElement>('[data-nepali-datepicker]').forEach((input) => isMounted(input) || mountDateTimePicker(input, definedOnly({
    withTime: input.dataset.withTime === 'true',
    withSeconds: input.dataset.withSeconds === 'true' || undefined,
    timeFormat: input.dataset.timeFormat === '12h' ? '12h' as const : input.dataset.timeFormat === '24h' ? '24h' as const : undefined,
    minuteStep: input.dataset.minuteStep ? Number(input.dataset.minuteStep) : undefined,
    ...dataOptions(input.dataset),
  })));
  root.querySelectorAll<HTMLInputElement>('[data-nepali-daterange]').forEach((input) => isMounted(input) || mountDateRangePicker(input, definedOnly({
    fiscalStartMonth: input.dataset.fiscalStartMonth ? Number(input.dataset.fiscalStartMonth) : undefined,
    numberOfMonths: input.dataset.numberOfMonths === '2' ? 2 as const : undefined,
    ...dataOptions(input.dataset),
  })));
  root.querySelectorAll<HTMLInputElement>('[data-nepali-monthpicker]').forEach((input) => isMounted(input) || mountMonthPicker(input, definedOnly({
    ...dataOptions(input.dataset),
  }) as MonthPickerOptions));
}

export function formatBoundRange(value: DateRangeResult): string {
  return formatRange(value.start, value.end, defaultCalendarAdapter, { mode: 'BS', locale: 'ne' });
}

export function formatBoundDate(value: DateTimeResult): string {
  return formatDateValue(value.ad, defaultCalendarAdapter, { mode: 'BS', locale: 'ne' });
}

