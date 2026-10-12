// The jQuery plugin machinery, with no pickers attached and no side effects:
// `jquery.ts` installs every picker with it, the core <script> build only the
// date and range pickers.
import type { PickerInstance } from './types.js';
import { regional, setDefaults } from './autoinit/shell.js';

// ─── types ───────────────────────────────────────────────────────────────────

export type JQueryLike = {
  fn: Record<string, unknown>;
  data(el: Element, key: string, value?: unknown): unknown;
};

type PluginMethod =
  | 'getValue'
  | 'getState'
  | 'setValue'
  | 'show'
  | 'hide'
  | 'destroy'
  | 'clear'
  | 'option';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginMount = (el: HTMLInputElement, options: any) => PickerInstance<any, any, any>;

// ─── shared plugin factory ────────────────────────────────────────────────────

/**
 * Builds a jQuery plugin function for any picker variant.
 * Returns the jQuery set for chaining in all cases except getValue / getState,
 * which return the value of the *first* matched element (jQuery convention).
 */
function makePlugin<TResult, TOptions extends object>(
  $: JQueryLike,
  dataKey: string,
  mount: (el: HTMLInputElement, opts: TOptions) => PickerInstance<TResult, TOptions, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  return function (
    this: Iterable<HTMLElement>,
    arg?: TOptions | PluginMethod,
    name?: string,
    value?: unknown,
  ): unknown {
    const elements = Array.from(this);

    // ── method calls ─────────────────────────────────────────────────────────
    if (typeof arg === 'string') {
      const method = arg as PluginMethod;

      // getValue / getState: jQuery convention — return from first element only.
      if (method === 'getValue' || method === 'getState') {
        const first = elements[0];
        if (!first) return undefined;
        const inst = $.data(first, dataKey) as PickerInstance<TResult, TOptions> | undefined;
        return method === 'getValue' ? inst?.getValue() : inst?.getState();
      }

      // Void methods: iterate the full set, return `this` for chaining.
      elements.forEach((el) => {
        const inst = $.data(el, dataKey) as PickerInstance<TResult, TOptions> | undefined;
        if (!inst) return;

        switch (method) {
          case 'show':    inst.show(); break;
          case 'clear':   inst.clear(); break;
          case 'hide':    inst.hide(); break;
          case 'destroy':
            inst.destroy();
            // jQuery treats `$.data(el, key, undefined)` as a *getter*, so it
            // never clears the stored instance. Write null instead — the init
            // path below treats a falsy value as "not mounted".
            $.data(el, dataKey, null);
            break;
          case 'setValue':
            // Passed as: $el.plugin('setValue', undefined, newValue)
            inst.setValue(value as TResult | null);
            break;
          case 'option':
            if (name) inst.update({ [name]: value } as Partial<TOptions>);
            break;
        }
      });

      return this; // chainable
    }

    // ── init / update ─────────────────────────────────────────────────────────
    elements.forEach((el) => {
      const existing = $.data(el, dataKey) as PickerInstance<TResult, TOptions> | undefined;
      if (existing) {
        if (arg) existing.update(arg);
      } else {
        const inst = mount(el as HTMLInputElement, arg ?? ({} as TOptions));
        $.data(el, dataKey, inst);
      }
    });

    return this; // chainable
  };
}

// ─── install ──────────────────────────────────────────────────────────────────

// jQuery objects the plugins are already registered on, so the import-time
// auto-install, the DOMContentLoaded retry and the UMD bundle's explicit call
// don't register them twice.
const installedOn = new WeakSet<object>();

/** Register `$.fn.<name>` for each picker in `plugins` (once per jQuery). */
export function installPlugins($: JQueryLike, plugins: Record<string, PluginMount>): void {
  if (installedOn.has($.fn)) return;
  installedOn.add($.fn);
  Object.entries(plugins).forEach(([name, mount]) => {
    $.fn[name] = makePlugin($, name, mount);
  });
  // The range plugin carries the shared defaults API, as before.
  const range = $.fn.nepaliDateRangePicker as Record<string, unknown> | undefined;
  if (range) {
    range.setDefaults = setDefaults;
    range.regional = regional;
  }
}

declare const window: Window & {
  jQuery?: JQueryLike;
  $?: JQueryLike;
};

/**
 * Install against whichever jQuery is on `window` now, and again on
 * DOMContentLoaded for scripts that load jQuery after this one.
 */
export function autoInstallPlugins(plugins: Record<string, PluginMount>): void {
  if (typeof window === 'undefined') return;
  const tryInstall = (): void => {
    const jq = window.jQuery ?? window.$;
    if (jq) installPlugins(jq, plugins);
  };
  tryInstall();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInstall, { once: true });
  }
}
