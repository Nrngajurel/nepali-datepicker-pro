import { firstOfViewMonth, lastOfViewMonth, viewYearMonthOf } from './calendar-view.js';
import { fill, resolveStrings } from '../i18n/strings.js';
import type { PickerStrings } from '../i18n/strings.js';
import type { BuiltInPresetId, DateMath, DateRangePickerOptions, PresetContext, PresetDefinition } from '../types.js';
import type { CalendarAdapter } from '../types.js';

function fiscalYearStartFor(bsYear: number, bsMonth: number, fiscalStartMonth: number): number {
  return bsMonth >= fiscalStartMonth ? bsYear : bsYear - 1;
}

function fiscalYearRange(adapter: CalendarAdapter, fyStartYear: number, fiscalStartMonth: number): { start: Date; end: Date } {
  const start = adapter.bsToAd(fyStartYear, fiscalStartMonth, 1);
  const endYear = fiscalStartMonth === 1 ? fyStartYear : fyStartYear + 1;
  const endMonth = fiscalStartMonth === 1 ? 12 : fiscalStartMonth - 1;
  const endDay = adapter.daysInBsMonth(endYear, endMonth);
  return { start, end: adapter.bsToAd(endYear, endMonth, endDay) };
}

// The whole month `offset` months from today's, in the picker's active
// calendar (a BS month in BS mode, a Gregorian month in AD mode).
function monthSpan(ctx: PresetContext, offset: number): { start: Date; end: Date } {
  const mode = ctx.mode ?? 'BS';
  const now = viewYearMonthOf(mode, ctx.adapter, ctx.today);
  const total = now.year * 12 + (now.month - 1) + offset;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return { start: firstOfViewMonth(mode, ctx.adapter, year, month), end: lastOfViewMonth(mode, ctx.adapter, ctx.dateMath, year, month) };
}

// The week `offset` weeks from today's, starting on the picker's week start.
function weekSpan(ctx: PresetContext, offset: number): { start: Date; end: Date } {
  const weekStartsOn = ctx.weekStartsOn ?? 0;
  const back = (ctx.today.getDay() - weekStartsOn + 7) % 7;
  const start = ctx.dateMath.add(ctx.today, -back + offset * 7, 'day');
  return { start, end: ctx.dateMath.add(start, 6, 'day') };
}

const range = (id: string, label: string, resolve: (ctx: PresetContext) => { start: Date; end: Date }): PresetDefinition => ({ id, label, kind: 'range', resolve });

// "Last N days" spans N days including today (today − (N − 1) … today);
// "Next N days" likewise runs today … today + (N − 1).
const lastDays = (n: number) => ({ today, dateMath }: PresetContext) => ({ start: dateMath.add(today, -(n - 1), 'day'), end: today });
const nextDays = (n: number) => ({ today, dateMath }: PresetContext) => ({ start: today, end: dateMath.add(today, n - 1, 'day') });

/** Every built-in preset, by id. */
export function buildPresetLibrary(options: DateRangePickerOptions, adapter: CalendarAdapter, strings: PickerStrings = resolveStrings(options.language, options.strings)): Record<BuiltInPresetId, PresetDefinition> {
  const fiscalStartMonth = options.fiscalStartMonth ?? 4;
  const lookback = options.fiscalYearLookback ?? 5;
  const todayBs = adapter.adToBs(new Date());
  const fyStart = fiscalYearStartFor(todayBs.year, todayBs.month, fiscalStartMonth);
  const fyItems = Array.from({ length: lookback }, (_, index) => {
    const year = fyStart - index;
    return range(`fy-${year}`, `${year}/${String((year + 1) % 100).padStart(2, '0')} BS`, () => fiscalYearRange(adapter, year, fiscalStartMonth));
  });
  const n = (template: string, count: number) => fill(template, { n: count });
  return {
    today: range('today', strings.presetToday, ({ today }) => ({ start: today, end: today })),
    yesterday: range('yesterday', strings.presetYesterday, ({ today, dateMath }) => {
      const day = dateMath.add(today, -1, 'day');
      return { start: day, end: day };
    }),
    last7: range('last7', n(strings.presetLastDays, 7), lastDays(7)),
    last15: range('last15', n(strings.presetLastDays, 15), lastDays(15)),
    last30: range('last30', n(strings.presetLastDays, 30), lastDays(30)),
    last45: range('last45', n(strings.presetLastDays, 45), lastDays(45)),
    last60: range('last60', n(strings.presetLastDays, 60), lastDays(60)),
    last90: range('last90', n(strings.presetLastDays, 90), lastDays(90)),
    next7: range('next7', n(strings.presetNextDays, 7), nextDays(7)),
    next15: range('next15', n(strings.presetNextDays, 15), nextDays(15)),
    next30: range('next30', n(strings.presetNextDays, 30), nextDays(30)),
    thisWeek: range('thisWeek', strings.presetThisWeek, (ctx) => weekSpan(ctx, 0)),
    lastWeek: range('lastWeek', strings.presetLastWeek, (ctx) => weekSpan(ctx, -1)),
    thisMonth: range('thisMonth', strings.presetThisMonth, (ctx) => monthSpan(ctx, 0)),
    lastMonth: range('lastMonth', strings.presetLastMonth, (ctx) => monthSpan(ctx, -1)),
    nextMonth: range('nextMonth', strings.presetNextMonth, (ctx) => monthSpan(ctx, 1)),
    fytd: range('fytd', strings.presetFiscalYtd, ({ today }) => {
      const now = adapter.adToBs(today);
      return { start: adapter.bsToAd(fiscalYearStartFor(now.year, now.month, fiscalStartMonth), fiscalStartMonth, 1), end: today };
    }),
    fiscalYear: { id: 'fiscalYear', label: strings.presetFiscalYear, kind: 'submenu', items: fyItems },
    month: { id: 'month', label: strings.presetPickMonth, kind: 'submenu', items: [] },
    custom: { id: 'custom', label: strings.presetCustom, kind: 'submenu', items: [] },
  };
}

const DEFAULT_IDS: BuiltInPresetId[] = ['today', 'last7', 'last15', 'last30', 'last45', 'last60', 'fytd', 'fiscalYear', 'month', 'custom'];

// Resolve against the context passed at click time (fresh `today`), so a page
// left open past midnight doesn't pick yesterday's ranges.
function withFreshContext(preset: PresetDefinition, ctx: PresetContext): PresetDefinition {
  if (preset.kind !== 'range' || !preset.resolve) return preset;
  const resolve = preset.resolve;
  return { ...preset, resolve: (fresh?: PresetContext) => resolve(fresh ?? ctx) };
}

export function buildDefaultPresets(options: DateRangePickerOptions, adapter: CalendarAdapter, dateMath: DateMath): PresetDefinition[] {
  const library = buildPresetLibrary(options, adapter);
  const ctx: PresetContext = { today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath, mode: options.mode, weekStartsOn: options.weekStartsOn };
  return DEFAULT_IDS.map((id) => withFreshContext(library[id], ctx));
}

export function normalizePresets(options: DateRangePickerOptions, adapter: CalendarAdapter, dateMath: DateMath): PresetDefinition[] {
  if (options.ranges) {
    return Object.entries(options.ranges).map(([label, [start, end]]) => ({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      label,
      kind: 'range',
      resolve: () => ({ start, end }),
    }));
  }
  if (options.presets === false) return [];
  if (Array.isArray(options.presets)) {
    const list = options.presets;
    if (!list.some((item) => typeof item === 'string')) return list as PresetDefinition[];
    const library = buildPresetLibrary(options, adapter);
    const ctx: PresetContext = { today: new Date(), fiscalStartMonth: options.fiscalStartMonth ?? 4, adapter, dateMath, mode: options.mode, weekStartsOn: options.weekStartsOn };
    return list
      .map((item) => (typeof item === 'string' ? library[item] : item))
      .filter((item): item is PresetDefinition => !!item)
      .map((item) => withFreshContext(item, ctx));
  }
  return buildDefaultPresets(options, adapter, dateMath);
}
