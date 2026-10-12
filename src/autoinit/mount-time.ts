import { getDefaults, mountShell, pad2 } from './shell.js';
import type { ShellOptions } from './shell.js';
import { createTimePickerController } from '../application/time-picker-controller.js';
import { lazyPanel } from '../render/lazy.js';
import { dateSchema } from './segment-schemas.js';
import type { PickerInstance, TimePickerOptions, TimeResult, TimeValue } from '../types.js';

export function mountTimePicker(target: HTMLInputElement | HTMLElement, options: TimePickerOptions = {}): PickerInstance<TimeResult, TimePickerOptions, TimeValue> {
  const merged = { ...getDefaults(), ...options } as TimePickerOptions;
  const controller = createTimePickerController(merged);
  const hour12 = () => controller.inner().getState().timeFormat === '12h';
  return mountShell(target, merged as ShellOptions, controller, {
    events: { change: 'select.nepaliTimePicker', clear: 'clear.nepaliTimePicker' },
    ...lazyPanel('time', (m, root) => m.renderTimePickerPanel(root, controller)),
    schema: () => {
      // The date schema's time half: hh:mm[:ss] [AM/PM].
      const full = dateSchema({ yearBounds: () => ({ min: 0, max: 0 }), withTime: () => true, hour12, withSeconds: () => !!merged.withSeconds });
      return {
        schema: () => full.schema().slice(6),
        placeholder: () => full.placeholder().slice(11),
        seed: (ascii) => full.seed(`2000-01-01 ${ascii}`),
        toAscii: (v) => full.toAscii({ ...v, year: 2000, month: 1, day: 1 }).slice(11),
      };
    },
    emptyLabel: () => controller.getUi().strings.selectTimePlaceholder,
    modeSwitch: false,
    calendarSuffix: false,
    machine() {
      const r = controller.getValue();
      return r ? { combined: r.value, start: r.value, end: r.value } : null;
    },
    paste(text) {
      const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?/i.exec(text.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d))));
      if (!m) return false;
      let hour = Number(m[1]);
      const meridiem = m[4]?.toLowerCase().replace(/\./g, '');
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      return controller.commitTyped(`${pad2(hour)}:${m[2]}${merged.withSeconds ? `:${m[3] ?? '00'}` : ''}`) === 'valid';
    },
    page: () => {},
  });
}
