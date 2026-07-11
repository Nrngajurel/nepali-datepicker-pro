import { createDateRangeController } from '../application/date-range-controller.js';
import { createDateTimeController } from '../application/date-time-controller.js';
import { createMonthPickerController } from '../application/month-picker-controller.js';
import { formatDateValue, formatRange } from '../format/index.js';
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

/** Wraps the trigger in an input-group container with an optional clear
 *  button and optional BS/AD mode switch segment on the right edge. */
function withInputGroup(
  trigger: HTMLElement,
  shouldShowClear: () => boolean,
  onClear: () => void,
  modeSwitch?: { mode: () => 'BS' | 'AD'; toggle: () => void },
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
    btn.setAttribute('aria-label', `Switch to ${modeSwitch.mode() === 'BS' ? 'AD' : 'BS'}`);
    btn.innerHTML = '&#8694;';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      modeSwitch.toggle();
    });
    wrapper.appendChild(btn);

    updateMode = () => {
      btn.setAttribute('aria-label', `Switch to ${modeSwitch.mode() === 'BS' ? 'AD' : 'BS'}`);
      btn.setAttribute('data-mode', modeSwitch.mode());
    };
  }

  return { wrapper, updateClear, updateMode };
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
  const portal = document.createElement('div');
  portal.className = 'ndp-panel-root';
  portal.style.display = 'none';
  resolveAppendTo(target, merged.appendTo ?? merged.container).appendChild(portal);

  const unsubscribe = (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(render);
  const outside = (event: MouseEvent) => {
    if (!portal.contains(event.target as Node) && event.target !== trigger) controller.hide();
  };
  const stopTracking = trackPosition(trigger, portal, merged, () => controller.getState().isOpen);

  const inputGroup = trigger instanceof HTMLInputElement && (merged.clearable !== false || merged.allowModeToggle !== false)
    ? withInputGroup(
      trigger,
      () => merged.clearable !== false && controller.getValue() !== null,
      () => controller.setValue(null),
      merged.allowModeToggle !== false
        ? { mode: () => controller.getState().mode, toggle: () => controller.toggleMode() }
        : undefined,
    )
    : null;

  function updateInput(value = controller.getValue()): void {
    if (!(trigger instanceof HTMLInputElement)) {
      trigger.textContent = value?.formatted ?? 'Select date range';
      return;
    }
    if (merged.autoUpdateInput !== false) trigger.value = value?.formatted ?? '';
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

  trigger.addEventListener('focus', () => controller.show());
  trigger.addEventListener('click', () => controller.show());
  document.addEventListener('mousedown', outside, true);
  controller.onChange((value) => {
    updateInput(value);
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    target.dispatchEvent(new CustomEvent('apply.nepaliDateRangePicker', { bubbles: true, detail: value }));
  });
  render();

  let igWrapper: HTMLElement | null = null;
  if (inputGroup) igWrapper = inputGroup.wrapper;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
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
      merged.allowModeToggle !== false
        ? { mode: () => controller.getState().mode, toggle: () => controller.toggleMode() }
        : undefined,
    )
    : null;

  function updateInput(value = controller.getValue()): void {
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

  trigger.addEventListener('focus', () => controller.show());
  trigger.addEventListener('click', () => controller.show());
  document.addEventListener('mousedown', outside, true);
  controller.onChange((value) => {
    updateInput(value);
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    target.dispatchEvent(new CustomEvent('select.nepaliDatePicker', { bubbles: true, detail: value }));
  });
  render();

  let igWrapper: HTMLElement | null = null;
  if (inputGroup) igWrapper = inputGroup.wrapper;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
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
  const portal = document.createElement('div');
  portal.className = 'ndp-panel-root';
  portal.style.display = 'none';
  resolveAppendTo(target, merged.appendTo ?? merged.container).appendChild(portal);
  const unsubscribe = (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(render);
  const outside = (event: MouseEvent) => {
    if (!portal.contains(event.target as Node) && event.target !== trigger) controller.hide();
  };
  const stopTracking = trackPosition(trigger, portal, merged, () => controller.getState().isOpen);

  const inputGroup = merged.clearable !== false && trigger instanceof HTMLInputElement
    ? withInputGroup(trigger, () => controller.getValue() !== null, () => controller.setValue(null))
    : null;

  function updateInput(value = controller.getValue()): void {
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

  trigger.addEventListener('focus', () => controller.show());
  trigger.addEventListener('click', () => controller.show());
  document.addEventListener('mousedown', outside, true);
  controller.onChange((value) => {
    updateInput(value);
    inputGroup?.updateClear();
    target.dispatchEvent(new CustomEvent('select.nepaliMonthPicker', { bubbles: true, detail: value }));
  });
  render();

  let igWrapper: HTMLElement | null = null;
  if (inputGroup) igWrapper = inputGroup.wrapper;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
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
