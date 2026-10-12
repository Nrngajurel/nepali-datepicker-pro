import { asciiDay, asciiTime, getDefaults, mountShell } from './shell.js';
import type { ShellOptions } from './shell.js';
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { createDateTimeController } from '../application/date-time-controller.js';
import type { DateTimeController } from '../application/date-time-controller.js';
import { lazyPanel, withModule } from '../render/lazy.js';
import { dateSchema, typingOrder } from './segment-schemas.js';
import type { DateTimePickerOptions, DateTimeResult, PickerInstance, ValueFormat } from '../types.js';

export function mountDateTimePicker(target: HTMLInputElement | HTMLElement, options: DateTimePickerOptions = {}): PickerInstance<DateTimeResult, DateTimePickerOptions, Date | DateTimeResult> {
  const merged = { ...getDefaults(), ...options } as DateTimePickerOptions;
  const controller: DateTimeController = createDateTimeController(merged);
  const adapter = merged.adapter ?? defaultCalendarAdapter;
  const order = () => typingOrder(merged.displayFormat);
  return mountShell(target, merged as ShellOptions, controller, {
    events: { change: 'select.nepaliDatePicker', clear: 'clear.nepaliDatePicker' },
    ...lazyPanel('datetime', (m, root) => m.renderDateTimePanel(root, controller), () => !!controller.getState().time),
    schema: () => dateSchema({
      yearBounds: () => controller.yearBounds(),
      withTime: () => !!merged.withTime,
      hour12: () => controller.getState().timeFormat === '12h',
      withSeconds: () => !!merged.withSeconds,
      order,
    }),
    emptyLabel: () => controller.getUi().strings.selectDatePlaceholder,
    modeSwitch: true,
    calendarSuffix: true,
    machine() {
      const r = controller.getValue();
      if (!r) return null;
      const format: ValueFormat = merged.altFormat ?? merged.valueFormat ?? 'iso';
      const value = stringifyMachineValue(formatMachineValue({ ad: r.ad, bs: r.bs, time: r.time }, format, adapter, !!merged.withTime, !!merged.withTime && !!merged.withSeconds));
      return { combined: value, start: value, end: value };
    },
    paste: (text) => withModule('loose', ({ looseToAd, parseLooseDate }) => {
      const mode = controller.getState().mode;
      const first = order().order[0];
      const loose = parseLooseDate(text, { mode, adapter, dayFirst: first === 'day', monthFirst: first === 'month' });
      const ad = loose && looseToAd(loose, adapter);
      if (!ad) return false;
      let ascii = asciiDay(ad, mode, adapter);
      if (merged.withTime) {
        const current = controller.getState().time ?? { hour: 0, minute: 0, second: 0 };
        ascii += ` ${asciiTime(loose!.hour != null ? { hour: loose!.hour, minute: loose!.minute ?? 0, second: loose!.second ?? 0 } : current, !!merged.withSeconds)}`;
      }
      return controller.commitTyped(ascii) === 'valid';
    }),
    page: (delta) => {
      if (controller.getState().view === 'day') controller.navigateMonth(delta);
      else if (controller.getState().view === 'month') controller.navigateYear(delta);
    },
  });
}
