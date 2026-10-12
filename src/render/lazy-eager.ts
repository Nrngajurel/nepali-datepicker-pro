// The full <script> build's stand-in for ./lazy.ts (swapped in by
// vite.umd.config.ts): one file can't fetch chunks later anyway, and static
// imports keep the bundle smaller than inlined dynamic ones. Same API,
// everything already loaded.
import * as datetime from './datetime-panel.js';
import * as range from './range-panel.js';
import * as month from './month-panel.js';
import * as year from './year-panel.js';
import * as time from './time-panel.js';
import * as multi from './multi-panel.js';
import * as timeControls from './time.js';
import * as popup from './popup.js';
import * as loose from '../format/loose.js';
import { eagerApi } from './eager-api.js';

export const { loaded, load, preloadAll, withModule, lazyPanel } = eagerApi({ datetime, range, month, year, time, multi, timeControls, popup, loose });
