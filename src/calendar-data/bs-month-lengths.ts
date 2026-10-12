// Generated from references/nepali.datepicker.v5.0.6.min.js.
// The runtime library does not load or depend on that script.
export const BS_YEAR_MIN = 1970;
export const BS_YEAR_MAX = 2100;
export const BS_EPOCH_BS = { year: 2000, month: 9, day: 17 } as const;
export const BS_EPOCH_AD = { year: 1944, month: 1, day: 1 } as const;

// Every BS month has 29–32 days, so each is stored as (length − 29) in two
// bits: one base64 character holds three months, four characters one year,
// BS_YEAR_MIN first. About a tenth of the size of a number array, and faster
// to parse.
const PACKED =
  'rqRFrtRFu5UGe5USrqRFr5RFu5UGe6ESrqRFr5RFu5UGq6FFrqRFr5RFu5UGq6FF' +
  'rqRFu5RFu5UGq6RFrqRFu5UFu5USq6RFrqRFu5UFu5USrqRFrqRFu5UGe5USrqRF' +
  'r5RFu5UGe5USrqRFr5RFu5UGq6FCrqRFr5RFu5UGq6FFrqRFr5RFu5UGq6FFrqRF' +
  'u5RFu5USq6RFrqRFu5UFu5USq6RFrqRFu5UGe5USrqRFrtRFu5UGe5USrqRFr5RF' +
  'u5UGe6FCrqRFr5RFu5UGq6FFrqRFr5RFu5UGq6FFrqRFu5RFu5UGq6RFrqRFu5UF' +
  'u5USq6RFrqRFu5UFu5USrqRFrtRFu5UGe5USrqRFr5RFu5UGe6ESrqRFr5RFu5UG' +
  'q6FCrqRFr5RFu5UGq6FFrqRFu5RFu5UGq6RFrqRFu5UFu5USq6RFrqRFu5UFu5US' +
  'rqRFrqRFrpUVu2UVe5UVrqUVb2UVe5UVe5UVrqUVb5UVe5UVrpUVrqRVb5RFu5UV' +
  'rqESrqQVu2RF';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const BS_MONTH_LENGTHS: readonly (readonly number[])[] = Array.from(
  { length: BS_YEAR_MAX - BS_YEAR_MIN + 1 },
  (_, year) => Array.from({ length: 12 }, (_, month) => 29 + ((ALPHABET.indexOf(PACKED[year * 4 + ((month / 3) | 0)]) >> (4 - (month % 3) * 2)) & 3)),
);

export const BS_MONTH_LENGTHS_BY_YEAR: Readonly<Record<number, readonly number[]>> = Object.fromEntries(
  BS_MONTH_LENGTHS.map((lengths, index) => [BS_YEAR_MIN + index, lengths]),
);
