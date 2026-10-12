import { asciiDay, asciiTime, getDefaults, mountShell } from './shell.js';
import type { ShellOptions } from './shell.js';
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { createDateRangeController } from '../application/date-range-controller.js';
import type { DateRangeController } from '../application/date-range-controller.js';
import { looseToAd, parseLooseDate, splitLooseRange } from '../format/loose.js';
import { renderRangePanel } from '../render/range-panel.js';
import { rangeSchema, typingOrder } from './segment-schemas.js';
import type { DateRangePickerOptions, DateRangeResult, PickerInstance, TimeValue, ValueFormat } from '../types.js';

export function mountDateRangePicker(target: HTMLInputElement | HTMLElement, options: DateRangePickerOptions = {}): PickerInstance<DateRangeResult, DateRangePickerOptions, { start: Date; end: Date }> {
  const merged = { ...getDefaults(), ...options } as DateRangePickerOptions;
  const controller: DateRangeController = createDateRangeController(merged);
  const adapter = merged.adapter ?? defaultCalendarAdapter;
  const order = () => typingOrder(merged.displayFormat ?? merged.locale?.format);
  return mountShell(target, merged as ShellOptions, controller, {
    events: { change: 'apply.nepaliDateRangePicker', clear: 'clear.nepaliDateRangePicker' },
    renderPanel: (root) => renderRangePanel(root, controller),
    schema: () => rangeSchema({ yearBounds: () => controller.yearBounds(), order, withTime: () => !!merged.withTime }),
    emptyLabel: () => controller.getUi().strings.selectRangePlaceholder,
    modeSwitch: true,
    calendarSuffix: true,
    machine() {
      const r = controller.getValue();
      if (!r) return null;
      const state = controller.getState();
      const format: ValueFormat = merged.altFormat ?? merged.valueFormat ?? 'iso';
      const withTime = !!merged.withTime;
      const start = stringifyMachineValue(formatMachineValue({ ad: r.start, bs: r.startBs, time: state.startTime ?? undefined }, format, adapter, withTime));
      const end = stringifyMachineValue(formatMachineValue({ ad: r.end, bs: r.endBs, time: state.endTime ?? undefined }, format, adapter, withTime));
      return { combined: `${start},${end}`, start, end };
    },
    paste(text) {
      const ends = splitLooseRange(text);
      if (!ends) return false;
      const mode = controller.getState().mode;
      const first = order().order[0];
      const parse = (part: string) => parseLooseDate(part, { mode, adapter, dayFirst: first === 'day', monthFirst: first === 'month' });
      const [a, b] = ends.map(parse);
      const adA = a && looseToAd(a, adapter);
      const adB = b && looseToAd(b, adapter);
      if (!adA || !adB) return false;
      const state = controller.getState();
      const time = (loose: typeof a, fallback: Required<TimeValue> | null) => (merged.withTime ? ` ${asciiTime(loose?.hour != null ? { hour: loose.hour, minute: loose.minute ?? 0 } : fallback ?? { hour: 0, minute: 0 })}` : '');
      return controller.commitTyped(`${asciiDay(adA, mode, adapter)}${time(a, state.startTime)} – ${asciiDay(adB, mode, adapter)}${time(b, state.endTime)}`) === 'valid';
    },
    page: (delta) => controller.navigateMonth(delta),
  });
}
