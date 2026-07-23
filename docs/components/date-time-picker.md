---
title: Nepali Date & Time Picker
description: A Bikram Sambat single-date picker with an optional same-screen 12h/24h time picker — configure it live, see every option, and copy the snippet for your framework.
---

# Date & Time Picker

Single date with an optional same-screen time picker. Click the header to jump by month or year,
or type straight into the segmented field — it accepts Nepali and ASCII digits alike.

Tweak the options below and the live preview updates in place; the snippet underneath always
matches exactly what you're looking at.

<PickerDemo id="datetime" />

## Notes

- **Time is not a second popup.** With `withTime: true` the clock sits under the calendar, as
  accessible `HH:mm` spinbuttons — Arrow keys step them, the scroll wheel works, and Nepali
  digits are accepted.
- **`closeOnSelect` defaults to `true` unless `withTime` is on**, so a date-and-time picker
  stays open long enough to set the time.
- **Constraints accept relative tokens.** `minDate: 'today'`, `maxDate: '+1m'` and friends are
  resolved at open time, not at mount time.
- **Toggling BS/AD really switches the calendar.** The header, month/year grids and day cells all
  navigate the calendar you switch to (not just relabel it), and show the overlapped span of the
  other calendar as a hint (e.g. a BS month shows "April/May" since it straddles two AD months).
  Set `showSecondaryCalendar: false` to hide that hint and show only the active calendar.

## See also

- [Events & instance API](/api/events) — every callback and DOM event this picker fires
- [Options](/guide/options) — `valueFormat`, `submitName` and `altField` in depth
