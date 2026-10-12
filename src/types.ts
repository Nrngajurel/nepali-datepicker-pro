import type { PickerStrings, UiLanguage } from './i18n/strings.js';

export type { PickerStrings, UiLanguage };
export type CalendarMode = 'BS' | 'AD';
export type PickerLocale = 'ne' | 'en';
/** Which script calendar names and numbers are written in. `'auto'` (default):
 *  BS in Devanagari, AD in Latin. `'latin'`: BS too in Latin (Baisakh 2082).
 *  `'devanagari'`: AD too in Devanagari (जनवरी २०२५). */
export type CalendarScript = 'auto' | 'devanagari' | 'latin';
export type PickerTheme = 'light' | 'dark' | 'auto';
export type PickerDensity = 'compact' | 'comfortable' | 'touch';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
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

/** What `dayCellProps` can say about one day cell. */
export interface DayCellProps {
  /** Show the day but don't let it be picked. */
  disabled?: boolean;
  /** Extra class(es) on the cell button. */
  className?: string;
  /** Tooltip, also read by screen readers. */
  title?: string;
  /** A short badge under the day number (e.g. a price or a count). */
  badge?: string;
  /** Mark as a holiday: red, like Saturdays. */
  holiday?: boolean;
}

/** A holiday or event shown on the calendar as a dot (events) or in red
 *  (holidays), with its label in the tooltip and the cell's accessible name. */
export interface CalendarEvent {
  /** A Date, or a `YYYY-MM-DD` string in `calendar`. */
  date: Date | string;
  /** Which calendar a string `date` is in. Default `'AD'`. */
  calendar?: CalendarMode;
  label: string;
  /** `'holiday'` colors the day red; `'event'` (default) adds a dot. */
  type?: 'holiday' | 'event';
  /** Dot color for an event. */
  color?: string;
}

/** A fixed list, or a loader called with each shown month's AD span (it may be
 *  async — results are cached per month). */
export type EventsSource = CalendarEvent[] | ((span: { start: Date; end: Date }) => CalendarEvent[] | Promise<CalendarEvent[]>);

/** Why a typed value was rejected (see `onInvalid`). */
export type InvalidReason = 'invalid' | 'before-min' | 'after-max' | 'unavailable' | 'incomplete' | 'required' | 'time-unavailable' | 'span';

/** Presentation, localisation and form options every picker accepts. */
export interface CommonPickerOptions {
  /** UI text language: `'bilingual'` (default — Nepali / English as before), `'en'` or `'ne'`. */
  language?: UiLanguage;
  /** Override individual UI strings (labels, hints, messages). */
  strings?: Partial<PickerStrings>;
  /** Script for calendar names and numbers. See `CalendarScript`. */
  script?: CalendarScript;
  /** Color theme. Unset follows the page (light unless an ancestor sets
   *  `data-ndp-theme`). `'auto'` follows the OS. */
  theme?: PickerTheme;
  /** Cell and control sizing. Default depends on the picker. */
  density?: PickerDensity;
  /** Render the calendar always-visible in the page instead of a popup. When
   *  mounted on a non-input element, the calendar is drawn inside it. */
  inline?: boolean;
  /** The field must have a value: native form validation (`:invalid`,
   *  `reportValidity()`, blocked submit) treats an empty picker as invalid. */
  required?: boolean;
  /** Disable the field: no typing, no popup, not submitted. */
  disabled?: boolean;
  /** What happens to a typed value that's invalid or incomplete when the
   *  field loses focus: `'revert'` (default) restores the last good value;
   *  `'keep'` leaves the text and marks the field invalid with a message. */
  invalidBehavior?: 'revert' | 'keep';
  /** A calendar icon at the start of the field. Default `true`. */
  showFieldIcon?: boolean;
  /** Show which calendar the field is in after its value and placeholder
   *  ("2081-01-03 BS", "YYYY-MM-DD AD"). Default `true` for pickers that can
   *  be in either calendar. Display only — the value and `formatted` are unchanged. */
  showCalendarSuffix?: boolean;
  /** Show the validation message under the field. Default `true`. */
  showValidationMessage?: boolean;
  /** A typed value was rejected, or a required field was left empty. */
  onInvalid?: (reason: InvalidReason, message: string) => void;
}

/** Options for the day grid shared by the date-time and range pickers. */
export interface DayGridOptions {
  /** First column of the week, 0 = Sunday (default) … 6 = Saturday. */
  weekStartsOn?: Weekday;
  /** Days shown in red as the weekend. Default `[6]` (Saturday, Nepal's weekly holiday). */
  weekendDays?: number[];
  /** Per-day disable / class / tooltip / badge / holiday flag. */
  dayCellProps?: (date: Date, bs: BsDate) => DayCellProps | null | undefined | void;
  /** jQuery-UI-style alias for `dayCellProps`. */
  beforeShowDay?: (date: Date) => BeforeShowDayResult;
  /** Holidays and events to mark on the calendar. */
  events?: EventsSource;
}

export interface DateTimeResult {
  ad: Date;
  bs: BsDate;
  time?: { hour: number; minute: number; second: number };
  formatted: string;
  /** Machine value per `valueFormat` (default AD ISO) — the "server" value. */
  value: string | number | Date;
}

export interface DateTimePickerOptions extends CommonPickerOptions, DayGridOptions {
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  /** Show the other calendar as a small secondary hint next to the header,
   *  month/year grid, and day cells. `false` shows only the active `mode`'s
   *  calendar, for people who want to focus on one system at a time. */
  showSecondaryCalendar?: boolean;
  /** Language of the formatted display value (`'en'` default, `'ne'` for Devanagari). */
  locale?: PickerLocale;
  value?: Date | null;
  defaultValue?: Date | null;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
  withTime?: boolean;
  /** Also pick seconds (needs `withTime`). */
  withSeconds?: boolean;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
  minTime?: TimeValue;
  maxTime?: TimeValue;
  disabledTimes?: (h: number, m: number) => boolean;
  defaultTime?: TimeValue;
  /** `'spinner'` (default): typeable fields plus scroll wheels. `'dropdown'`:
   *  native selects — compact, and familiar to screen-reader users. */
  timeInputStyle?: TimeInputStyle;
  displayFormat?: string;
  valueFormat?: ValueFormat;
  altField?: string | HTMLElement;
  altFormat?: ValueFormat;
  submitName?: string;
  appendTo?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  /** Footer buttons. Default: the Today chip, plus Clear/Done when picking a time. */
  showButtonPanel?: { today?: boolean; clear?: boolean; close?: boolean };
  closeOnSelect?: boolean;
  clearable?: boolean;
  allowInput?: boolean;
  onChange?: (value: DateTimeResult) => void;
  onOpen?: () => void;
  /** The user cleared the value (× button, the panel's Clear button, or erasing the typed text). */
  onClear?: () => void;
  onClose?: () => void;
  onChangeMonthYear?: (year: number, month: number) => void;
  adapter?: CalendarAdapter;
  dateMath?: DateMath;
}

/** daterangepicker-style locale block. The labels are shorthands for the
 *  matching `strings` entries; `firstDay` for `weekStartsOn`. */
export interface RangePickerLocale {
  format?: string;
  separator?: string;
  applyLabel?: string;
  cancelLabel?: string;
  customRangeLabel?: string;
  /** @deprecated Week numbers aren't shown; this has no effect. */
  weekLabel?: string;
  /** Weekday header labels, Sunday first (7 entries). */
  daysOfWeek?: string[];
  /** Month names for the active calendar, Baisakh/January first (12 entries). */
  monthNames?: string[];
  firstDay?: number;
}

export interface PresetContext {
  today: Date;
  fiscalStartMonth: number;
  adapter: CalendarAdapter;
  dateMath: DateMath;
  /** The picker's active calendar — "this month" is a BS or an AD month. */
  mode?: CalendarMode;
  /** The picker's first day of the week — "this week" starts on it. */
  weekStartsOn?: number;
}

/** Ids of the built-in presets, usable in `presets: [...]` next to your own definitions. */
export type BuiltInPresetId =
  | 'today' | 'yesterday'
  | 'last7' | 'last15' | 'last30' | 'last45' | 'last60' | 'last90'
  | 'next7' | 'next15' | 'next30'
  | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'nextMonth'
  | 'fytd' | 'fiscalYear' | 'month' | 'custom';

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

export interface DateRangePickerOptions extends CommonPickerOptions, DayGridOptions {
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  /** Show the other calendar as a small secondary hint next to the header,
   *  month/year grid, and day cells. `false` shows only the active `mode`'s
   *  calendar, for people who want to focus on one system at a time. */
  showSecondaryCalendar?: boolean;
  locale?: RangePickerLocale;
  value?: { start: Date; end: Date } | null;
  defaultValue?: { start: Date; end: Date } | null;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
  /** Longest allowed range, in days (counting both ends). */
  maxRangeSpanDays?: number | null;
  /** Shortest allowed range, in days (counting both ends). */
  minRangeSpanDays?: number | null;
  /** Allow a range that has disabled days inside it. Default `false`: the
   *  end can't be picked past the first disabled day. */
  allowDisabledInRange?: boolean;
  /** `'default'`, `false` (none), or a list of your own definitions and/or built-in ids,
   *  e.g. `['today', 'next7', 'thisMonth', 'custom']`. */
  presets?: Array<PresetDefinition | BuiltInPresetId> | 'default' | false;
  ranges?: Record<string, [Date, Date]>;
  defaultPresetId?: string | null;
  fiscalStartMonth?: number;
  fiscalYearLookback?: number;
  /** Months shown side by side (stacked on phones). Default 1. */
  numberOfMonths?: 1 | 2;
  /** With two months: page them together (default) or navigate each one independently. */
  linkedCalendars?: boolean;
  autoApply?: boolean;
  /** Show the calendar next to the presets at all times (default). `false`
   *  shows only the presets until "Custom Range" is chosen. */
  alwaysShowCalendars?: boolean;
  autoUpdateInput?: boolean;
  allowInput?: boolean;
  /** Pick a time for each end of the range. */
  withTime?: boolean;
  timeFormat?: '12h' | '24h';
  minuteStep?: number;
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
  /** The user cleared the value (× button, the panel's Clear button, or erasing the typed text). */
  onClear?: () => void;
  /** The user dismissed the popup with Cancel, discarding unapplied changes. */
  onCancel?: () => void;
  onClose?: () => void;
  adapter?: CalendarAdapter;
  dateMath?: DateMath;
}

export interface MonthValue {
  year: number;
  month: number;
}

export interface MonthPickerOptions extends CommonPickerOptions {
  locale?: PickerLocale;
  /** Show the AD calendar as a small secondary hint next to the header and
   *  month/year grid. `false` shows only the BS month names/years, for people
   *  who want to focus on one system at a time. */
  showSecondaryCalendar?: boolean;
  value?: MonthValue | null;
  defaultValue?: MonthValue | null;
  clearable?: boolean;
  allowInput?: boolean;
  displayFormat?: string;
  valueFormat?: ValueFormat;
  // A month is a date range (first→last day) under the hood, so altField /
  // submitName accept a { start, end } pair for reporting, just like the range
  // picker — e.g. submitName: { start: 'from_date', end: 'to_date' }.
  altField?: string | HTMLElement | { start: string | HTMLElement; end: string | HTMLElement };
  altFormat?: ValueFormat;
  submitName?: string | { start: string; end: string };
  minYear?: number;
  maxYear?: number;
  /** Earliest pickable month (BS). */
  minMonth?: MonthValue | null;
  /** Latest pickable month (BS). */
  maxMonth?: MonthValue | null;
  /** Show a month but don't let it be picked. */
  disabledMonths?: (year: number, month: number) => boolean;
  appendTo?: string | HTMLElement;
  container?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  onChange?: (value: MonthResult) => void;
  onOpen?: () => void;
  /** The user cleared the value (× button, the panel's Clear button, or erasing the typed text). */
  onClear?: () => void;
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
  /** Machine values per `valueFormat` (default AD ISO): the month as a date
   *  range. `startValue` = first day, `endValue` = last day, `value` = the pair
   *  joined by a comma — ideal for `WHERE date BETWEEN … AND …` reporting. */
  startValue: string | number | Date;
  endValue: string | number | Date;
  value: string;
}

/** `TInput` is what `setValue` accepts — e.g. a plain `Date` for the date-time
 *  picker, `{ start, end }` for a range, `{ year, month }` for a month. */
export interface PickerInstance<TValue, TOptions, TInput = TValue> {
  getState(): unknown;
  getValue(): TValue | null;
  setValue(value: TInput | null): void;
  show(): void;
  hide(): void;
  update(patch: Partial<TOptions>): void;
  destroy(): void;
  onChange(cb: (value: TValue) => void): () => void;
  /** Clear the value as if the user did it: fires `onClear` and the `clear.*` DOM event.
   *  (`setValue(null)` clears silently.) */
  clear(): void;
  /** Subscribe to user clears; returns an unsubscribe function. */
  onClear(cb: () => void): () => void;
}

// ---- year, time and multiple-date pickers ------------------------------------

interface PopupFieldOptions {
  clearable?: boolean;
  allowInput?: boolean;
  appendTo?: string | HTMLElement;
  container?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  onOpen?: () => void;
  /** The user cleared the value. */
  onClear?: () => void;
  onClose?: () => void;
}

export interface YearPickerOptions extends CommonPickerOptions, PopupFieldOptions {
  /** Calendar the year is in. Default `'BS'`. */
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  showSecondaryCalendar?: boolean;
  /** Language of the formatted value (`'ne'` for Devanagari digits). */
  locale?: PickerLocale;
  value?: number | null;
  defaultValue?: number | null;
  minYear?: number;
  maxYear?: number;
  disabledYears?: (year: number) => boolean;
  /** Machine values for the year's first and last day. */
  valueFormat?: ValueFormat;
  altField?: string | HTMLElement | { start: string | HTMLElement; end: string | HTMLElement };
  altFormat?: ValueFormat;
  submitName?: string | { start: string; end: string };
  onChange?: (value: YearResult) => void;
  adapter?: CalendarAdapter;
}

export interface YearResult {
  year: number;
  mode: CalendarMode;
  /** First day of the year (AD Date). */
  start: Date;
  /** Last day of the year (AD Date). */
  end: Date;
  formatted: string;
  startValue: string | number | Date;
  endValue: string | number | Date;
  /** `startValue,endValue`. */
  value: string;
}

export interface TimePickerOptions extends CommonPickerOptions, PopupFieldOptions {
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  timeFormat?: '12h' | '24h';
  withSeconds?: boolean;
  minuteStep?: number;
  minTime?: TimeValue;
  maxTime?: TimeValue;
  disabledTimes?: (h: number, m: number) => boolean;
  timeInputStyle?: TimeInputStyle;
  submitName?: string;
  altField?: string | HTMLElement;
  onChange?: (value: TimeResult) => void;
}

export interface TimeResult {
  hour: number;
  minute: number;
  second: number;
  /** As displayed, e.g. `09:30 AM`. */
  formatted: string;
  /** 24-hour `HH:mm[:ss]` — the submitted value. */
  value: string;
}

export interface MultiDatePickerOptions extends CommonPickerOptions, DayGridOptions, PopupFieldOptions {
  mode?: CalendarMode;
  allowModeToggle?: boolean;
  showSecondaryCalendar?: boolean;
  locale?: PickerLocale;
  value?: Date[] | null;
  defaultValue?: Date[] | null;
  /** Most dates that can be picked. */
  maxDates?: number;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
  displayFormat?: string;
  valueFormat?: ValueFormat;
  /** Separator between dates in the submitted value. Default `,`. */
  valueSeparator?: string;
  submitName?: string;
  altField?: string | HTMLElement;
  altFormat?: ValueFormat;
  onChange?: (value: MultiDateResult) => void;
  adapter?: CalendarAdapter;
}

export interface MultiDateResult {
  /** The picked days in date order (AD Dates). */
  dates: Date[];
  bs: BsDate[];
  formatted: string;
  values: Array<string | number | Date>;
  /** The machine values joined by `valueSeparator`. */
  value: string;
}
