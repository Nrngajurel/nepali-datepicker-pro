---
title: Nepali Date Range Picker
description: A Bikram Sambat start/end range picker with a quick-presets rail, Nepali fiscal-year helpers and a BS/AD toggle — configure it live and copy the snippet for your framework.
---

# Date Range Picker

Start/end range with a presets rail, fiscal-year helpers, and a BS/AD switch. It accepts the
familiar `daterangepicker.js` option shape (`ranges`, `opens`, `drops`, `autoApply`,
`linkedCalendars`), so an existing integration usually ports across with no rewrite.

<PickerDemo id="range" />

## Notes

- **Fiscal years are first class.** `fiscalStartMonth` defaults to `4` (Shrawan), which drives
  the "This fiscal year" / "Last fiscal year" presets.
- **`onChange` fires mid-selection, `onApply` fires on commit.** Use `onApply` for anything that
  hits your server; `onChange` carries a partial `{ start?, end? }` while the user is still
  picking.
- **Two-field submission.** `submitName: { start: 'from_date', end: 'to_date' }` writes two
  hidden inputs, which drops straight into a `WHERE date BETWEEN ? AND ?` query.
- **Toggling BS/AD really switches the calendar**, including "Pick a Month" — navigation, the
  month/year grids, and day cells all walk whichever calendar is active. Set
  `showSecondaryCalendar: false` to hide the other calendar's hint and focus on one system.

## See also

- [Migration from daterangepicker.js](/guide/migration)
- [Events & instance API](/api/events)
