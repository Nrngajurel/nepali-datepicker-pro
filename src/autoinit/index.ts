import { createDateRangeController } from '../application/date-range-controller.js';
import { createDateTimeController } from '../application/date-time-controller.js';
import { createMonthPickerController } from '../application/month-picker-controller.js';
import { formatDateValue, formatRange } from '../format/index.js';
import { attachSegmentedField } from './segmented-field.js';
import type { SegmentedField } from './segmented-field.js';
import { dateSchema, monthSchema, rangeSchema } from './segment-schemas.js';
import { defaultCalendarAdapter } from '../adapters/bs-ad-calendar-adapter.js';
import { positionPopup, renderDateTimePanel, renderMonthPickerPanel, renderRangePanel } from '../render/dom.js';
import type { DateRangePickerOptions, DateRangeResult, DateTimePickerOptions, DateTimeResult, MonthPickerOptions, MonthResult, PickerInstance } from '../types.js';

export const regional = {
  ne: { locale: { separator: ' – ', applyLabel: 'लागू गर्नुहोस्', cancelLabel: 'रद्द गर्नुहोस्', firstDay: 0 } },
  en: { locale: { separator: ' – ', applyLabel: 'Apply', cancelLabel: 'Cancel', firstDay: 0 } },
};

let defaults: Partial<DateTimePickerOptions & DateRangePickerOptions> = {};

export function setDefaults(options: Partial<DateTimePickerOptions & DateRangePickerOptions>): void {
  defaults = { ...defaults, ...options };
}

function resolveAppendTo(target: HTMLElement, appendTo?: string | HTMLElement): HTMLElement {
  if (appendTo instanceof HTMLElement) return appendTo;
  if (typeof appendTo === 'string') return document.querySelector<HTMLElement>(appendTo) ?? document.body;
  return document.body;
}

/** Wraps the trigger in an input-group container with a clear button and an
 *  optional BS/AD mode switch. Both buttons are always created; their
 *  visibility is decided live by the predicates so options like `clearable`
 *  and `allowModeToggle` can be toggled at runtime via `update()`. */
function withInputGroup(
  trigger: HTMLElement,
  shouldShowClear: () => boolean,
  onClear: () => void,
  modeSwitch?: { mode: () => 'BS' | 'AD'; toggle: () => void; enabled: () => boolean },
): { wrapper: HTMLElement; updateClear: () => void; updateMode: () => void } {
  const wrapper = document.createElement('div');
  wrapper.className = 'ndp-trigger-wrap';
  trigger.parentNode?.insertBefore(wrapper, trigger);
  wrapper.appendChild(trigger);

  // ---- clear button ----
  const clearBtn = document.createElement('button');
  clearBtn.className = 'ndp-clear';
  clearBtn.setAttribute('type', 'button');
  clearBtn.setAttribute('aria-label', 'Clear');
  clearBtn.innerHTML = '&#215;';
  clearBtn.style.display = 'none';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClear();
  });
  wrapper.appendChild(clearBtn);

  function updateClear() {
    clearBtn.style.display = shouldShowClear() ? '' : 'none';
  }

  // ---- mode switch segment ----
  let updateMode = () => {};
  if (modeSwitch) {
    const btn = document.createElement('button');
    btn.className = 'ndp-mode-toggle';
    btn.setAttribute('type', 'button');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      modeSwitch.toggle();
    });
    wrapper.appendChild(btn);

    updateMode = () => {
      btn.style.display = modeSwitch.enabled() ? '' : 'none';
      btn.setAttribute('aria-label', `Switch to ${modeSwitch.mode() === 'BS' ? 'AD' : 'BS'}`);
      btn.setAttribute('data-mode', modeSwitch.mode());
    };
    updateMode();
  }

  return { wrapper, updateClear, updateMode };
}

/** Wraps a controller's `update` so options captured in the mount closure
 *  (clearable, allowModeToggle, opens/drops, autoUpdateInput, appendTo)
 *  take effect live instead of only at construction time. */
function makeLiveUpdate<T extends { update: (patch: Partial<O>) => void; getState: () => { isOpen: boolean } }, O>(
  controller: T,
  merged: O,
  refresh: () => void,
): void {
  const base = controller.update.bind(controller);
  controller.update = (patch: Partial<O>) => {
    Object.assign(merged as object, patch);
    base(patch);
    refresh();
  };
}

function trackPosition(trigger: HTMLElement, portal: HTMLElement, options: { opens?: 'left' | 'right' | 'center' | 'auto'; drops?: 'down' | 'up' | 'auto' }, getOpen: () => boolean): () => void {
  let raf = 0;
  function reposition() {
    if (!getOpen() || portal.style.display === 'none') return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => positionPopup(trigger, portal, options));
  }
  document.addEventListener('scroll', reposition, { passive: true, capture: true });
  window.addEventListener('resize', reposition);
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
}

export function mountDateRangePicker(target: HTMLInputElement | HTMLElement, options: DateRangePickerOptions = {}): PickerInstance<DateRangeResult, DateRangePickerOptions> {
  const merged = { ...defaults, ...options } as DateRangePickerOptions;
  const controller = createDateRangeController(merged);
  const trigger = target instanceof HTMLInputElement ? target : document.createElement('button');
  if (!(target instanceof HTMLInputElement)) {
    trigger.setAttribute('type', 'button');
    target.appendChild(trigger);
  }
  trigger.classList.add('ndp-trigger');
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'dialog');
  const allowInput = trigger instanceof HTMLInputElement && merged.allowInput !== false;
  let segmented: SegmentedField | null = null;
  const portal = document.createElement('div');
  portal.className = 'ndp-panel-root';
  portal.style.display = 'none';
  resolveAppendTo(target, merged.appendTo ?? merged.container).appendChild(portal);

  const unsubscribe = (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(render);
  const outside = (event: MouseEvent) => {
    if (!portal.contains(event.target as Node) && event.target !== trigger) controller.hide();
  };
  const stopTracking = trackPosition(trigger, portal, merged, () => controller.getState().isOpen);

  const inputGroup = trigger instanceof HTMLInputElement
    ? withInputGroup(
      trigger,
      () => merged.clearable !== false && controller.getValue() !== null,
      () => controller.setValue(null),
      { mode: () => controller.getState().mode, toggle: () => controller.toggleMode(), enabled: () => merged.allowModeToggle !== false },
    )
    : null;

  function updateInput(value = controller.getValue()): void {
    if (segmented?.isEditing()) return;
    if (!(trigger instanceof HTMLInputElement)) {
      trigger.textContent = value?.formatted ?? 'Select date range';
      return;
    }
    trigger.value = merged.autoUpdateInput !== false ? (value?.formatted ?? '') : trigger.value;
  }

  let wasOpen = false;
  function render(): void {
    const state = controller.getState();
    trigger.setAttribute('aria-expanded', state.isOpen ? 'true' : 'false');
    updateInput();
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    portal.style.display = state.isOpen ? 'block' : 'none';
    if (state.isOpen) {
      renderRangePanel(portal, controller);
      if (!wasOpen) positionPopup(trigger, portal, merged);
    } else {
      portal.innerHTML = '';
    }
    wasOpen = state.isOpen;
  }

  if (trigger instanceof HTMLInputElement) {
    trigger.readOnly = !allowInput;
    if (allowInput) {
      segmented = attachSegmentedField(trigger, {
        ...rangeSchema({ yearBounds: () => controller.yearBounds() }),
        committed: () => controller.typedString(),
        reference: () => controller.typedReference(),
        formatted: () => controller.getValue()?.formatted ?? '',
        validate: (ascii) => controller.validateTyped(ascii),
        commit: (ascii) => controller.commitTyped(ascii),
        open: () => controller.show(),
        close: () => controller.hide(),
      });
    }
  }
  if (!allowInput) {
    trigger.addEventListener('keydown', (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.key === 'Escape' && controller.getState().isOpen) { e.preventDefault(); controller.hide(); }
      else if ((e.key === 'ArrowDown' || e.key === 'Down') && !controller.getState().isOpen) { e.preventDefault(); controller.show(); }
    });
    trigger.addEventListener('focus', () => controller.show());
  }
  trigger.addEventListener('click', () => controller.show());
  document.addEventListener('mousedown', outside, true);
  controller.onChange((value) => {
    updateInput(value);
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    target.dispatchEvent(new CustomEvent('apply.nepaliDateRangePicker', { bubbles: true, detail: value }));
  });
  render();

  makeLiveUpdate(controller, merged, () => {
    if (controller.getState().isOpen) positionPopup(trigger, portal, merged);
  });

  let igWrapper: HTMLElement | null = null;
  if (inputGroup) igWrapper = inputGroup.wrapper;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
    segmented?.destroy();
    if (igWrapper) igWrapper.remove();
    document.removeEventListener('mousedown', outside, true);
    portal.remove();
    baseDestroy();
  };
  return controller;
}

export function mountDateTimePicker(target: HTMLInputElement | HTMLElement, options: DateTimePickerOptions = {}): PickerInstance<DateTimeResult, DateTimePickerOptions> {
  const merged = { ...defaults, ...options } as DateTimePickerOptions;
  const controller = createDateTimeController(merged);
  const trigger = target instanceof HTMLInputElement ? target : document.createElement('button');
  if (!(target instanceof HTMLInputElement)) {
    trigger.setAttribute('type', 'button');
    target.appendChild(trigger);
  }
  trigger.classList.add('ndp-trigger');
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'dialog');
  const portal = document.createElement('div');
  portal.className = 'ndp-panel-root';
  portal.style.display = 'none';
  resolveAppendTo(target, merged.appendTo).appendChild(portal);
  const unsubscribe = (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(render);
  const outside = (event: MouseEvent) => {
    if (!portal.contains(event.target as Node) && event.target !== trigger) controller.hide();
  };
  const stopTracking = trackPosition(trigger, portal, merged, () => controller.getState().isOpen);

  const inputGroup = trigger instanceof HTMLInputElement
    ? withInputGroup(
      trigger,
      () => merged.clearable !== false && controller.getValue() !== null,
      () => controller.setValue(null),
      { mode: () => controller.getState().mode, toggle: () => controller.toggleMode(), enabled: () => merged.allowModeToggle !== false },
    )
    : null;

  const allowInput = trigger instanceof HTMLInputElement && merged.allowInput !== false;
  let segmented: SegmentedField | null = null;

  function updateInput(value = controller.getValue()): void {
    // Never overwrite the field while the user is editing its segments.
    if (segmented?.isEditing()) return;
    const label = value?.formatted ?? 'Select date';
    if (trigger instanceof HTMLInputElement) trigger.value = label === 'Select date' ? '' : label;
    else trigger.textContent = label;
  }

  let wasOpen = false;
  function render(): void {
    const state = controller.getState();
    trigger.setAttribute('aria-expanded', state.isOpen ? 'true' : 'false');
    updateInput();
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    portal.style.display = state.isOpen ? 'block' : 'none';
    if (state.isOpen) {
      renderDateTimePanel(portal, controller);
      if (!wasOpen) positionPopup(trigger, portal, merged);
    } else {
      portal.innerHTML = '';
    }
    wasOpen = state.isOpen;
  }

  // The mount owns the input's read-only state (framework wrappers may render it
  // read-only by default): a typeable field becomes a native-date-style
  // segmented editor; otherwise it stays locked.
  if (trigger instanceof HTMLInputElement) {
    trigger.readOnly = !allowInput;
    if (allowInput) {
      segmented = attachSegmentedField(trigger, {
        ...dateSchema({
          yearBounds: () => controller.yearBounds(),
          withTime: () => !!merged.withTime,
          hour12: () => merged.timeFormat === '12h',
        }),
        committed: () => controller.typedString(),
        reference: () => controller.typedReference(),
        formatted: () => controller.getValue()?.formatted ?? '',
        validate: (ascii) => controller.validateTyped(ascii),
        commit: (ascii) => controller.commitTyped(ascii),
        open: () => controller.show(),
        close: () => controller.hide(),
      });
    }
  }

  // Keyboard for the non-typeable (read-only) field: Escape closes,
  // Down/Alt+Down opens — the ARIA combobox pattern. The segmented editor
  // handles its own keys when typing is allowed.
  if (!allowInput) {
    trigger.addEventListener('keydown', (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.key === 'Escape' && controller.getState().isOpen) {
        e.preventDefault();
        controller.hide();
      } else if ((e.key === 'ArrowDown' || e.key === 'Down') && !controller.getState().isOpen) {
        e.preventDefault();
        controller.show();
      }
    });
  }

  if (!allowInput) trigger.addEventListener('focus', () => controller.show());
  trigger.addEventListener('click', () => controller.show());
  document.addEventListener('mousedown', outside, true);
  controller.onChange((value) => {
    updateInput(value);
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    target.dispatchEvent(new CustomEvent('select.nepaliDatePicker', { bubbles: true, detail: value }));
  });
  render();

  makeLiveUpdate(controller, merged, () => {
    if (controller.getState().isOpen) positionPopup(trigger, portal, merged);
  });

  let igWrapper: HTMLElement | null = null;
  if (inputGroup) igWrapper = inputGroup.wrapper;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
    segmented?.destroy();
    if (igWrapper) igWrapper.remove();
    document.removeEventListener('mousedown', outside, true);
    portal.remove();
    baseDestroy();
  };
  return controller;
}

export function mountMonthPicker(target: HTMLInputElement | HTMLElement, options: MonthPickerOptions = {}): PickerInstance<MonthResult, MonthPickerOptions> {
  const merged = { ...defaults, ...options } as MonthPickerOptions;
  const controller = createMonthPickerController(merged);
  const trigger = target instanceof HTMLInputElement ? target : document.createElement('button');
  if (!(target instanceof HTMLInputElement)) {
    trigger.setAttribute('type', 'button');
    target.appendChild(trigger);
  }
  trigger.classList.add('ndp-trigger');
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'dialog');
  const allowInput = trigger instanceof HTMLInputElement && merged.allowInput !== false;
  let segmented: SegmentedField | null = null;
  const portal = document.createElement('div');
  portal.className = 'ndp-panel-root';
  portal.style.display = 'none';
  resolveAppendTo(target, merged.appendTo ?? merged.container).appendChild(portal);
  const unsubscribe = (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(render);
  const outside = (event: MouseEvent) => {
    if (!portal.contains(event.target as Node) && event.target !== trigger) controller.hide();
  };
  const stopTracking = trackPosition(trigger, portal, merged, () => controller.getState().isOpen);

  const inputGroup = trigger instanceof HTMLInputElement
    ? withInputGroup(trigger, () => merged.clearable !== false && controller.getValue() !== null, () => controller.setValue(null))
    : null;

  function updateInput(value = controller.getValue()): void {
    if (segmented?.isEditing()) return;
    const label = value?.formatted ?? '';
    if (trigger instanceof HTMLInputElement) trigger.value = label;
    else trigger.textContent = label || 'Select month';
  }

  let wasOpen = false;
  function render(): void {
    const state = controller.getState();
    trigger.setAttribute('aria-expanded', state.isOpen ? 'true' : 'false');
    updateInput();
    inputGroup?.updateClear();
    portal.style.display = state.isOpen ? 'block' : 'none';
    if (state.isOpen) {
      renderMonthPickerPanel(portal, controller);
      if (!wasOpen) positionPopup(trigger, portal, merged);
    } else {
      portal.innerHTML = '';
    }
    wasOpen = state.isOpen;
  }

  if (trigger instanceof HTMLInputElement) {
    trigger.readOnly = !allowInput;
    if (allowInput) {
      segmented = attachSegmentedField(trigger, {
        ...monthSchema({ yearBounds: () => controller.yearBounds() }),
        committed: () => controller.typedString(),
        reference: () => controller.typedReference(),
        formatted: () => controller.getValue()?.formatted ?? '',
        validate: (ascii) => controller.validateTyped(ascii),
        commit: (ascii) => controller.commitTyped(ascii),
        open: () => controller.show(),
        close: () => controller.hide(),
      });
    }
  }
  if (!allowInput) {
    trigger.addEventListener('keydown', (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.key === 'Escape' && controller.getState().isOpen) { e.preventDefault(); controller.hide(); }
      else if ((e.key === 'ArrowDown' || e.key === 'Down') && !controller.getState().isOpen) { e.preventDefault(); controller.show(); }
    });
    trigger.addEventListener('focus', () => controller.show());
  }
  trigger.addEventListener('click', () => controller.show());
  document.addEventListener('mousedown', outside, true);
  controller.onChange((value) => {
    updateInput(value);
    inputGroup?.updateClear();
    target.dispatchEvent(new CustomEvent('select.nepaliMonthPicker', { bubbles: true, detail: value }));
  });
  render();

  makeLiveUpdate(controller, merged, () => {
    if (controller.getState().isOpen) positionPopup(trigger, portal, merged);
  });

  let igWrapper: HTMLElement | null = null;
  if (inputGroup) igWrapper = inputGroup.wrapper;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
    segmented?.destroy();
    if (igWrapper) igWrapper.remove();
    document.removeEventListener('mousedown', outside, true);
    portal.remove();
    baseDestroy();
  };
  return controller;
}

export function autoInit(root: ParentNode = document): void {
  root.querySelectorAll<HTMLInputElement>('[data-nepali-datepicker]').forEach((input) => mountDateTimePicker(input, {
    withTime: input.dataset.withTime === 'true',
    timeFormat: input.dataset.timeFormat === '12h' ? '12h' : input.dataset.timeFormat === '24h' ? '24h' : undefined,
    minuteStep: input.dataset.minuteStep ? Number(input.dataset.minuteStep) : undefined,
  }));
  root.querySelectorAll<HTMLInputElement>('[data-nepali-daterange]').forEach((input) => mountDateRangePicker(input, {
    fiscalStartMonth: input.dataset.fiscalStartMonth ? Number(input.dataset.fiscalStartMonth) : undefined,
  }));
  root.querySelectorAll<HTMLInputElement>('[data-nepali-monthpicker]').forEach((input) => mountMonthPicker(input, {}));
}

export function formatBoundRange(value: DateRangeResult): string {
  return formatRange(value.start, value.end, defaultCalendarAdapter, { mode: 'BS', locale: 'ne' });
}

export function formatBoundDate(value: DateTimeResult): string {
  return formatDateValue(value.ad, defaultCalendarAdapter, { mode: 'BS', locale: 'ne' });
}
