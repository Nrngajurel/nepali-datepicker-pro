---
title: Nepali Month Picker
description: Pick a single Bikram Sambat month for a payslip or monthly report — the picker resolves it to the AD date range it covers. Configure it live and copy the snippet.
---

# Month Picker

Pick one BS month for a monthly report or payslip — the picker returns the AD date range that
month covers, so your query doesn't need to know anything about Bikram Sambat.

<PickerDemo id="month" />

## Notes

- **A month is emitted as a range.** `onChange` carries `{ year, month, start, end, startValue,
  endValue, value, formatted }`, where `start`/`end` are the AD `Date`s for the first and last
  day of the BS month.
- **`value` is the `"start,end"` pair**, which is what a single `submitName` string writes. Pass
  `{ start, end }` instead to get two named fields.
- **`minYear` / `maxYear` bound the grid** in BS years, defaulting to the validated 1970–2100
  window.

## See also

- [Helper functions](/api/helpers) — `BS.GetDaysInMonth` and friends, if you need the math alone
- [Events & instance API](/api/events)
