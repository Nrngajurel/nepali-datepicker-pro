// `data-*` attribute pickers: find the fields and mount them.
import type { DateRangePickerOptions, DateTimePickerOptions, MonthPickerOptions, PickerTheme, ValueFormat } from '../types.js';
import { isMounted } from './shell.js';

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

/** Mount a picker on every `data-nepali-*` field under `root` that has none yet,
 *  for the pickers given (the core <script> build passes date and range only). */
export function scanFields(root: ParentNode, mounts: {
  date: typeof import('./mount-date.js').mountDateTimePicker;
  range: typeof import('./mount-range.js').mountDateRangePicker;
  month?: typeof import('./mount-month.js').mountMonthPicker;
}): void {
  root.querySelectorAll<HTMLInputElement>('[data-nepali-datepicker]').forEach((input) => isMounted(input) || mounts.date(input, definedOnly({
    withTime: input.dataset.withTime === 'true',
    withSeconds: input.dataset.withSeconds === 'true' || undefined,
    timeFormat: input.dataset.timeFormat === '12h' ? '12h' as const : input.dataset.timeFormat === '24h' ? '24h' as const : undefined,
    minuteStep: input.dataset.minuteStep ? Number(input.dataset.minuteStep) : undefined,
    ...dataOptions(input.dataset),
  })));
  root.querySelectorAll<HTMLInputElement>('[data-nepali-daterange]').forEach((input) => isMounted(input) || mounts.range(input, definedOnly({
    fiscalStartMonth: input.dataset.fiscalStartMonth ? Number(input.dataset.fiscalStartMonth) : undefined,
    numberOfMonths: input.dataset.numberOfMonths === '2' ? 2 as const : undefined,
    ...dataOptions(input.dataset),
  })));
  const { month } = mounts;
  if (month) root.querySelectorAll<HTMLInputElement>('[data-nepali-monthpicker]').forEach((input) => isMounted(input) || month(input, definedOnly({
    ...dataOptions(input.dataset),
  }) as MonthPickerOptions));
}

