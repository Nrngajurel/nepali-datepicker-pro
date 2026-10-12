// Entry for the single-file UMD `<script>` bundle (vite.umd.config.ts, global
// `NepaliPicker`): the core API plus the jQuery plugin, registered on
// `window.jQuery` when it's present. The install is an explicit call rather
// than a bare side-effect import so the bundler can never drop it.
import { autoInstall, install } from './jquery.js';

export * from './index.js';
export { install as installJQuery };

autoInstall();
