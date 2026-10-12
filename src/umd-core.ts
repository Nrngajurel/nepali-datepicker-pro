// Entry for the core <script> bundle (global `NepaliPicker`, like the full
// one): the date / date-time and range pickers with everything they do,
// without the month, year, time-only and multi-date pickers. The jQuery
// plugins for the two are registered when jQuery is on the page.
import { mountDateRangePicker } from './autoinit/mount-range.js';
import { mountDateTimePicker } from './autoinit/mount-date.js';
import { scanFields } from './autoinit/scan.js';
import { autoInstallPlugins, installPlugins } from './jquery-plugin.js';
import type { JQueryLike } from './jquery-plugin.js';

export { mountDateTimePicker, mountDateRangePicker };
export { setDefaults, regional } from './autoinit/shell.js';
export { createDateTimeController } from './application/date-time-controller.js';
export { createDateRangeController } from './application/date-range-controller.js';
export { buildPresetLibrary } from './application/presets.js';
export { STRING_PACKS, resolveStrings } from './i18n/strings.js';
export { BsAdCalendarAdapter, defaultCalendarAdapter } from './adapters/bs-ad-calendar-adapter.js';
export { nepaliFunctions, makeNepaliFunctions } from './functions/index.js';
export { formatDateValue, parseDateValue, formatRange } from './format/index.js';
export { nativeDateMath } from './date-math/native-date-math.js';
export { preloadAll as preloadPickers } from './render/lazy.js';

const PLUGINS = { nepaliDateTimePicker: mountDateTimePicker, nepaliDateRangePicker: mountDateRangePicker };

/** Mount the date and range pickers on `data-nepali-datepicker` / `data-nepali-daterange` fields. */
export function autoInit(root: ParentNode = document): void {
  scanFields(root, { date: mountDateTimePicker, range: mountDateRangePicker });
}

export function installJQuery($: JQueryLike): void {
  installPlugins($, PLUGINS);
}

autoInstallPlugins(PLUGINS);
