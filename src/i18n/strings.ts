// Every piece of UI text the pickers render, in one place, so it can be
// localised. Three built-in packs: English, Nepali, and the bilingual default
// (Nepali / English side by side, as the pickers have always shown). Pass
// `language` to pick a pack and `strings` to override individual entries.

export type UiLanguage = 'en' | 'ne' | 'bilingual';

export interface PickerStrings {
  // ---- buttons ----
  today: string;
  now: string;
  clear: string;
  done: string;
  apply: string;
  cancel: string;
  close: string;
  nextToTime: string;
  changeDate: string;
  // ---- header / navigation (accessible names) ----
  previousMonth: string;
  nextMonth: string;
  previousYear: string;
  nextYear: string;
  chooseMonth: string;
  chooseYear: string;
  backToDays: string;
  selectYear: string;
  selectMonth: string;
  switchToBs: string;
  switchToAd: string;
  /** Short calendar names on the BS/AD switch and badges. */
  calendarBs: string;
  calendarAd: string;
  /** Full calendar names, read by screen readers. */
  calendarBsLong: string;
  calendarAdLong: string;
  calendarLabel: string;
  openCalendar: string;
  // ---- dialogs (accessible names) ----
  datePicker: string;
  rangePicker: string;
  monthPicker: string;
  yearPicker: string;
  timePicker: string;
  // ---- range ----
  start: string;
  end: string;
  pickStart: string;
  pickEnd: string;
  pickMonthHint: string;
  rangeStart: string;
  rangeEnd: string;
  inRange: string;
  /** "{n}" is replaced with the number of days. */
  nights: string;
  /** "{n}" is replaced with the maximum number of days. */
  maxSpan: string;
  /** "{n}" is replaced with the minimum number of days. */
  minSpan: string;
  rangeHasDisabled: string;
  // ---- time ----
  time: string;
  enterTime: string;
  orScroll: string;
  hour: string;
  minute: string;
  second: string;
  meridiem: string;
  hourWheel: string;
  minuteWheel: string;
  secondWheel: string;
  meridiemWheel: string;
  // ---- day cells (screen readers) ----
  holiday: string;
  unavailable: string;
  selected: string;
  // ---- announcements ----
  /** "{date}" is replaced with the chosen date. */
  announceSelected: string;
  /** "{date}" is replaced with the start date. */
  announceStart: string;
  /** "{start}" / "{end}" are replaced with the range ends. */
  announceRange: string;
  // ---- field placeholders (non-input triggers) ----
  selectDatePlaceholder: string;
  selectRangePlaceholder: string;
  selectMonthPlaceholder: string;
  selectYearPlaceholder: string;
  selectTimePlaceholder: string;
  /** "{n}" is replaced with the number of dates picked. */
  datesSelected: string;
  // ---- validation ----
  invalidDate: string;
  /** "{date}" is replaced with the earliest allowed date. */
  beforeMin: string;
  /** "{date}" is replaced with the latest allowed date. */
  afterMax: string;
  dateUnavailable: string;
  timeUnavailable: string;
  incomplete: string;
  required: string;
  // ---- presets ----
  presetToday: string;
  presetYesterday: string;
  /** "{n}" is replaced with the number of days. */
  presetLastDays: string;
  /** "{n}" is replaced with the number of days. */
  presetNextDays: string;
  presetThisWeek: string;
  presetLastWeek: string;
  presetThisMonth: string;
  presetLastMonth: string;
  presetNextMonth: string;
  presetFiscalYtd: string;
  presetFiscalYear: string;
  presetPickMonth: string;
  presetCustom: string;
  presetsLabel: string;
}

const en: PickerStrings = {
  today: 'Today',
  now: 'Now',
  clear: 'Clear',
  done: 'Done',
  apply: 'Apply',
  cancel: 'Cancel',
  close: 'Close',
  nextToTime: 'Next: time ›',
  changeDate: 'Change date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  chooseMonth: 'choose a month',
  chooseYear: 'choose a year',
  backToDays: 'back to days',
  selectYear: 'Select year',
  selectMonth: 'Select month',
  switchToBs: 'Switch to BS',
  switchToAd: 'Switch to AD',
  calendarBs: 'BS',
  calendarAd: 'AD',
  calendarBsLong: 'Bikram Sambat (BS)',
  calendarAdLong: 'Gregorian (AD)',
  calendarLabel: 'Calendar',
  openCalendar: 'Open calendar',
  datePicker: 'Date picker',
  rangePicker: 'Date range picker',
  monthPicker: 'Month picker',
  yearPicker: 'Year picker',
  timePicker: 'Time picker',
  start: 'Start',
  end: 'End',
  pickStart: 'Pick the start date',
  pickEnd: 'Now pick the end date',
  pickMonthHint: 'Pick a month for its full date span',
  rangeStart: 'start of range',
  rangeEnd: 'end of range',
  inRange: 'in selected range',
  nights: '{n} days',
  maxSpan: 'Up to {n} days',
  minSpan: 'At least {n} days',
  rangeHasDisabled: 'The range includes unavailable dates',
  time: 'Time',
  enterTime: 'Enter time',
  orScroll: 'or scroll',
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
  meridiem: 'AM/PM',
  hourWheel: 'Hour',
  minuteWheel: 'Min',
  secondWheel: 'Sec',
  meridiemWheel: 'AM/PM',
  holiday: 'holiday',
  unavailable: 'unavailable',
  selected: 'selected',
  announceSelected: '{date} selected',
  announceStart: 'Start date {date}. Now pick the end date.',
  announceRange: 'Range {start} to {end}',
  selectDatePlaceholder: 'Select date',
  selectRangePlaceholder: 'Select date range',
  selectMonthPlaceholder: 'Select month',
  selectYearPlaceholder: 'Select year',
  selectTimePlaceholder: 'Select time',
  datesSelected: '{n} dates',
  invalidDate: 'Enter a valid date',
  beforeMin: 'Date must be on or after {date}',
  afterMax: 'Date must be on or before {date}',
  dateUnavailable: 'This date is unavailable',
  timeUnavailable: 'This time is unavailable',
  incomplete: 'Finish entering the date',
  required: 'Please select a date',
  presetToday: 'Today',
  presetYesterday: 'Yesterday',
  presetLastDays: 'Last {n} days',
  presetNextDays: 'Next {n} days',
  presetThisWeek: 'This week',
  presetLastWeek: 'Last week',
  presetThisMonth: 'This month',
  presetLastMonth: 'Last month',
  presetNextMonth: 'Next month',
  presetFiscalYtd: 'This Fiscal Year to Date',
  presetFiscalYear: 'Fiscal Year',
  presetPickMonth: 'Pick a Month',
  presetCustom: 'Custom Range',
  presetsLabel: 'Quick ranges',
};

const ne: PickerStrings = {
  today: 'आज',
  now: 'अहिले',
  clear: 'हटाउनुहोस्',
  done: 'भयो',
  apply: 'लागू गर्नुहोस्',
  cancel: 'रद्द गर्नुहोस्',
  close: 'बन्द गर्नुहोस्',
  nextToTime: 'अर्को: समय ›',
  changeDate: 'मिति बदल्नुहोस्',
  previousMonth: 'अघिल्लो महिना',
  nextMonth: 'अर्को महिना',
  previousYear: 'अघिल्लो वर्ष',
  nextYear: 'अर्को वर्ष',
  chooseMonth: 'महिना छान्नुहोस्',
  chooseYear: 'वर्ष छान्नुहोस्',
  backToDays: 'दिनमा फर्कनुहोस्',
  selectYear: 'वर्ष छान्नुहोस्',
  selectMonth: 'महिना छान्नुहोस्',
  switchToBs: 'बि.सं. मा बदल्नुहोस्',
  switchToAd: 'ई.सं. मा बदल्नुहोस्',
  calendarBs: 'बि.सं.',
  calendarAd: 'ई.सं.',
  calendarBsLong: 'विक्रम संवत् (बि.सं.)',
  calendarAdLong: 'ईस्वी संवत् (ई.सं.)',
  calendarLabel: 'पात्रो',
  openCalendar: 'पात्रो खोल्नुहोस्',
  datePicker: 'मिति छनोट',
  rangePicker: 'मिति अवधि छनोट',
  monthPicker: 'महिना छनोट',
  yearPicker: 'वर्ष छनोट',
  timePicker: 'समय छनोट',
  start: 'सुरु',
  end: 'अन्त्य',
  pickStart: 'सुरु मिति छान्नुहोस्',
  pickEnd: 'अन्त्य मिति छान्नुहोस्',
  pickMonthHint: 'पूरा महिनाको लागि महिना छान्नुहोस्',
  rangeStart: 'अवधिको सुरु',
  rangeEnd: 'अवधिको अन्त्य',
  inRange: 'छानिएको अवधिभित्र',
  nights: '{n} दिन',
  maxSpan: 'बढीमा {n} दिन',
  minSpan: 'कम्तीमा {n} दिन',
  rangeHasDisabled: 'अवधिमा उपलब्ध नभएका मितिहरू छन्',
  time: 'समय',
  enterTime: 'समय लेख्नुहोस्',
  orScroll: 'वा स्क्रोल गर्नुहोस्',
  hour: 'घण्टा',
  minute: 'मिनेट',
  second: 'सेकेन्ड',
  meridiem: 'पूर्वाह्न/अपराह्न',
  hourWheel: 'घण्टा',
  minuteWheel: 'मिनेट',
  secondWheel: 'सेकेन्ड',
  meridiemWheel: 'AM/PM',
  holiday: 'बिदा',
  unavailable: 'उपलब्ध छैन',
  selected: 'छानिएको',
  announceSelected: '{date} छानियो',
  announceStart: 'सुरु मिति {date}। अब अन्त्य मिति छान्नुहोस्।',
  announceRange: '{start} देखि {end} सम्म',
  selectDatePlaceholder: 'मिति छान्नुहोस्',
  selectRangePlaceholder: 'मिति अवधि छान्नुहोस्',
  selectMonthPlaceholder: 'महिना छान्नुहोस्',
  selectYearPlaceholder: 'वर्ष छान्नुहोस्',
  selectTimePlaceholder: 'समय छान्नुहोस्',
  datesSelected: '{n} मिति',
  invalidDate: 'मान्य मिति लेख्नुहोस्',
  beforeMin: 'मिति {date} वा त्यसपछिको हुनुपर्छ',
  afterMax: 'मिति {date} वा त्योभन्दा अघिको हुनुपर्छ',
  dateUnavailable: 'यो मिति उपलब्ध छैन',
  timeUnavailable: 'यो समय उपलब्ध छैन',
  incomplete: 'मिति पूरा लेख्नुहोस्',
  required: 'कृपया मिति छान्नुहोस्',
  presetToday: 'आज',
  presetYesterday: 'हिजो',
  presetLastDays: 'पछिल्लो {n} दिन',
  presetNextDays: 'आउँदो {n} दिन',
  presetThisWeek: 'यो हप्ता',
  presetLastWeek: 'गत हप्ता',
  presetThisMonth: 'यो महिना',
  presetLastMonth: 'गत महिना',
  presetNextMonth: 'आउँदो महिना',
  presetFiscalYtd: 'यो आर्थिक वर्ष हालसम्म',
  presetFiscalYear: 'आर्थिक वर्ष',
  presetPickMonth: 'महिना छान्नुहोस्',
  presetCustom: 'आफ्नै अवधि',
  presetsLabel: 'छिटो अवधि',
};

// The bilingual default keeps exactly what the pickers showed before UI text
// became configurable: short actions in both scripts, the rest in English.
const bilingual: PickerStrings = {
  ...en,
  today: 'आज / Today',
  now: 'अहिले / Now',
  time: 'समय / Time',
  pickStart: 'सुरु मिति छान्नुहोस् · pick the start date',
  pickEnd: 'अन्त्य मिति छान्नुहोस् · now pick the end date',
  pickMonthHint: 'महिना छान्नुहोस् · pick a month for its full date span',
};

export const STRING_PACKS: Record<UiLanguage, PickerStrings> = { en, ne, bilingual };

export function resolveStrings(language: UiLanguage | undefined, overrides?: Partial<PickerStrings>): PickerStrings {
  const base = STRING_PACKS[language ?? 'bilingual'] ?? bilingual;
  return overrides ? { ...base, ...overrides } : base;
}

/** Replace `{name}` placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
