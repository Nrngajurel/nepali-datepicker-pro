/**
 * Custom elements for the picker family — `import 'nepali-datepicker-pro/element'`
 * and use them from any framework (Angular, Svelte, Astro, Lit…) or plain HTML:
 *
 *   <nepali-date-picker name="dob" mode="BS" min-date="today" required></nepali-date-picker>
 *   <nepali-date-range-picker number-of-months="2"></nepali-date-range-picker>
 *   <nepali-month-picker></nepali-month-picker>
 *   <nepali-year-picker></nepali-year-picker>
 *   <nepali-time-picker time-format="24h"></nepali-time-picker>
 *   <nepali-multi-date-picker max-dates="5"></nepali-multi-date-picker>
 *
 * Light DOM (no shadow root): the theme's CSS variables and your page styles
 * apply, and `name` submits through the surrounding <form> like any field.
 * Attributes cover the plain options; set the `options` property for anything
 * richer (functions, events, presets). Events: `change` (detail = result),
 * `clear`, `open`, `close`, `invalid` (detail = { reason, message }).
 */
import {
  mountDateRangePicker,
  mountDateTimePicker,
  mountMonthPicker,
  mountMultiDatePicker,
  mountTimePicker,
  mountYearPicker,
} from './index.js';
import { parseLocalDateString } from './date-math/native-date-math.js';
import type { PickerInstance } from './index.js';

type AnyInstance = PickerInstance<unknown, Record<string, unknown>, unknown>;
type Kind = 'date' | 'range' | 'month' | 'year' | 'time' | 'multi';

const MOUNTS: Record<Kind, (input: HTMLInputElement, options: never) => unknown> = {
  date: mountDateTimePicker,
  range: mountDateRangePicker,
  month: mountMonthPicker,
  year: mountYearPicker,
  time: mountTimePicker,
  multi: mountMultiDatePicker,
};

// Attribute → option. `name` maps to submitName (the machine value is what a
// form should get); booleans are present/absent or "true"/"false".
const BOOLEAN = ['with-time', 'with-seconds', 'inline', 'required', 'disabled', 'allow-mode-toggle', 'clearable', 'allow-input', 'auto-apply', 'show-secondary-calendar', 'show-calendar-suffix', 'linked-calendars'];
const NUMBER = ['minute-step', 'number-of-months', 'fiscal-start-month', 'max-range-span-days', 'min-range-span-days', 'max-dates', 'min-year', 'max-year', 'week-starts-on'];
const STRING = ['mode', 'language', 'theme', 'density', 'script', 'locale', 'time-format', 'display-format', 'value-format', 'min-date', 'max-date', 'opens', 'drops', 'invalid-behavior', 'time-input-style'];
const OBSERVED = [...BOOLEAN, ...NUMBER, ...STRING, 'value', 'name', 'placeholder'];

const camel = (name: string): string => name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

function parseValue(kind: Kind, raw: string | null): unknown {
  if (raw == null || raw === '') return null;
  if (kind === 'date') return parseLocalDateString(raw);
  if (kind === 'range') {
    const [a, b] = raw.split(',').map((part) => parseLocalDateString(part.trim()));
    return a && b ? { start: a, end: b } : null;
  }
  if (kind === 'month') {
    const m = /^(\d{4})-(\d{1,2})$/.exec(raw.trim());
    return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
  }
  if (kind === 'year') return /^\d{4}$/.test(raw.trim()) ? Number(raw) : null;
  if (kind === 'time') {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim());
    return m ? { hour: Number(m[1]), minute: Number(m[2]), second: Number(m[3] ?? 0) } : null;
  }
  return raw.split(',').map((part) => parseLocalDateString(part.trim())).filter(Boolean);
}

function readAttribute(el: HTMLElement, kind: Kind, name: string): [string, unknown] {
  const raw = el.getAttribute(name);
  if (name === 'value') return ['value', parseValue(kind, raw)];
  if (name === 'name') return ['submitName', raw ?? undefined];
  if (BOOLEAN.includes(name)) return [camel(name), raw === null ? undefined : raw !== 'false'];
  if (NUMBER.includes(name)) return [camel(name), raw === null ? undefined : Number(raw)];
  return [camel(name), raw ?? undefined];
}

const Base: typeof HTMLElement = typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

/** A picker element: a plain HTMLElement plus the picker's API. */
export interface NepaliPickerElement extends HTMLElement {
  /** The picker instance (null while disconnected). */
  readonly instance: AnyInstance | null;
  /** Rich options (functions, events, presets…) on top of the attributes. */
  options: Record<string, unknown>;
  /** The current result (see the picker's result type), or null. */
  value: unknown;
  show(): void;
  hide(): void;
  clear(): void;
}

// Declared rather than inferred: the inferred class type spells out every
// HTMLElement member in the published .d.ts (over 100 KB).
export interface NepaliPickerElementConstructor {
  new (): NepaliPickerElement;
  readonly observedAttributes: string[];
}

function makeElement(kind: Kind): NepaliPickerElementConstructor {
  return class NepaliPickerElement extends Base {
    static get observedAttributes(): string[] {
      return OBSERVED;
    }

    #instance: AnyInstance | null = null;
    #options: Record<string, unknown> = {};

    /** The picker instance (null while disconnected). */
    get instance(): AnyInstance | null {
      return this.#instance;
    }

    /** Rich options (functions, events, presets…) on top of the attributes. */
    get options(): Record<string, unknown> {
      return this.#options;
    }

    set options(next: Record<string, unknown>) {
      this.#options = { ...next };
      this.#instance?.update(this.#options);
    }

    /** The current result (see the picker's result type), or null. */
    get value(): unknown {
      return this.#instance?.getValue() ?? null;
    }

    set value(next: unknown) {
      this.#instance?.setValue(next);
    }

    show(): void { this.#instance?.show(); }
    hide(): void { this.#instance?.hide(); }
    clear(): void { this.#instance?.clear(); }

    connectedCallback(): void {
      if (this.#instance) return;
      const fromAttributes: Record<string, unknown> = {};
      OBSERVED.forEach((name) => {
        if (!this.hasAttribute(name) || name === 'placeholder') return;
        const [key, value] = readAttribute(this, kind, name);
        if (value !== undefined) fromAttributes[key] = value;
      });
      // An <input> the author put inside is used as the field; else one is made.
      let input = this.querySelector('input');
      if (!input) {
        input = document.createElement('input');
        this.appendChild(input);
      }
      const placeholder = this.getAttribute('placeholder');
      if (placeholder) input.placeholder = placeholder;
      const fire = (type: string, detail?: unknown) => this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
      const own = () => this.#options as Record<string, ((...args: unknown[]) => void) | undefined>;
      const changeKey = kind === 'range' ? 'onApply' : 'onChange';
      this.#instance = MOUNTS[kind](input, {
        ...fromAttributes,
        ...this.#options,
        [changeKey]: (result: unknown) => { fire('change', result); own()[changeKey]?.(result); },
        onClear: () => { fire('clear'); own().onClear?.(); },
        onOpen: () => { fire('open'); own().onOpen?.(); },
        onClose: () => { fire('close'); own().onClose?.(); },
        onInvalid: (reason: unknown, message: unknown) => { fire('invalid', { reason, message }); own().onInvalid?.(reason, message); },
      } as never) as AnyInstance;
    }

    disconnectedCallback(): void {
      this.#instance?.destroy();
      this.#instance = null;
    }

    attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
      if (!this.#instance || previous === next) return;
      if (name === 'placeholder') {
        const input = this.querySelector('input');
        if (input && next != null) input.placeholder = next;
        return;
      }
      const [key, value] = readAttribute(this, kind, name);
      this.#instance.update({ [key]: value });
    }
  };
}

export const NepaliDatePickerElement = makeElement('date');
export const NepaliDateRangePickerElement = makeElement('range');
export const NepaliMonthPickerElement = makeElement('month');
export const NepaliYearPickerElement = makeElement('year');
export const NepaliTimePickerElement = makeElement('time');
export const NepaliMultiDatePickerElement = makeElement('multi');

/** Register the elements (done on import; safe to call again). */
export function defineNepaliElements(): void {
  if (typeof customElements === 'undefined') return;
  const define = (tag: string, ctor: CustomElementConstructor) => { if (!customElements.get(tag)) customElements.define(tag, ctor); };
  define('nepali-date-picker', NepaliDatePickerElement);
  define('nepali-date-range-picker', NepaliDateRangePickerElement);
  define('nepali-month-picker', NepaliMonthPickerElement);
  define('nepali-year-picker', NepaliYearPickerElement);
  define('nepali-time-picker', NepaliTimePickerElement);
  define('nepali-multi-date-picker', NepaliMultiDatePickerElement);
}

defineNepaliElements();
