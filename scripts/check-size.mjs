// Bundle-size budget, run after `npm run build` (CI does). Fails when a
// shipped file grows past its gzipped budget, so growth is a decision rather
// than an accident. Raise a budget deliberately, in the same change that
// needs it.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const KB = 1024;

// Budgets in gzipped KB.
const budgets = [
  { label: 'UMD bundle (everything, <script> tag)', file: 'nepali-datepicker-pro.umd.cjs', max: 42 },
  { label: 'ES core chunk (all pickers)', match: /^src-.*\.js$/, max: 44 },
  { label: 'style.css', file: 'style.css', max: 7 },
  { label: 'react wrapper', file: 'react.js', max: 2 },
  { label: 'vue wrapper', file: 'vue.js', max: 2 },
  { label: 'custom elements', file: 'element.js', max: 2.5 },
  { label: 'holidays', file: 'holidays.js', max: 1.5 },
];

const files = readdirSync(dist);
let failed = false;
for (const budget of budgets) {
  const name = budget.file ?? files.find((f) => budget.match.test(f));
  if (!name || !files.includes(name)) {
    console.error(`✗ ${budget.label}: no file in dist/ (run npm run build)`);
    failed = true;
    continue;
  }
  const size = gzipSync(readFileSync(join(dist, name))).length / KB;
  const ok = size <= budget.max;
  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${budget.label}: ${size.toFixed(1)} KB gz (budget ${budget.max} KB)  ${name}`);
}
process.exit(failed ? 1 : 0);
