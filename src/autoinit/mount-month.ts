import { getDefaults, mountShell, pad2 } from './shell.js';
import type { ShellOptions } from './shell.js';
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { createMonthPickerController } from '../application/month-picker-controller.js';
import type { MonthPickerController } from '../application/month-picker-controller.js';
import { parseLooseMonth } from '../format/loose.js';
import { renderMonthPickerPanel } from '../render/month-panel.js';
import { monthSchema } from './segment-schemas.js';
import type { MonthPickerOptions, MonthResult, MonthValue, PickerInstance, ValueFormat } from '../types.js';

export function mountMonthPicker(target: HTMLInputElement | HTMLElement, options: MonthPickerOptions = {}): PickerInstance<MonthResult, MonthPickerOptions, MonthValue> {
  const merged = { ...getDefaults(), ...options } as MonthPickerOptions;
  const controller: MonthPickerController = createMonthPickerController(merged);
  const adapter = merged.adapter ?? defaultCalendarAdapter;
  return mountShell(target, merged as ShellOptions, controller, {
    events: { change: 'select.nepaliMonthPicker', clear: 'clear.nepaliMonthPicker' },
    renderPanel: (root) => renderMonthPickerPanel(root, controller),
    schema: () => monthSchema({ yearBounds: () => controller.yearBounds(), displayFormat: () => merged.displayFormat }),
    emptyLabel: () => controller.getUi().strings.selectMonthPlaceholder,
    modeSwitch: false,
    calendarSuffix: false,
    // A month is a from→to date range, so it delivers start/end machine values
    // exactly like the range picker (single combined field, or a { start, end } pair).
    machine() {
      const r = controller.getValue();
      if (!r) return null;
      const format: ValueFormat = merged.altFormat ?? merged.valueFormat ?? 'iso';
      const days = adapter.daysInBsMonth(r.year, r.month);
      const start = stringifyMachineValue(formatMachineValue({ ad: r.start, bs: { year: r.year, month: r.month, day: 1 } }, format, adapter));
      const end = stringifyMachineValue(formatMachineValue({ ad: r.end, bs: { year: r.year, month: r.month, day: days } }, format, adapter));
      return { combined: `${start},${end}`, start, end };
    },
    paste(text) {
      const month = parseLooseMonth(text, adapter);
      return !!month && controller.commitTyped(`${month.year}-${pad2(month.month)}`) === 'valid';
    },
    page: (delta) => controller.navigateYear(delta),
  });
}
