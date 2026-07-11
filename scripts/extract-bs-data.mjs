import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../references/nepali.datepicker.v5.0.6.min.js', import.meta.url), 'utf8');
const matches = [...source.matchAll(/e\[(\d+|2e3)\]=(\[[^\]]+\])/g)];

if (matches.length < 120) {
  throw new Error(`Expected full BS data table, found ${matches.length} rows`);
}

const rows = matches
  .map((match) => [match[1] === '2e3' ? 2000 : Number(match[1]), match[2]])
  .filter(([year]) => year >= 1970 && year <= 2100)
  .sort(([a], [b]) => a - b);

const body = rows.map(([year, row]) => `  ${year}: ${row},`).join('\n');
const output = `// Generated from references/nepali.datepicker.v5.0.6.min.js.
// The runtime library does not load or depend on that script.
export const BS_YEAR_MIN = 1970;
export const BS_YEAR_MAX = 2100;
export const BS_EPOCH_BS = { year: 2000, month: 9, day: 17 } as const;
export const BS_EPOCH_AD = { year: 1944, month: 1, day: 1 } as const;

export const BS_MONTH_LENGTHS_BY_YEAR: Readonly<Record<number, readonly number[]>> = {
${body}
};

export const BS_MONTH_LENGTHS: readonly (readonly number[])[] = Array.from(
  { length: BS_YEAR_MAX - BS_YEAR_MIN + 1 },
  (_, index) => BS_MONTH_LENGTHS_BY_YEAR[BS_YEAR_MIN + index],
);
`;

writeFileSync(new URL('../src/calendar-data/bs-month-lengths.ts', import.meta.url), output);
