// Schema builders for the segmented field — one per picker shape. Each returns
// the `schema` / `seed` / `toAscii` / `placeholder` slice of a
// SegmentedFieldConfig; the mount supplies the validate/commit/open/close rest.
import type { SegmentSpec, SegmentValues } from './segmented-field.js';

type SchemaPart = Pick<import('./segmented-field.js').SegmentedFieldConfig, 'schema' | 'seed' | 'toAscii' | 'placeholder'>;

const pad = (n: number, len = 2): string => String(n).padStart(len, '0');

function yearSpec(bounds: { min: number; max: number }): SegmentSpec {
  return { key: 'year', len: 4, min: bounds.min, max: bounds.max, placeholder: 'YYYY' };
}
const MONTH: SegmentSpec = { key: 'month', len: 2, min: 1, max: 12, placeholder: 'MM' };
// BS months can have up to 32 days; the exact per-month length is enforced at
// commit time, so the section itself allows stepping/typing up to 32.
const DAY: SegmentSpec = { key: 'day', len: 2, min: 1, max: 32, placeholder: 'DD' };

/** `YYYY-MM-DD`, optionally `… HH:mm` (24h) or `… hh:mm --` (12h with AM/PM). */
export function dateSchema(opts: {
  yearBounds: () => { min: number; max: number };
  withTime: () => boolean;
  hour12: () => boolean;
}): SchemaPart {
  const is12h = () => opts.withTime() && opts.hour12();
  return {
    schema() {
      const parts: Array<SegmentSpec | string> = [yearSpec(opts.yearBounds()), '-', MONTH, '-', DAY];
      if (opts.withTime()) {
        const h12 = is12h();
        parts.push(' ', { key: 'hour', len: 2, min: h12 ? 1 : 0, max: h12 ? 12 : 23, placeholder: h12 ? 'hh' : 'HH' }, ':', { key: 'minute', len: 2, min: 0, max: 59, placeholder: 'mm' });
        if (h12) parts.push(' ', { key: 'meridiem', len: 2, min: 0, max: 1, placeholder: '--', kind: 'meridiem' });
      }
      return parts;
    },
    placeholder: () => (opts.withTime() ? (is12h() ? 'YYYY-MM-DD hh:mm --' : 'YYYY-MM-DD HH:mm') : 'YYYY-MM-DD'),
    seed(ascii) {
      const m = /^(\d+)-(\d+)-(\d+)(?:[ ](\d+):(\d+))?$/.exec(ascii);
      if (!m) return {};
      const values: SegmentValues = { year: +m[1], month: +m[2], day: +m[3] };
      if (m[4] != null) {
        const h24 = +m[4];
        if (is12h()) { values.hour = h24 % 12 || 12; values.meridiem = h24 >= 12 ? 1 : 0; } else values.hour = h24;
        values.minute = +m[5];
      }
      return values;
    },
    toAscii(v) {
      const date = `${pad(v.year!, 4)}-${pad(v.month!)}-${pad(v.day!)}`;
      if (v.hour == null) return date;
      const h = v.meridiem != null ? (v.hour! % 12) + (v.meridiem === 1 ? 12 : 0) : v.hour!;
      return `${date} ${pad(h)}:${pad(v.minute!)}`;
    },
  };
}

/** `YYYY-MM` for the month picker. */
export function monthSchema(opts: { yearBounds: () => { min: number; max: number } }): SchemaPart {
  return {
    schema: () => [yearSpec(opts.yearBounds()), '-', MONTH],
    placeholder: () => 'YYYY-MM',
    seed(ascii): SegmentValues {
      const m = /^(\d+)-(\d+)$/.exec(ascii);
      return m ? { year: +m[1], month: +m[2] } : {};
    },
    toAscii: (v) => `${pad(v.year!, 4)}-${pad(v.month!)}`,
  };
}

/** `YYYY-MM-DD – YYYY-MM-DD` for the range picker. */
export function rangeSchema(opts: { yearBounds: () => { min: number; max: number } }): SchemaPart {
  const group = (p: 's' | 'e'): Array<SegmentSpec | string> => {
    const yb = opts.yearBounds();
    return [
      { key: `${p}Y`, len: 4, min: yb.min, max: yb.max, placeholder: 'YYYY' }, '-',
      { key: `${p}M`, len: 2, min: 1, max: 12, placeholder: 'MM' }, '-',
      { key: `${p}D`, len: 2, min: 1, max: 32, placeholder: 'DD' },
    ];
  };
  return {
    schema: () => [...group('s'), ' – ', ...group('e')],
    placeholder: () => 'YYYY-MM-DD – YYYY-MM-DD',
    seed(ascii): SegmentValues {
      const m = /^(\d+)-(\d+)-(\d+)\s+–\s+(\d+)-(\d+)-(\d+)$/.exec(ascii);
      if (!m) return {};
      return { sY: +m[1], sM: +m[2], sD: +m[3], eY: +m[4], eM: +m[5], eD: +m[6] };
    },
    toAscii: (v) => `${pad(v.sY!, 4)}-${pad(v.sM!)}-${pad(v.sD!)} – ${pad(v.eY!, 4)}-${pad(v.eM!)}-${pad(v.eD!)}`,
  };
}
