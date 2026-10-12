import type { DateMath, DateRangePickerOptions, PresetContext, PresetDefinition } from '../types.js';
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

export function buildDefaultPresets(options: DateRangePickerOptions, adapter: CalendarAdapter, dateMath: DateMath): PresetDefinition[] {
  const fiscalStartMonth = options.fiscalStartMonth ?? 4;
  const lookback = options.fiscalYearLookback ?? 5;
  const today = new Date();
  const todayBs = adapter.adToBs(today);
  const fyStart = fiscalYearStartFor(todayBs.year, todayBs.month, fiscalStartMonth);
  const ctx: PresetContext = { today, fiscalStartMonth, adapter, dateMath };

  const range = (id: string, label: string, resolve: (ctx: PresetContext) => { start: Date; end: Date }): PresetDefinition => ({
    id,
    label,
    kind: 'range',
    resolve,
  });

  // "Last N days" spans N days including today (today − (N − 1) … today).
  const lastDays = (n: number) => ({ today, dateMath }: PresetContext) => ({ start: dateMath.add(today, -(n - 1), 'day'), end: today });

  const fyItems = Array.from({ length: lookback }, (_, index) => {
    const year = fyStart - index;
    return range(`fy-${year}`, `${year}/${String((year + 1) % 100).padStart(2, '0')} BS`, () => fiscalYearRange(adapter, year, fiscalStartMonth));
  });

  const items: PresetDefinition[] = [
    range('today', 'Today', ({ today }) => ({ start: today, end: today })),
    range('last7', 'Last 7 days', lastDays(7)),
    range('last15', 'Last 15 days', lastDays(15)),
    range('last30', 'Last 30 days', lastDays(30)),
    range('last45', 'Last 45 days', lastDays(45)),
    range('last60', 'Last 60 days', lastDays(60)),
    range('fytd', 'This Fiscal Year to Date', ({ today }) => {
      const now = adapter.adToBs(today);
      return { start: adapter.bsToAd(fiscalYearStartFor(now.year, now.month, fiscalStartMonth), fiscalStartMonth, 1), end: today };
    }),
    { id: 'fiscalYear', label: 'Fiscal Year', kind: 'submenu', items: fyItems },
    { id: 'month', label: 'Pick a Month', kind: 'submenu', items: [] },
    { id: 'custom', label: 'Custom Range', kind: 'submenu', items: [] },
  ];

  // Resolve against the context passed at click time (fresh `today`), so a
  // page left open past midnight doesn't pick yesterday's ranges.
  return items.map((preset) => {
    if (preset.kind !== 'range' || !preset.resolve) return preset;
    const resolve = preset.resolve;
    return { ...preset, resolve: (fresh?: PresetContext) => resolve(fresh ?? ctx) };
  });
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
  if (Array.isArray(options.presets)) return options.presets;
  return buildDefaultPresets(options, adapter, dateMath);
}
