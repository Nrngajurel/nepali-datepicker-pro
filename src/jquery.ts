import { mountDateRangePicker, mountDateTimePicker, mountMonthPicker, regional, setDefaults } from './index.js';
import type { DateRangePickerOptions, DateTimePickerOptions, MonthPickerOptions, PickerInstance } from './index.js';

type JQueryLike = {
  fn: Record<string, unknown>;
  data(el: Element, key: string, value?: unknown): unknown;
};

type PluginMethod = 'getValue' | 'destroy' | 'show' | 'hide' | 'option';

function installDateRangePlugin($: JQueryLike): void {
  const key = 'nepaliDateRangePicker';
  const plugin = function (this: Iterable<HTMLElement>, arg?: DateRangePickerOptions | PluginMethod, name?: string, value?: unknown) {
    let returnValue: unknown = this;
    Array.from(this).forEach((el) => {
      let instance = $.data(el, key) as PickerInstance<unknown, DateRangePickerOptions> | undefined;
      if (typeof arg === 'string') {
        if (!instance) return;
        if (arg === 'getValue') returnValue = instance.getValue();
        if (arg === 'destroy') { instance.destroy(); $.data(el, key, undefined); }
        if (arg === 'show') instance.show();
        if (arg === 'hide') instance.hide();
        if (arg === 'option' && name) instance.update({ [name]: value } as Partial<DateRangePickerOptions>);
        return;
      }
      if (!instance) {
        instance = mountDateRangePicker(el as HTMLInputElement, { ...(arg ?? {}), container: (arg as DateRangePickerOptions | undefined)?.container });
        $.data(el, key, instance);
      } else if (arg) {
        instance.update(arg);
      }
    });
    return returnValue;
  };
  (plugin as unknown as Record<string, unknown>).setDefaults = setDefaults;
  (plugin as unknown as Record<string, unknown>).regional = regional;
  $.fn.nepaliDateRangePicker = plugin;
}

function installDateTimePlugin($: JQueryLike): void {
  const key = 'nepaliDateTimePicker';
  $.fn.nepaliDateTimePicker = function (this: Iterable<HTMLElement>, arg?: DateTimePickerOptions | PluginMethod, name?: string, value?: unknown) {
    let returnValue: unknown = this;
    Array.from(this).forEach((el) => {
      let instance = $.data(el, key) as PickerInstance<unknown, DateTimePickerOptions> | undefined;
      if (typeof arg === 'string') {
        if (!instance) return;
        if (arg === 'getValue') returnValue = instance.getValue();
        if (arg === 'destroy') { instance.destroy(); $.data(el, key, undefined); }
        if (arg === 'show') instance.show();
        if (arg === 'hide') instance.hide();
        if (arg === 'option' && name) instance.update({ [name]: value } as Partial<DateTimePickerOptions>);
        return;
      }
      if (!instance) {
        instance = mountDateTimePicker(el as HTMLInputElement, arg ?? {});
        $.data(el, key, instance);
      } else if (arg) {
        instance.update(arg);
      }
    });
    return returnValue;
  };
}

function installMonthPlugin($: JQueryLike): void {
  const key = 'nepaliMonthPicker';
  $.fn.nepaliMonthPicker = function (this: Iterable<HTMLElement>, arg?: MonthPickerOptions | PluginMethod, name?: string, value?: unknown) {
    let returnValue: unknown = this;
    Array.from(this).forEach((el) => {
      let instance = $.data(el, key) as PickerInstance<unknown, MonthPickerOptions> | undefined;
      if (typeof arg === 'string') {
        if (!instance) return;
        if (arg === 'getValue') returnValue = instance.getValue();
        if (arg === 'destroy') { instance.destroy(); $.data(el, key, undefined); }
        if (arg === 'show') instance.show();
        if (arg === 'hide') instance.hide();
        if (arg === 'option' && name) instance.update({ [name]: value } as Partial<MonthPickerOptions>);
        return;
      }
      if (!instance) {
        instance = mountMonthPicker(el as HTMLInputElement, arg ?? {});
        $.data(el, key, instance);
      } else if (arg) {
        instance.update(arg);
      }
    });
    return returnValue;
  };
}

export function install($: JQueryLike): void {
  installDateRangePlugin($);
  installDateTimePlugin($);
  installMonthPlugin($);
}

declare const window: Window & { jQuery?: JQueryLike };
if (typeof window !== 'undefined' && window.jQuery) install(window.jQuery);
