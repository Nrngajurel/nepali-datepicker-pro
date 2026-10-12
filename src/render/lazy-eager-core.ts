// The core <script> build's stand-in for ./lazy.ts: the date / date-time and
// range popups only (see ./lazy-eager.ts and src/umd-core.ts).
import * as datetime from './datetime-panel.js';
import * as range from './range-panel.js';
import * as timeControls from './time.js';
import * as popup from './popup.js';
import * as loose from '../format/loose.js';
import { eagerApi } from './eager-api.js';

export const { loaded, load, preloadAll, withModule, lazyPanel } = eagerApi({ datetime, range, timeControls, popup, loose });
