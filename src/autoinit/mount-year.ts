import { getDefaults, mountShell } from './shell.js';
import type { ShellOptions } from './shell.js';
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { formatMachineValue, stringifyMachineValue } from '../format/index.js';
import { createYearPickerController } from '../application/year-picker-controller.js';
import { renderYearPickerPanel } from '../render/year-panel.js';
import type { PickerInstance, ValueFormat, YearPickerOptions, YearResult } from '../types.js';

export function mountYearPicker(target: HTMLInputElement | HTMLElement, options: YearPickerOptions = {}): PickerInstance<YearResult, YearPickerOptions, number> {
  const merged = { ...getDefaults(), ...options } as YearPickerOptions;
  const controller = createYearPickerController(merged);
  const adapter = merged.adapter ?? defaultCalendarAdapter;
  return mountShell(target, merged as ShellOptions, controller, {
    events: { change: 'select.nepaliYearPicker', clear: 'clear.nepaliYearPicker' },
    renderPanel: (root) => renderYearPickerPanel(root, controller),
    schema: () => ({
      schema: () => [{ key: 'year', len: 4, min: controller.yearBounds().min, max: controller.yearBounds().max, placeholder: 'YYYY' }],
      placeholder: () => 'YYYY',
      seed: (ascii) => ({ year: /^\d+$/.test(ascii) ? Number(ascii) : null }),
      toAscii: (v) => String(v.year).padStart(4, '0'),
    }),
    emptyLabel: () => controller.getUi().strings.selectYearPlaceholder,
    modeSwitch: true,
    calendarSuffix: true,
    machine() {
      const r = controller.getValue();
      if (!r) return null;
      const format: ValueFormat = merged.altFormat ?? merged.valueFormat ?? 'iso';
      const start = stringifyMachineValue(formatMachineValue({ ad: r.start, bs: adapter.adToBs(r.start) }, format, adapter));
      const end = stringifyMachineValue(formatMachineValue({ ad: r.end, bs: adapter.adToBs(r.end) }, format, adapter));
      return { combined: `${start},${end}`, start, end };
    },
    paste: (text) => controller.commitTyped(text.replace(/[^\d०-९]/g, '')) === 'valid',
    page: (delta) => controller.navigateYear(delta * 3),
  });
}
