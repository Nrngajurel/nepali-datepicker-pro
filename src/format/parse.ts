// Parsing + input-masking helpers for typeable date/datetime fields.
// The canonical typing format is always `YYYY-MM-DD` (date) or
// `YYYY-MM-DD HH:mm` (datetime), independent of the display format, so parsing
// stays unambiguous. Both ASCII and Devanagari digits are accepted.

const DEVANAGARI_TO_ASCII: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

/** Convert any Devanagari digits in the string to their ASCII equivalents. */
export function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => DEVANAGARI_TO_ASCII[d] ?? d);
}

export interface TypedTokens {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

/** Split a typed string into numeric parts without any calendar validation.
 *  Returns `'empty'` for blank input and `null` for a shape that can't be a
 *  date at all. Calendar-range validation is the caller's job. */
export function tokenizeTyped(text: string): TypedTokens | 'empty' | null {
  const s = normalizeDigits(text).trim();
  if (s === '') return 'empty';
  const m = s.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?$/);
  if (!m) return null;
  const tokens: TypedTokens = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (m[4] != null) {
    tokens.hour = Number(m[4]);
    tokens.minute = Number(m[5]);
  }
  return tokens;
}

/** Reformat raw input into the masked `YYYY-MM-DD[ HH:mm]` shape as the user
 *  types: keep only digits (normalizing Nepali → ASCII) and re-insert the fixed
 *  separators. Extra digits past the template are dropped. */
export function maskTypedDate(text: string, withTime: boolean): string {
  const digits = normalizeDigits(text).replace(/\D/g, '');
  const segments = withTime ? [4, 2, 2, 2, 2] : [4, 2, 2];
  const separators = withTime ? ['', '-', '-', ' ', ':'] : ['', '-', '-'];
  let out = '';
  let i = 0;
  for (let s = 0; s < segments.length && i < digits.length; s += 1) {
    out += separators[s] + digits.slice(i, i + segments[s]);
    i += segments[s];
  }
  return out;
}

/** Count the digit characters in a string (used for caret preservation). */
export function countDigits(text: string): number {
  return (normalizeDigits(text).match(/\d/g) ?? []).length;
}
