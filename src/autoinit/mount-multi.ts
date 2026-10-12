import { getDefaults, mountShell } from './shell.js';
import type { ShellOptions } from './shell.js';
import { createMultiDateController } from '../application/multi-date-controller.js';
import { renderMultiDatePanel } from '../render/multi-panel.js';
import type { MultiDatePickerOptions, MultiDateResult, PickerInstance } from '../types.js';

export function mountMultiDatePicker(target: HTMLInputElement | HTMLElement, options: MultiDatePickerOptions = {}): PickerInstance<MultiDateResult, MultiDatePickerOptions, Date[]> {
  const merged = { ...getDefaults(), ...options, allowInput: false } as MultiDatePickerOptions;
  const controller = createMultiDateController(merged);
  return mountShell(target, merged as ShellOptions, controller, {
    events: { change: 'select.nepaliMultiDatePicker', clear: 'clear.nepaliMultiDatePicker' },
    renderPanel: (root) => renderMultiDatePanel(root, controller),
    schema: () => ({ schema: () => [], placeholder: () => '', seed: () => ({}), toAscii: () => '' }),
    emptyLabel: () => controller.getUi().strings.selectDatePlaceholder,
    modeSwitch: true,
    calendarSuffix: true,
    machine() {
      const r = controller.getValue();
      return r ? { combined: r.value, start: r.value, end: r.value } : null;
    },
    paste: () => false,
    page: (delta) => controller.inner().navigateMonth(delta),
  });
}
