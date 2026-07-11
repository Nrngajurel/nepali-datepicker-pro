// Generates ground-truth fixtures for the calendar engine by loading the
// bundled reference plugin (references/nepali.datepicker.v5.0.6.min.js) as an
// INDEPENDENT ORACLE. The runtime library never loads that script; it is used
// here only to pin our own engine's output against a second implementation.
//
// Output (committed, reviewable in git):
//   test/fixtures/reference-month-lengths.json  — full BS month-length table
//   test/fixtures/bs-ad-parity.json             — { bs:[y,m,d], ad:[y,m,d] } pairs
//
// Re-run with `npm run gen:fixtures` whenever the reference bundle changes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const REF_URL = new URL('../references/nepali.datepicker.v5.0.6.min.js', import.meta.url);
const FIXTURE_DIR = new URL('../test/fixtures/', import.meta.url);

function loadOracle() {
  const src = readFileSync(REF_URL, 'utf8');
  const noop = () => {};
  const domStub = new Proxy({}, { get: () => noop });
  const ctx = { window: { jQuery: undefined }, document: domStub, module: { exports: {} }, setTimeout: noop };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  // The bundle's trailing auto-init IIFE touches a real DOM and throws under vm;
  // `var NepaliFunctions` is already assigned by then, so swallow the throw.
  try {
    vm.runInContext(src, ctx);
  } catch {
    /* trailing auto-init requires a browser DOM; ignore */
  }
  const NF = ctx.NepaliFunctions;
  if (!NF || typeof NF.BS2AD !== 'function' || typeof NF.AD2BS !== 'function') {
    throw new Error('Failed to load NepaliFunctions oracle from reference bundle');
  }
  return NF;
}

function extractReferenceMonthLengths() {
  const src = readFileSync(REF_URL, 'utf8');
  const matches = [...src.matchAll(/e\[(\d+|2e3)\]=(\[[^\]]+\])/g)];
  const table = {};
  for (const [, rawYear, rawRow] of matches) {
    const year = rawYear === '2e3' ? 2000 : Number(rawYear);
    if (year < 1970 || year > 2100) continue;
    table[year] = JSON.parse(rawRow);
  }
  const count = Object.keys(table).length;
  if (count !== 2100 - 1970 + 1) {
    throw new Error(`Expected 131 reference year rows, found ${count}`);
  }
  return table;
}

const NF = loadOracle();
const monthLengths = extractReferenceMonthLengths();

// IMPORTANT: the reference bundle's own BS2AD/AD2BS are only self-consistent
// from its epoch (2000-09-17 BS) onward — below BS year 2001 the reference
// returns provably-wrong values (e.g. BS2AD(1970,1,1) === BS2AD(1971,1,1)).
// So it is only a valid oracle for 2001..2100; the engine's pre-2001 range is
// guarded by round-trip + monotonic invariants in the test instead.
const ORACLE_MIN_YEAR = 2001;

// Parity pairs: first AND last day of every month across the oracle-valid range
// pins every month boundary, and combined with the month-length table
// guarantees every day in between. Plus a few widely-published anchors.
const parity = [];
const seen = new Set();
function push(bY, bM, bD) {
  const key = `${bY}-${bM}-${bD}`;
  if (seen.has(key)) return;
  seen.add(key);
  const ad = NF.BS2AD({ year: bY, month: bM, day: bD });
  // Round-trip through the oracle itself as a sanity check on the oracle call.
  const back = NF.AD2BS({ year: ad.year, month: ad.month, day: ad.day });
  if (back.year !== bY || back.month !== bM || back.day !== bD) {
    throw new Error(`Oracle self-inconsistency at ${key}`);
  }
  parity.push({ bs: [bY, bM, bD], ad: [ad.year, ad.month, ad.day] });
}

for (let y = ORACLE_MIN_YEAR; y <= 2100; y += 1) {
  for (let m = 1; m <= 12; m += 1) {
    const lastDay = monthLengths[y][m - 1];
    push(y, m, 1);
    push(y, m, lastDay);
  }
}

// Widely-published anchors (hand-verifiable against public BS↔AD calendars).
const anchors = [
  [2000, 9, 17], // epoch: 1944-01-01
  [2081, 1, 1], // 2024-04-13
  [2080, 1, 1], // 2023-04-14
  [2079, 1, 1], // 2022-04-14
  [2076, 9, 26], // 2020-01-10
];
for (const [y, m, d] of anchors) push(y, m, d);

parity.sort(
  (a, b) => a.bs[0] - b.bs[0] || a.bs[1] - b.bs[1] || a.bs[2] - b.bs[2],
);

mkdirSync(FIXTURE_DIR, { recursive: true });
writeFileSync(
  new URL('reference-month-lengths.json', FIXTURE_DIR),
  JSON.stringify(monthLengths) + '\n',
);
writeFileSync(
  new URL('bs-ad-parity.json', FIXTURE_DIR),
  JSON.stringify(parity) + '\n',
);

console.log(
  `Wrote ${Object.keys(monthLengths).length} month-length rows and ${parity.length} parity pairs.`,
);
