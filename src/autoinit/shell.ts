// The mount every picker shares: claims the field, wraps it in the input group
// (icon, clear, BS/AD switch, calendar label), wires the popup (positioning,
// keyboard, modal sheet, swipe), typing, validation and form integration, and
// keeps it all in sync with a controller. Each picker's mount supplies only
// its controller, panel renderer, typing schema and machine values.
import type { UiConfig } from '../application/ui.js';
import type { CalendarAdapter, CalendarMode, CommonPickerOptions, DateRangePickerOptions, DateTimePickerOptions, InvalidReason, PickerTheme } from '../types.js';
import { dayAscii } from '../application/calendar-core.js';
import { createDateValue } from '../domain/date-value.js';
import { attachSegmentedField } from './segmented-field.js';
import type { SegmentedField, SegmentedFieldConfig } from './segmented-field.js';
import { load, loaded } from '../render/lazy.js';
import { paintModeToggle } from '../render/mode-toggle.js';
import { resetAnnouncements } from '../render/panel-state.js';

/** Ready-made defaults for `setDefaults(regional.ne)`: Nepali or English UI text
 *  (and, for the range picker, its daterangepicker-style locale block). */
export const regional = {
  ne: { language: 'ne' as const, locale: { separator: ' – ', applyLabel: 'लागू गर्नुहोस्', cancelLabel: 'रद्द गर्नुहोस्', firstDay: 0 } },
  en: { language: 'en' as const, locale: { separator: ' – ', applyLabel: 'Apply', cancelLabel: 'Cancel', firstDay: 0 } },
};

let defaults: Partial<DateTimePickerOptions & DateRangePickerOptions> = {};

/** The options set with setDefaults(), merged under each picker's own. */
export function getDefaults(): Partial<DateTimePickerOptions & DateRangePickerOptions> {
  return defaults;
}

export function setDefaults(options: Partial<DateTimePickerOptions & DateRangePickerOptions>): void {
  defaults = { ...defaults, ...options };
}

// Elements a picker is currently mounted on, so autoInit() can be called again
// (after AJAX/Turbo swaps in new content) without double-mounting old fields.
const mountedTargets = new WeakSet<HTMLElement>();

/** Whether a picker is mounted on the element (autoInit skips it). */
export function isMounted(el: HTMLElement): boolean {
  return mountedTargets.has(el);
}

let idCounter = 0;
const nextId = (): string => `ndp-popup-${(idCounter += 1)}`;

/** Takes over the element a picker is mounted on and records what mounting
 *  changes, so `destroy()` can hand it back untouched: the input is moved back
 *  out of the input-group wrapper (rather than removed with it), its original
 *  attributes are restored, and every listener the mount added to it — passed
 *  `{ signal }` — is dropped. A non-input target gets a generated button
 *  trigger, which `release` removes; an inline calendar on a non-input target
 *  gets no trigger at all. */
function claimTrigger(target: HTMLInputElement | HTMLElement, headless: boolean): {
  trigger: HTMLInputElement | HTMLButtonElement | null;
  signal: AbortSignal;
  release: (wrapper: HTMLElement | null) => void;
} {
  const listeners = new AbortController();
  mountedTargets.add(target);
  if (headless) {
    return {
      trigger: null,
      signal: listeners.signal,
      release() {
        listeners.abort();
        mountedTargets.delete(target);
      },
    };
  }
  const created = !(target instanceof HTMLInputElement);
  const trigger = target instanceof HTMLInputElement ? target : document.createElement('button');
  if (created) {
    trigger.setAttribute('type', 'button');
    target.appendChild(trigger);
  }
  const saved = ['class', 'role', 'aria-haspopup', 'aria-expanded', 'aria-controls', 'aria-describedby', 'aria-invalid', 'aria-required', 'aria-disabled', 'name', 'readonly', 'disabled', 'inputmode', 'autocomplete', 'spellcheck', 'autocapitalize', 'placeholder']
    .map((name) => [name, trigger.getAttribute(name)] as const);
  trigger.classList.add('ndp-trigger');
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'dialog');
  return {
    trigger,
    signal: listeners.signal,
    release(wrapper) {
      listeners.abort();
      mountedTargets.delete(target);
      if (wrapper?.contains(trigger)) wrapper.replaceWith(trigger);
      else wrapper?.remove();
      if (created) {
        trigger.remove();
        return;
      }
      saved.forEach(([name, value]) => (value === null ? trigger.removeAttribute(name) : trigger.setAttribute(name, value)));
    },
  };
}

// Only one picker popup is open at a time: opening one closes the previous.
let openPicker: { hide(): void } | null = null;

function noteOpen(picker: { hide(): void }, open: boolean): void {
  if (open) {
    if (openPicker && openPicker !== picker) openPicker.hide();
    openPicker = picker;
  } else if (openPicker === picker) {
    openPicker = null;
  }
}

// Close when keyboard focus moves somewhere outside the picker (e.g. Tab to
// the next field). Focus moving with no new target (a click on empty space,
// the window losing focus) is left to the outside-click handler.
function closeWhenFocusLeaves(sources: HTMLElement[], inside: HTMLElement[], signal: AbortSignal, hide: () => void): void {
  const onFocusOut = (event: Event): void => {
    const next = (event as FocusEvent).relatedTarget;
    if (next instanceof Node && !inside.some((el) => el.contains(next))) hide();
  };
  sources.forEach((el) => el.addEventListener('focusout', onFocusOut, { signal }));
}

// Keyboard in and out of the popup:
// - Alt+↓ (or ↓ on a read-only field) moves focus into the open popup, onto
//   its tabbable day / month / year (data-ndp-entry, see render/parts.ts).
// - Escape inside the popup closes it and puts focus back on the field.
// - When the popup closes with focus inside it (Escape, or a keyboard pick
//   that closes it), focus returns to the field — without that focus
//   reopening the popup, which a focus on the field normally does.
function popupKeyboard(
  trigger: HTMLElement | null,
  portal: HTMLElement,
  controller: { show(): void; hide(): void; getState(): { isOpen: boolean } },
  signal: AbortSignal,
  inline: boolean,
): { showOnFocus: () => void; beforeClose: () => void; focusTrigger: () => void; afterPaint: () => void } {
  let quiet = false;
  // Alt+↓ before the popup's code has loaded: focus the grid once it's drawn.
  let wantEntry = false;
  const focusEntry = (): void => {
    const entry = portal.querySelector<HTMLElement>('[data-ndp-entry]');
    wantEntry = !entry;
    entry?.focus();
  };
  const focusTrigger = (): void => {
    if (!trigger) return;
    quiet = true;
    trigger.focus();
    quiet = false;
  };
  if (!inline) {
    portal.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key !== 'Escape') return;
      event.preventDefault();
      controller.hide();
      focusTrigger();
    }, { signal });
  }
  trigger?.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const readOnly = !(trigger instanceof HTMLInputElement) || trigger.readOnly;
    const enter = e.key === 'ArrowDown' && (e.altKey || (readOnly && controller.getState().isOpen) || (inline && e.altKey));
    if (!enter) return;
    e.preventDefault();
    controller.show();
    focusEntry();
  }, { signal });
  return {
    showOnFocus: () => {
      if (!quiet) controller.show();
    },
    beforeClose: () => {
      if (portal.contains(document.activeElement)) focusTrigger();
    },
    focusTrigger,
    afterPaint: () => {
      if (wantEntry && controller.getState().isOpen) focusEntry();
    },
  };
}

function resolveAppendTo(appendTo?: string | HTMLElement): HTMLElement {
  if (appendTo instanceof HTMLElement) return appendTo;
  if (typeof appendTo === 'string') return document.querySelector<HTMLElement>(appendTo) ?? document.body;
  return document.body;
}

function resolveTarget(ref?: string | HTMLElement): HTMLElement | null {
  if (ref instanceof HTMLElement) return ref;
  if (typeof ref === 'string') return document.querySelector<HTMLElement>(ref);
  return null;
}

// Write a machine value into a form field (input/textarea/select) or element.
function writeTargetValue(el: HTMLElement, value: string): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) el.value = value;
  else el.textContent = value;
}

// Create a hidden <input name> inside the wrapper to carry the machine value,
// and stop the visible input from also submitting its (display) value.
function createHiddenSubmit(name: string, wrapper: HTMLElement, visible: HTMLInputElement): HTMLInputElement {
  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.name = name;
  wrapper.appendChild(hidden);
  if (visible.getAttribute('name')) visible.removeAttribute('name');
  return hidden;
}

/** Wraps the trigger in an input-group container with a clear button and an
 *  optional BS/AD mode switch. Both buttons are always created; their
 *  visibility is decided live by the predicates so options like `clearable`
 *  and `allowModeToggle` can be toggled at runtime via `update()`. */
const CALENDAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/></svg>';

// Play a one-shot feedback animation on the field (restarting it if it's
// already running), cleaned up when it ends.
function flash(node: HTMLElement | null | undefined, className: string): void {
  if (!node) return;
  node.classList.remove(className);
  void node.offsetWidth; // restart the animation
  node.classList.add(className);
  const done = (): void => {
    node.classList.remove(className);
    node.removeEventListener('animationend', done);
  };
  node.addEventListener('animationend', done);
  window.setTimeout(done, 700); // reduced motion: no animation, no animationend
}

/** Wraps the trigger in an input-group container: an optional calendar icon,
 *  a clear button, and the BS/AD switch (or a static calendar badge). The
 *  buttons are always created; their visibility is decided live by the
 *  predicates so options like `clearable` and `allowModeToggle` can be
 *  toggled at runtime via `update()`. */
function withInputGroup(
  trigger: HTMLInputElement,
  signal: AbortSignal,
  shouldShowClear: () => boolean,
  onClear: () => void,
  ui: () => UiConfig,
  showIcon: () => boolean,
  onIcon: () => void,
  modeSwitch?: { mode: () => CalendarMode; toggle: () => void; enabled: () => boolean },
): { wrapper: HTMLElement; updateClear: () => void; updateMode: () => void } {
  const wrapper = document.createElement('div');
  wrapper.className = 'ndp-trigger-wrap';
  trigger.parentNode?.insertBefore(wrapper, trigger);
  wrapper.appendChild(trigger);

  // ---- leading calendar icon: the "this is a date field" affordance -------
  const icon = document.createElement('span');
  icon.className = 'ndp-field-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = CALENDAR_ICON;
  icon.addEventListener('mousedown', (e) => e.preventDefault());
  icon.addEventListener('click', () => {
    if (!trigger.disabled) {
      trigger.focus();
      onIcon();
    }
  });
  wrapper.insertBefore(icon, trigger);

  // ---- clear: keyboard shortcut first, a quiet × button as the fallback ----
  // Ctrl/⌘ + Backspace/Delete clears from the keyboard (a typeable field keeps
  // plain Backspace for editing one section); a read-only trigger also takes
  // plain Backspace/Delete. The × stays out of the Tab order so tabbing through
  // a form never stops on it, and only shows on hover/focus where there's a
  // pointer that can hover (see theme.css).
  trigger.addEventListener('keydown', (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const readOnly = trigger.readOnly;
    const shortcut = (e.ctrlKey || e.metaKey) && !e.altKey;
    const plain = readOnly && !e.ctrlKey && !e.metaKey && !e.altKey;
    if ((shortcut || plain) && shouldShowClear()) {
      e.preventDefault();
      onClear();
    }
  }, { signal });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'ndp-clear';
  clearBtn.setAttribute('type', 'button');
  clearBtn.setAttribute('tabindex', '-1');
  clearBtn.setAttribute('aria-keyshortcuts', 'Control+Backspace Meta+Backspace');
  clearBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  clearBtn.style.display = 'none';
  clearBtn.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus where it is
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClear();
  });
  wrapper.appendChild(clearBtn);

  function updateClear() {
    const filled = shouldShowClear();
    clearBtn.style.display = filled ? '' : 'none';
    clearBtn.setAttribute('aria-label', ui().strings.clear);
    clearBtn.title = `${ui().strings.clear} (Ctrl/⌘ + Backspace)`;
    icon.style.display = showIcon() ? '' : 'none';
    wrapper.classList.toggle('has-icon', showIcon());
  }

  // ---- mode switch segment ----
  let updateMode = () => {};
  if (modeSwitch) {
    const btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      modeSwitch.toggle();
      flash(btn, 'is-switched');
    });
    wrapper.appendChild(btn);

    updateMode = () => {
      btn.style.display = modeSwitch.enabled() ? '' : 'none';
      paintModeToggle(btn, modeSwitch.mode(), ui());
      wrapper.setAttribute('data-mode', modeSwitch.mode());
    };
    updateMode();
  }
  updateClear();

  return { wrapper, updateClear, updateMode };
}

/** Wraps a controller's `update` so options captured in the mount closure
 *  (clearable, allowModeToggle, opens/drops, autoUpdateInput, appendTo, theme,
 *  disabled, required) take effect live instead of only at construction time. */
function makeLiveUpdate<T extends { update: (patch: Partial<O>) => void }, O>(
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

function trackPosition(reposition: (event?: Event) => void): () => void {
  document.addEventListener('scroll', reposition, { passive: true, capture: true });
  window.addEventListener('resize', reposition);
  return () => {
    document.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };
}

// ---- the shared mount ---------------------------------------------------------

interface ShellController {
  getState(): { isOpen: boolean; mode?: CalendarMode };
  getValue(): { formatted: string } | null;
  setValue(value: never): void;
  show(): void;
  hide(): void;
  clear(): void;
  update(patch: never): void;
  destroy(): void;
  onChange(cb: (value: { formatted: string }) => void): () => void;
  onClear(cb: () => void): () => void;
  typedString(): string;
  typedReference(): string;
  validateTyped(text: string): 'valid' | 'invalid' | 'empty';
  commitTyped(text: string): 'valid' | 'invalid' | 'empty';
  typedError(text: string): InvalidReason | null;
  invalidMessage(reason: InvalidReason): string;
  getUi(): UiConfig;
  toggleMode?(): void;
}

export type ShellOptions = CommonPickerOptions & {
  appendTo?: string | HTMLElement;
  container?: string | HTMLElement;
  opens?: 'left' | 'right' | 'center' | 'auto';
  drops?: 'down' | 'up' | 'auto';
  clearable?: boolean;
  allowInput?: boolean;
  allowModeToggle?: boolean;
  autoUpdateInput?: boolean;
  submitName?: string | { start: string; end: string };
  altField?: string | HTMLElement | { start: string | HTMLElement; end: string | HTMLElement };
  value?: unknown;
  defaultValue?: unknown;
};

interface ShellSpec {
  events: { change: string; clear: string };
  /** Draw the popup; only called once `panelReady()`. */
  renderPanel(root: HTMLElement): void;
  /** Whether the popup's code has loaded (it's split off — see render/lazy). */
  panelReady(): boolean;
  loadPanel(): Promise<unknown>;
  schema(): Pick<SegmentedFieldConfig, 'schema' | 'seed' | 'toAscii' | 'placeholder'>;
  emptyLabel(): string;
  /** Machine values for the submit/alt fields, or null when empty. */
  machine(): { combined: string; start: string; end: string } | null;
  modeSwitch: boolean;
  /** Show " BS" / " AD" after the field's value (pickers with a calendar mode). */
  calendarSuffix: boolean;
  paste(text: string): boolean | Promise<boolean>;
  /** Page the calendar by one (swipe). */
  page(delta: number): void;
}

export function mountShell<C extends ShellController>(target: HTMLInputElement | HTMLElement, merged: ShellOptions, controller: C, spec: ShellSpec): C {
  const inline = !!merged.inline;
  const headless = inline && !(target instanceof HTMLInputElement);
  const { trigger, signal, release } = claimTrigger(target, headless);
  const input = trigger instanceof HTMLInputElement ? trigger : null;
  const allowInput = !!input && merged.allowInput !== false;
  let segmented: SegmentedField | null = null;
  // "BS" / "AD" right after the date: which calendar the field is in. A
  // separate element, not part of the input's text — text in an input can be
  // scrolled out of view, the label must never be.
  const suffix = (): string => {
    if (!spec.calendarSuffix || merged.showCalendarSuffix === false) return '';
    const s = controller.getUi().strings;
    return (controller.getState().mode ?? 'BS') === 'AD' ? s.calendarAd : s.calendarBs;
  };
  const shown = (formatted: string | undefined | null): string => formatted ?? '';

  const portal = document.createElement('div');
  portal.className = inline ? 'ndp-panel-root ndp-inline' : 'ndp-panel-root';
  portal.id = nextId();
  portal.style.display = inline ? 'block' : 'none';
  // Out of the page flow from the start, so the first render (before it's
  // positioned) never lands at the bottom of the document.
  if (!inline) portal.style.position = 'fixed';
  if (!inline) resolveAppendTo(merged.appendTo ?? merged.container).appendChild(portal);
  trigger?.setAttribute('aria-controls', portal.id);
  const keys = popupKeyboard(trigger, portal, controller, signal, inline);
  // Sheet, Tab trap and swipe arrive with the popup's code (render/popup).
  let modal = { enter: () => {}, leave: () => {} };
  let wired = false;
  const popupReady = (): boolean => {
    const popup = loaded('popup');
    if (!popup) return false;
    if (!wired) {
      wired = true;
      modal = popup.makeModal(portal);
      if (!inline) popup.trapTab(portal, signal);
      popup.wireSwipe(portal, signal, spec.page);
    }
    return true;
  };
  const loadPopup = (): Promise<unknown> => Promise.all([spec.loadPanel(), load('popup')]);

  const unsubscribe = (controller as unknown as { onStateChange: (cb: () => void) => () => void }).onStateChange(render);
  const outside = (event: MouseEvent) => {
    // A tap on the portal itself (not the panel inside it) is the bottom
    // sheet's backdrop, so it closes too.
    if (event.target === portal || (!portal.contains(event.target as Node) && event.target !== trigger)) controller.hide();
  };

  const inputGroup = input
    ? withInputGroup(
      input,
      signal,
      () => merged.clearable !== false && !merged.disabled && controller.getValue() !== null,
      () => controller.clear(),
      () => controller.getUi(),
      () => merged.showFieldIcon !== false,
      () => controller.show(),
      spec.modeSwitch && controller.toggleMode
        ? {
          mode: () => controller.getState().mode ?? 'BS',
          toggle: () => controller.toggleMode!(),
          enabled: () => merged.allowModeToggle !== false,
        }
        : undefined,
    )
    : null;

  // Validation: a message under the field (linked to it for screen readers),
  // and a never-shown sentinel input carrying native constraint validation
  // (`required`, setCustomValidity) — the field itself may be read-only, and
  // read-only inputs are skipped by form validation.
  let message: HTMLElement | null = null;
  let sentinel: HTMLInputElement | null = null;
  if (input && inputGroup) {
    message = document.createElement('div');
    message.className = 'ndp-field-message';
    message.id = `${portal.id}-message`;
    message.setAttribute('aria-live', 'polite');
    inputGroup.wrapper.after(message);
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), message.id].filter(Boolean).join(' '));
    sentinel = document.createElement('input');
    sentinel.className = 'ndp-validity';
    sentinel.tabIndex = -1;
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.setAttribute('autocomplete', 'off');
    Object.assign(sentinel.style, { position: 'absolute', left: '0', bottom: '0', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', border: '0', padding: '0' });
    inputGroup.wrapper.appendChild(sentinel);
    sentinel.addEventListener('invalid', (event) => {
      event.preventDefault(); // our message, not a bubble on an invisible element
      const reason: InvalidReason = currentError ?? 'required';
      showError(reason);
      merged.onInvalid?.(reason, controller.invalidMessage(reason));
      keys.focusTrigger();
    }, { signal });
  }
  if (inline) {
    if (headless) target.appendChild(portal);
    else (message ?? inputGroup?.wrapper ?? trigger!).after(portal);
  }

  let currentError: InvalidReason | null = null;
  function showError(reason: InvalidReason | null): void {
    currentError = reason;
    const text = reason ? controller.invalidMessage(reason) : '';
    if (message) message.textContent = merged.showValidationMessage === false ? '' : text;
    sentinel?.setCustomValidity(reason && reason !== 'required' ? text : '');
    inputGroup?.wrapper.classList.toggle('is-invalid', !!reason);
    if (input) {
      if (reason) input.setAttribute('aria-invalid', 'true');
      else if (!segmented?.isHoldingInvalid()) input.removeAttribute('aria-invalid');
    }
  }

  // Machine value targets for submitName / altField: a single combined field,
  // or a { start, end } pair for the range and month pickers.
  const machineTargets: Array<{ el: HTMLElement; part: 'start' | 'end' | 'combined' }> = [];
  if (input && inputGroup) {
    const sn = merged.submitName;
    if (typeof sn === 'string') machineTargets.push({ el: createHiddenSubmit(sn, inputGroup.wrapper, input), part: 'combined' });
    else if (sn) {
      machineTargets.push({ el: createHiddenSubmit(sn.start, inputGroup.wrapper, input), part: 'start' });
      machineTargets.push({ el: createHiddenSubmit(sn.end, inputGroup.wrapper, input), part: 'end' });
    }
  }
  const af = merged.altField;
  if (af && typeof af === 'object' && !(af instanceof HTMLElement)) {
    const s = resolveTarget(af.start); if (s) machineTargets.push({ el: s, part: 'start' });
    const e = resolveTarget(af.end); if (e) machineTargets.push({ el: e, part: 'end' });
  } else if (af) {
    const el = resolveTarget(af); if (el) machineTargets.push({ el, part: 'combined' });
  }
  function syncMachine(): void {
    const values = spec.machine();
    machineTargets.forEach((t) => writeTargetValue(t.el, values ? values[t.part] : ''));
    if (sentinel) sentinel.value = values?.combined ?? '';
  }

  function updateInput(value = controller.getValue()): void {
    // Never overwrite the field while the user is editing its segments, or
    // while it holds refused text for them to fix (invalidBehavior: 'keep').
    if (segmented?.isEditing() || segmented?.isHoldingInvalid()) return;
    if (!trigger) return;
    if (!input) {
      trigger.textContent = shown(value?.formatted) || spec.emptyLabel();
      return;
    }
    if (merged.autoUpdateInput === false) return;
    input.value = shown(value?.formatted);
    placeSuffix();
  }

  function applyTheme(theme: PickerTheme | undefined = merged.theme): void {
    [portal, inputGroup?.wrapper].forEach((node) => {
      if (!node) return;
      if (theme) node.setAttribute('data-ndp-theme', theme);
      else node.removeAttribute('data-ndp-theme');
    });
  }

  function applyFormState(): void {
    const disabled = !!merged.disabled;
    if (trigger) {
      trigger.disabled = disabled;
      trigger.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (merged.required) trigger.setAttribute('aria-required', 'true');
      else trigger.removeAttribute('aria-required');
    }
    inputGroup?.wrapper.classList.toggle('is-disabled', disabled);
    machineTargets.forEach((t) => { if (t.el instanceof HTMLInputElement && t.el.type === 'hidden') t.el.disabled = disabled; });
    if (sentinel) {
      sentinel.required = !!merged.required;
      sentinel.disabled = disabled;
    }
    portal.toggleAttribute('inert', disabled && inline);
    portal.classList.toggle('is-disabled', disabled);
    if (disabled && !inline) controller.hide();
  }

  // Disabled pickers don't open.
  const baseShow = controller.show.bind(controller);
  controller.show = () => {
    if (merged.disabled && !inline) return;
    baseShow();
  };
  // Inline calendars never close.
  if (inline) controller.hide = () => {};

  let raf = 0;
  function reposition(event?: Event): void {
    if (inline || !trigger || !controller.getState().isOpen || portal.style.display === 'none') return;
    // Scrolling inside the popup (year grid, time wheels, the bottom sheet)
    // doesn't move it relative to the trigger.
    if (event?.type === 'scroll' && event.target instanceof Node && portal.contains(event.target)) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => loaded('popup')?.positionPopup(inputGroup?.wrapper ?? trigger, portal, merged));
  }
  const stopTracking = inline ? () => {} : trackPosition(reposition);
  // Content changing height (another view, a hint appearing) re-places it.
  const resizeObserver = !inline && typeof ResizeObserver === 'function' ? new ResizeObserver(() => reposition()) : null;
  resizeObserver?.observe(portal);

  // The popup's code arrives on first use. Until it has, the popup stays
  // hidden; it opens (and takes Alt+↓ focus) as soon as the code is in.
  let loading = false;
  function loadThenRender(): void {
    if (loading) return;
    loading = true;
    loadPopup().then(() => {
      loading = false;
      if (signal.aborted) return;
      render();
      keys.afterPaint();
    }, (error: unknown) => {
      loading = false;
      console.error('[nepali-datepicker-pro] could not load the picker popup', error);
      if (!inline && !signal.aborted) controller.hide();
    });
  }

  let wasOpen = false;
  function render(): void {
    const state = controller.getState();
    const open = inline || state.isOpen;
    const ready = !open || (spec.panelReady() && popupReady());
    if (!ready) loadThenRender();
    if (!open && wasOpen) {
      modal.leave();
      keys.beforeClose();
      resetAnnouncements(portal);
    }
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    inputGroup?.wrapper.classList.toggle('is-open', open && !inline);
    inputGroup?.wrapper.classList.toggle('is-filled', controller.getValue() !== null);
    updateInput();
    syncMachine();
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    if (inline) {
      if (!ready) return;
      spec.renderPanel(portal);
      wasOpen = true;
      return;
    }
    portal.style.display = open && ready ? 'block' : 'none';
    if (open && !ready) return;
    if (open) {
      spec.renderPanel(portal);
      if (!wasOpen) {
        noteOpen(controller, true);
        const popup = loaded('popup')!;
        popup.positionPopup(inputGroup?.wrapper ?? trigger!, portal, merged);
        popup.playSheetEnter(portal);
        modal.enter();
      }
    } else {
      portal.innerHTML = '';
      if (wasOpen) noteOpen(controller, false);
    }
    wasOpen = open;
  }

  const segmentSchema = spec.schema();

  // ---- the calendar label after the text --------------------------------
  // Positioned at the end of the visible text (or placeholder), measured with
  // a hidden mirror in the input's font. The input keeps room for it on the
  // right, so a long value clips before the label instead of under it.
  let suffixEl: HTMLElement | null = null;
  let mirror: HTMLElement | null = null;
  let suffixFrame = 0;
  if (input && inputGroup && spec.calendarSuffix) {
    suffixEl = document.createElement('span');
    suffixEl.className = 'ndp-cal-suffix';
    suffixEl.setAttribute('aria-hidden', 'true');
    mirror = document.createElement('span');
    mirror.className = 'ndp-cal-suffix-mirror';
    mirror.setAttribute('aria-hidden', 'true');
    input.after(suffixEl, mirror);
    // Layout changes (the field resized, a web font arriving) move the text end.
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => schedulePlaceSuffix());
      observer.observe(inputGroup.wrapper);
      signal.addEventListener('abort', () => observer.disconnect());
    }
    (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(() => schedulePlaceSuffix());
    ['keyup', 'focus', 'blur', 'select', 'scroll', 'input', 'mouseup'].forEach((type) => input.addEventListener(type, () => schedulePlaceSuffix(), { signal }));
  }
  function schedulePlaceSuffix(): void {
    if (!suffixEl) return;
    cancelAnimationFrame(suffixFrame);
    suffixFrame = requestAnimationFrame(placeSuffix);
  }
  function placeSuffix(): void {
    if (!suffixEl || !mirror || !input) return;
    const label = suffix();
    suffixEl.textContent = label;
    suffixEl.style.display = label ? '' : 'none';
    suffixEl.setAttribute('data-mode', controller.getState().mode ?? 'BS');
    suffixEl.classList.toggle('is-placeholder', !input.value);
    if (!label) {
      input.style.paddingRight = '';
      return;
    }
    const style = getComputedStyle(input);
    // Property by property: the computed `font` shorthand is empty whenever
    // a longhand it can't express is set (tabular-nums on the segmented field).
    // The label gets the same font, so it reads as part of the field's text.
    (['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariantNumeric', 'letterSpacing', 'wordSpacing', 'lineHeight'] as const)
      .forEach((prop) => { mirror!.style[prop] = style[prop]; suffixEl!.style[prop] = style[prop]; });
    // About two and a half spaces between the date and the label.
    mirror.textContent = '   ';
    const gap = Math.round(mirror.offsetWidth * 2.5 / 3) || 10;
    mirror.textContent = input.value || input.placeholder;
    const reserve = suffixEl.offsetWidth + gap + 4;
    input.style.paddingRight = `${reserve}px`;
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const textEnd = input.offsetLeft + padLeft + mirror.offsetWidth - input.scrollLeft;
    const maxLeft = input.offsetLeft + input.offsetWidth - reserve + gap;
    suffixEl.style.left = `${Math.max(input.offsetLeft + padLeft, Math.min(textEnd + gap, maxLeft))}px`;
  }

  // The mount owns the input's read-only state (framework wrappers may render it
  // read-only by default): a typeable field becomes a native-date-style
  // segmented editor; otherwise it stays locked.
  if (input) {
    input.readOnly = !allowInput;
    if (allowInput) {
      segmented = attachSegmentedField(input, {
        ...segmentSchema,
        committed: () => controller.typedString(),
        reference: () => controller.typedReference(),
        formatted: () => shown(controller.getValue()?.formatted),
        validate: (ascii) => controller.validateTyped(ascii),
        commit: (ascii) => controller.commitTyped(ascii),
        open: keys.showOnFocus,
        close: () => controller.hide(),
        paste: (text) => {
          const settle = (ok: boolean): boolean => {
            if (ok) showError(null);
            return ok;
          };
          const result = spec.paste(text);
          return typeof result === 'boolean' ? settle(result) : result.then(settle);
        },
        onReject: (ascii) => {
          const reason: InvalidReason = ascii ? controller.typedError(ascii) ?? 'invalid' : 'incomplete';
          showError(reason);
          flash(inputGroup?.wrapper, 'is-rejected');
          merged.onInvalid?.(reason, controller.invalidMessage(reason));
        },
        keepInvalid: () => merged.invalidBehavior === 'keep',
        onEdit: () => { if (currentError) showError(null); },
      });
    }
  }

  // Keyboard for the non-typeable (read-only) field: Escape closes,
  // Down/Alt+Down opens — the ARIA combobox pattern. The segmented editor
  // handles its own keys when typing is allowed.
  if (trigger && !allowInput) {
    trigger.addEventListener('keydown', (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.key === 'Escape' && controller.getState().isOpen) { e.preventDefault(); controller.hide(); }
      else if ((e.key === 'ArrowDown' || e.key === 'Down') && !controller.getState().isOpen) { e.preventDefault(); controller.show(); }
    }, { signal });
    trigger.addEventListener('focus', keys.showOnFocus, { signal });
  }
  trigger?.addEventListener('click', () => controller.show(), { signal });
  // Fetch the popup's code as soon as someone reaches for the field, so it's
  // usually there by the time the click lands.
  const prefetch = (): void => {
    if (!spec.panelReady() || !loaded('popup')) loadPopup().catch(() => {});
  };
  [trigger, inputGroup?.wrapper].forEach((node) => {
    ['pointerenter', 'focusin', 'touchstart'].forEach((type) => node?.addEventListener(type, prefetch, { signal, passive: true }));
  });
  if (!inline && trigger) {
    closeWhenFocusLeaves([trigger, portal], [portal, inputGroup?.wrapper ?? trigger], signal, () => controller.hide());
    document.addEventListener('mousedown', outside, true);
  }

  // A form reset puts the picker back to its initial value.
  const form = input?.form ?? sentinel?.form ?? null;
  const initialValue = merged.value !== undefined ? merged.value : merged.defaultValue;
  form?.addEventListener('reset', () => {
    window.setTimeout(() => {
      (controller.setValue as (value: unknown) => void)(initialValue ?? null);
      segmented?.reset();
      showError(null);
      render();
    });
  }, { signal });

  controller.onClear(() => {
    segmented?.reset();
    showError(null);
    inputGroup?.wrapper.classList.remove('is-filled');
    target.dispatchEvent(new CustomEvent(spec.events.clear, { bubbles: true }));
  });
  controller.onChange((value: { formatted: string }) => {
    updateInput(value);
    syncMachine();
    inputGroup?.updateClear();
    inputGroup?.updateMode();
    inputGroup?.wrapper.classList.add('is-filled');
    showError(null);
    // A brief glow confirms the value landed in the field (the popup may
    // have just closed over it).
    flash(inputGroup?.wrapper, 'is-updated');
    target.dispatchEvent(new CustomEvent(spec.events.change, { bubbles: true, detail: value }));
  });

  applyTheme();
  applyFormState();
  if (inline) baseShow();
  render();

  makeLiveUpdate(controller as unknown as { update: (patch: Partial<ShellOptions>) => void }, merged, () => {
    applyTheme();
    applyFormState();
    syncMachine();
    segmented?.refreshPlaceholder();
    render();
    if (controller.getState().isOpen && !inline && trigger) loaded('popup')?.positionPopup(inputGroup?.wrapper ?? trigger, portal, merged);
  });

  const igWrapper = inputGroup?.wrapper ?? null;
  const baseDestroy = controller.destroy;
  controller.destroy = () => {
    unsubscribe();
    stopTracking();
    cancelAnimationFrame(raf);
    cancelAnimationFrame(suffixFrame);
    resizeObserver?.disconnect();
    if (input) input.style.paddingRight = '';
    segmented?.destroy();
    noteOpen(controller, false);
    modal.leave();
    message?.remove();
    release(igWrapper);
    document.removeEventListener('mousedown', outside, true);
    portal.remove();
    baseDestroy();
  };
  return controller;
}

// ---- helpers for the specs ------------------------------------------------------

export { pad2 } from '../date-math/native-date-math.js';
export { timeAscii as asciiTime } from '../application/calendar-core.js';

/** Canonical ASCII `YYYY-MM-DD` of an AD date in the given calendar. */
export const asciiDay = (ad: Date, mode: CalendarMode, adapter: CalendarAdapter): string => dayAscii(createDateValue(adapter, ad), mode);
