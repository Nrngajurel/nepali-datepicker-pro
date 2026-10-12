// Schema builders for the segmented field — one per picker shape. Each returns
// the `schema` / `seed` / `toAscii` / `placeholder` slice of a
// SegmentedFieldConfig; the mount supplies the validate/commit/open/close rest.
// The controllers always speak canonical ASCII (`YYYY-MM-DD[ HH:mm[:ss]]`);
// only the order and separator the user types in follow `displayFormat`.
import type { SegmentSpec, SegmentValues } from './segmented-field.js';

type SchemaPart = Pick<import('./segmented-field.js').SegmentedFieldConfig, 'schema' | 'seed' | 'toAscii' | 'placeholder'>;

const pad = (n: number, len = 2): string => String(n).padStart(len, '0');

export type DatePart = 'year' | 'month' | 'day';

export interface DateOrder {
  order: DatePart[];
  sep: string;
}

const ISO_ORDER: DateOrder = { order: ['year', 'month', 'day'], sep: '-' };
const TOKEN_PART: Record<string, DatePart> = { YYYY: 'year', MM: 'month', DD: 'day' };

/** The day/month/year order and separator of a numeric display format such
 *  as `DD/MM/YYYY`, so typing matches what's displayed. Formats with names
 *  (`MMMM`, `dddd`) keep the unambiguous ISO order. */
export function typingOrder(displayFormat?: string): DateOrder {
  if (!displayFormat) return ISO_ORDER;
  const date = displayFormat.trim().split(/[ T]/)[0];
  const m = /^(YYYY|MM|DD)([-/.])(YYYY|MM|DD)\2(YYYY|MM|DD)$/.exec(date);
  if (!m) return ISO_ORDER;
  const order = [m[1], m[3], m[4]].map((token) => TOKEN_PART[token]);
  if (new Set(order).size !== 3) return ISO_ORDER;
  return { order, sep: m[2] };
}

/** `MM/YYYY`-style order for the month picker. */
export function monthTypingOrder(displayFormat?: string): { yearFirst: boolean; sep: string } {
  const m = displayFormat ? /^(YYYY|MM)([-/.])(YYYY|MM)$/.exec(displayFormat.trim()) : null;
  if (!m || m[1] === m[3]) return { yearFirst: true, sep: '-' };
  return { yearFirst: m[1] === 'YYYY', sep: m[2] };
}

function yearSpec(bounds: { min: number; max: number }, key = 'year'): SegmentSpec {
  return { key, len: 4, min: bounds.min, max: bounds.max, placeholder: 'YYYY' };
}
// BS months can have up to 32 days; the exact per-month length is enforced at
// commit time, so the section itself allows stepping/typing up to 32.
const partSpec = (part: DatePart, bounds: { min: number; max: number }, prefix = ''): SegmentSpec => {
  if (part === 'year') return yearSpec(bounds, prefix ? `${prefix}Y` : 'year');
  if (part === 'month') return { key: prefix ? `${prefix}M` : 'month', len: 2, min: 1, max: 12, placeholder: 'MM' };
  return { key: prefix ? `${prefix}D` : 'day', len: 2, min: 1, max: 32, placeholder: 'DD' };
};

function dateParts(order: DateOrder, bounds: { min: number; max: number }, prefix = ''): Array<SegmentSpec | string> {
  const parts: Array<SegmentSpec | string> = [];
  order.order.forEach((part, index) => {
    if (index) parts.push(order.sep);
    parts.push(partSpec(part, bounds, prefix));
  });
  return parts;
}

function datePlaceholder(order: DateOrder): string {
  return order.order.map((part) => (part === 'year' ? 'YYYY' : part === 'month' ? 'MM' : 'DD')).join(order.sep);
}

/** `YYYY-MM-DD` (or the display format's order), optionally `… HH:mm[:ss]`
 *  (24h) or `… hh:mm[:ss] --` (12h with AM/PM). */
export function dateSchema(opts: {
  yearBounds: () => { min: number; max: number };
  withTime: () => boolean;
  hour12: () => boolean;
  withSeconds?: () => boolean;
  order?: () => DateOrder;
}): SchemaPart {
  const is12h = () => opts.withTime() && opts.hour12();
  const seconds = () => opts.withTime() && !!opts.withSeconds?.();
  const order = () => opts.order?.() ?? ISO_ORDER;
  return {
    schema() {
      const parts = dateParts(order(), opts.yearBounds());
      if (opts.withTime()) {
        const h12 = is12h();
        parts.push(' ', { key: 'hour', len: 2, min: h12 ? 1 : 0, max: h12 ? 12 : 23, placeholder: h12 ? 'hh' : 'HH' }, ':', { key: 'minute', len: 2, min: 0, max: 59, placeholder: 'mm' });
        if (seconds()) parts.push(':', { key: 'second', len: 2, min: 0, max: 59, placeholder: 'ss' });
        if (h12) parts.push(' ', { key: 'meridiem', len: 2, min: 0, max: 1, placeholder: 'aa', kind: 'meridiem' });
      }
      return parts;
    },
    placeholder: () => {
      const date = datePlaceholder(order());
      if (!opts.withTime()) return date;
      const sec = seconds() ? ':ss' : '';
      return is12h() ? `${date} hh:mm${sec} --` : `${date} HH:mm${sec}`;
    },
    seed(ascii) {
      const m = /^(\d+)-(\d+)-(\d+)(?:[ ](\d+):(\d+)(?::(\d+))?)?$/.exec(ascii);
      if (!m) return {};
      const values: SegmentValues = { year: +m[1], month: +m[2], day: +m[3] };
      if (m[4] != null) {
        const h24 = +m[4];
        if (is12h()) { values.hour = h24 % 12 || 12; values.meridiem = h24 >= 12 ? 1 : 0; } else values.hour = h24;
        values.minute = +m[5];
        if (seconds()) values.second = m[6] != null ? +m[6] : 0;
      }
      return values;
    },
    toAscii(v) {
      const date = `${pad(v.year!, 4)}-${pad(v.month!)}-${pad(v.day!)}`;
      if (v.hour == null) return date;
      const h = v.meridiem != null ? (v.hour! % 12) + (v.meridiem === 1 ? 12 : 0) : v.hour!;
      return `${date} ${pad(h)}:${pad(v.minute!)}${v.second != null ? `:${pad(v.second)}` : ''}`;
    },
  };
}

/** `YYYY-MM` (or `MM/YYYY` per the display format) for the month picker. */
export function monthSchema(opts: { yearBounds: () => { min: number; max: number }; displayFormat?: () => string | undefined }): SchemaPart {
  const order = () => monthTypingOrder(opts.displayFormat?.());
  const MONTH: SegmentSpec = { key: 'month', len: 2, min: 1, max: 12, placeholder: 'MM' };
  return {
    schema: () => {
      const o = order();
      return o.yearFirst ? [yearSpec(opts.yearBounds()), o.sep, MONTH] : [MONTH, o.sep, yearSpec(opts.yearBounds())];
    },
    placeholder: () => (order().yearFirst ? `YYYY${order().sep}MM` : `MM${order().sep}YYYY`),
    seed(ascii): SegmentValues {
      const m = /^(\d+)-(\d+)$/.exec(ascii);
      return m ? { year: +m[1], month: +m[2] } : {};
    },
    toAscii: (v) => `${pad(v.year!, 4)}-${pad(v.month!)}`,
  };
}

/** `YYYY-MM-DD – YYYY-MM-DD` (each end optionally with `HH:mm`) for the range picker. */
export function rangeSchema(opts: {
  yearBounds: () => { min: number; max: number };
  order?: () => DateOrder;
  withTime?: () => boolean;
}): SchemaPart {
  const order = () => opts.order?.() ?? ISO_ORDER;
  const timed = () => !!opts.withTime?.();
  const group = (p: 's' | 'e'): Array<SegmentSpec | string> => {
    const parts = dateParts(order(), opts.yearBounds(), p);
    if (timed()) parts.push(' ', { key: `${p}h`, len: 2, min: 0, max: 23, placeholder: 'HH' }, ':', { key: `${p}m`, len: 2, min: 0, max: 59, placeholder: 'mm' });
    return parts;
  };
  const end = (v: SegmentValues, p: 's' | 'e'): string => {
    const date = `${pad(v[`${p}Y`]!, 4)}-${pad(v[`${p}M`]!)}-${pad(v[`${p}D`]!)}`;
    return v[`${p}h`] != null ? `${date} ${pad(v[`${p}h`]!)}:${pad(v[`${p}m`]!)}` : date;
  };
  return {
    schema: () => [...group('s'), ' – ', ...group('e')],
    placeholder: () => {
      const one = datePlaceholder(order()) + (timed() ? ' HH:mm' : '');
      return `${one} – ${one}`;
    },
    seed(ascii): SegmentValues {
      const m = /^(\d+)-(\d+)-(\d+)(?:\s+(\d+):(\d+))?\s+–\s+(\d+)-(\d+)-(\d+)(?:\s+(\d+):(\d+))?$/.exec(ascii);
      if (!m) return {};
      const values: SegmentValues = { sY: +m[1], sM: +m[2], sD: +m[3], eY: +m[6], eM: +m[7], eD: +m[8] };
      if (timed()) {
        values.sh = m[4] != null ? +m[4] : null;
        values.sm = m[5] != null ? +m[5] : null;
        values.eh = m[9] != null ? +m[9] : null;
        values.em = m[10] != null ? +m[10] : null;
      }
      return values;
    },
    toAscii: (v) => `${end(v, 's')} – ${end(v, 'e')}`,
  };
}
