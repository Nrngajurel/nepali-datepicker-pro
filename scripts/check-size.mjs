// Bundle-size budget, run after `npm run build` (CI does). Fails when a
// shipped file grows past its gzipped budget, so growth is a decision rather
// than an accident. Raise a budget deliberately, in the same change that
// needs it.
//
// Two kinds of budget:
// - files in dist/ as shipped (the <script> bundle, the stylesheet, wrappers);
// - what an app actually downloads: each picker imported on its own from
//   dist/, bundled and minified the way an app's bundler would. "first load"
//   is what arrives with the page; "opened" adds the popup's code, which is
//   fetched when someone reaches for the field (see src/render/lazy.ts).
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { build } from 'vite';

const dist = new URL('../dist/', import.meta.url).pathname;
const KB = 1024;
const gz = (data) => gzipSync(data).length / KB;

let failed = false;
function report(label, size, max, note = '', minified = 0) {
  const ok = size <= max;
  if (!ok) failed = true;
  const min = minified ? ` (${minified.toFixed(1)} KB minified)` : '';
  console.log(`${ok ? '✓' : '✗'} ${label}: ${size.toFixed(1)} KB gz${min} (budget ${max} KB)${note ? `  ${note}` : ''}`);
}

// ---- shipped files ----
const files = [
  { label: 'UMD bundle (everything, <script> tag)', file: 'nepali-datepicker-pro.umd.cjs', max: 41 },
  { label: 'UMD core bundle (date / date-time + range)', file: 'nepali-datepicker-pro.core.umd.cjs', max: 36 },
  { label: 'style.css', file: 'style.css', max: 7 },
  { label: 'react wrapper', file: 'react.js', max: 2 },
  { label: 'vue wrapper', file: 'vue.js', max: 2 },
  { label: 'custom elements', file: 'element.js', max: 2.5 },
  { label: 'holidays', file: 'holidays.js', max: 1.5 },
];
const present = readdirSync(dist);
for (const budget of files) {
  if (!present.includes(budget.file)) {
    console.error(`✗ ${budget.label}: no ${budget.file} in dist/ (run npm run build)`);
    failed = true;
    continue;
  }
  const data = readFileSync(join(dist, budget.file));
  report(budget.label, gz(data), budget.max, budget.file, data.length / KB);
}

// ---- what an app downloads, per picker ----
const pickers = [
  { name: 'date picker', mount: 'mountDateTimePicker', panel: 'datetime-panel', first: 19, opened: 26.5 },
  // The main case: a date-time field and a range field on the same app.
  { name: 'date-time + range app', mount: ['mountDateTimePicker', 'mountDateRangePicker'], options: '{ withTime: true }', panel: ['datetime-panel', 'range-panel'], time: true, first: 23.5, opened: 36.5 },
  { name: 'date-time picker', mount: 'mountDateTimePicker', options: '{ withTime: true }', panel: 'datetime-panel', time: true, first: 19, opened: 29.5 },
  { name: 'range picker', mount: 'mountDateRangePicker', panel: 'range-panel', first: 21, opened: 30 },
  { name: 'month picker', mount: 'mountMonthPicker', panel: 'month-panel', first: 16, opened: 22.5 },
  { name: 'year picker', mount: 'mountYearPicker', panel: 'year-panel', first: 15.5, opened: 22 },
  { name: 'time picker', mount: 'mountTimePicker', panel: 'time-panel', first: 19.5, opened: 29.5 },
];

const VIRTUAL = '\0size-entry';
for (const picker of pickers) {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [{
      name: 'size-entry',
      resolveId: (id) => (id === VIRTUAL ? id : null),
      load: (id) => {
        if (id !== VIRTUAL) return null;
        const mounts = [].concat(picker.mount);
        return `import { ${mounts.join(', ')} } from ${JSON.stringify(join(dist, 'index.js'))}; ${mounts.map((m) => `${m}(document.body, ${picker.options ?? '{}'});`).join(' ')}`;
      },
    }],
    build: { write: false, minify: true, modulePreload: false, rollupOptions: { input: VIRTUAL } },
  });
  const chunks = (Array.isArray(result) ? result[0] : result).output.filter((c) => c.type === 'chunk');
  const byName = new Map(chunks.map((c) => [c.fileName, c]));
  const closure = (roots) => {
    const seen = new Set();
    const visit = (chunk) => {
      if (!chunk || seen.has(chunk.fileName)) return;
      seen.add(chunk.fileName);
      chunk.imports.forEach((name) => visit(byName.get(name)));
    };
    roots.forEach(visit);
    return seen;
  };
  const size = (names) => [...names].reduce((sum, name) => sum + gz(byName.get(name).code), 0);
  const raw = (names) => [...names].reduce((sum, name) => sum + Buffer.byteLength(byName.get(name).code), 0) / KB;
  const entry = chunks.find((c) => c.isEntry);
  // The chunks holding a dist/ file, matched on its name (dist/<name>-<hash>.js).
  const chunkOf = (name) => chunks.filter((c) => Object.keys(c.modules).some((id) => new RegExp(`/${name}-[\\w-]+\\.js$`).test(id) && !(name === 'time' && /time-panel/.test(id))));
  const opened = [entry, ...[].concat(picker.panel).flatMap(chunkOf), ...chunkOf('popup'), ...(picker.time ? chunkOf('time') : [])];
  report(`${picker.name}, first load`, size(closure([entry])), picker.first, '', raw(closure([entry])));
  report(`${picker.name}, opened`, size(closure(opened)), picker.opened, '', raw(closure(opened)));
}

process.exit(failed ? 1 : 0);
