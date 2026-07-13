export type CalendarMode = 'BS' | 'AD';
export type PickerLocale = 'ne' | 'en';
export type DateValueFormat = 'iso' | 'iso-bs' | 'timestamp' | 'date-object';
/** How the machine ("server") value is shaped — independent of the display
 *  calendar/format. A preset, or a token string in an explicit calendar. */
export type ValueFormat = DateValueFormat | { calendar: CalendarMode; format: string };
export type TimeInputStyle = 'spinner' | 'dropdown';

export interface BsDate {
  year: number;
  month: number;
  day: number;
}

export interface TimeValue {
  hour: number;
  minute: number;
  second?: number;
}

export interface DateValue {
  readonly ad: Date;
  readonly bs: BsDate;
}

export interface DateRange {
  readonly start: DateValue;
  readonly end: DateValue;
}

export interface CalendarAdapter {
  adToBs(adDate: Date): BsDate;
  bsToAd(year: number, month: number, day: number): Date;
  daysInBsMonth(year: number, month: number): number;
  todayBs(): BsDate;
  bsMonthNames(locale: PickerLocale): string[];
  bsWeekdayShort(locale: PickerLocale): string[];
  toLocaleDigits(n: number | string, locale: PickerLocale): string;
  minSupportedYear: number;
  maxSupportedYear: number;
}

export type DateMathUnit = 'day' | 'month' | 'year';

export interface DateMath {
  add(date: Date, amount: number, unit: DateMathUnit): Date;
  diff(a: Date, b: Date, unit: 'day'): number;
  format(date: Date, format: string): string;
  parse(value: Date | string | number, format?: string): Date | null;
  startOf(date: Date, unit: DateMathUnit): Date;
  endOf(date: Date, unit: DateMathUnit): Date;
  daysInMonth(year: number, month: number): number;
}

export interface BeforeShowDayResult {
  selectable: boolean;
  cssClass?: string;
  tooltip?: string;
}

export interface DateTimeResult {
  ad: Date;
  bs: BsDate;
  time?: { hour: number; minute: number; second: number };
  formatted: string;
  /** Machine value per `valueFormat` (default AD ISO) — the "server" value. */
  value: string | number | Date;
}

export interface DateTimePickerOptions {
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  locale?: PickerLocale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  value?: Date | null;
  defaultValue?: Date | null;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
  beforeShowDay?: (date: Date) => BeforeShowDayResult;
  withTime?: boolean;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  minTime?: TimeValue;
  maxTime?: TimeValue;
  disabledTimes?: (h: number, m: number) => boolean;
  defaultTime?: TimeValue;
  timeInputStyle?: TimeInputStyle;
  displayFormat?: string;
  valueFormat?: ValueFormat;
  altField?: string | HTMLElement;
  altFormat?: ValueFormat;
  submitName?: string;
  inline?: boolean;
  appendTo?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  showButtonPanel?: { today?: boolean; clear?: boolean; close?: boolean };
  closeOnSelect?: boolean;
  clearable?: boolean;
  allowInput?: boolean;
  onChange?: (value: DateTimeResult) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onChangeMonthYear?: (year: number, month: number) => void;
  adapter?: CalendarAdapter;
  dateMath?: DateMath;
}

export interface RangePickerLocale {
  format?: string;
  separator?: string;
  applyLabel?: string;
  cancelLabel?: string;
  customRangeLabel?: string;
  weekLabel?: string;
  daysOfWeek?: string[];
  monthNames?: string[];
  firstDay?: number;
}

export interface PresetContext {
  today: Date;
  fiscalStartMonth: number;
  adapter: CalendarAdapter;
  dateMath: DateMath;
}

export interface PresetDefinition {
  id: string;
  label: string;
  kind: 'range' | 'submenu';
  resolve?: (ctx: PresetContext) => { start: Date; end: Date };
  items?: PresetDefinition[];
}

export interface DateRangeResult {
  start: Date;
  end: Date;
  startBs: BsDate;
  endBs: BsDate;
  formatted: string;
  /** Machine values per `valueFormat` (default AD ISO). `value` is the pair
   *  joined by a comma. */
  startValue: string | number | Date;
  endValue: string | number | Date;
  value: string;
}

export interface DateRangePickerOptions {
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  locale?: RangePickerLocale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  value?: { start: Date; end: Date } | null;
  defaultValue?: { start: Date; end: Date } | null;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
  maxRangeSpanDays?: number | null;
  presets?: PresetDefinition[] | 'default' | false;
  ranges?: Record<string, [Date, Date]>;
  defaultPresetId?: string | null;
  fiscalStartMonth?: number;
  fiscalYearLookback?: number;
  numberOfMonths?: 1 | 2;
  linkedCalendars?: boolean;
  autoApply?: boolean;
  alwaysShowCalendars?: boolean;
  autoUpdateInput?: boolean;
  allowInput?: boolean;
  valueFormat?: ValueFormat;
  altField?: string | HTMLElement | { start: string | HTMLElement; end: string | HTMLElement };
  altFormat?: ValueFormat;
  submitName?: string | { start: string; end: string };
  appendTo?: string | HTMLElement;
  container?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  displayFormat?: string;
  clearable?: boolean;
  onApply?: (range: DateRangeResult) => void;
  onChange?: (partial: { start?: Date; end?: Date }) => void;
  onOpen?: () => void;
  onClose?: () => void;
  adapter?: CalendarAdapter;
  dateMath?: DateMath;
}

export interface MonthValue {
  year: number;
  month: number;
}

export interface MonthPickerOptions {
  locale?: PickerLocale;
  value?: MonthValue | null;
  defaultValue?: MonthValue | null;
  clearable?: boolean;
  allowInput?: boolean;
  displayFormat?: string;
  valueFormat?: ValueFormat;
  altField?: string | HTMLElement;
  altFormat?: ValueFormat;
  submitName?: string;
  minYear?: number;
  maxYear?: number;
  appendTo?: string | HTMLElement;
  container?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  onChange?: (value: MonthResult) => void;
  onOpen?: () => void;
  onClose?: () => void;
  adapter?: CalendarAdapter;
}

export interface MonthResult {
  year: number;
  month: number;
  bs: MonthValue;
  monthName: string;
  /** First day of the selected BS month as an AD Date (report range start). */
  start: Date;
  /** Last day of the selected BS month as an AD Date (report range end). */
  end: Date;
  formatted: string;
  /** Machine value per `valueFormat` (default AD ISO, the month's first day). */
  value: string | number | Date;
}

export interface PickerInstance<TValue, TOptions> {
  getState(): unknown;
  getValue(): TValue | null;
  setValue(value: TValue | null): void;
  show(): void;
  hide(): void;
  update(patch: Partial<TOptions>): void;
  destroy(): void;
  onChange(cb: (value: TValue) => void): () => void;
}
