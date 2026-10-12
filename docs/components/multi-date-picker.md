---
title: Nepali Multiple Date Picker
description: Pick several Bikram Sambat or Gregorian days from one calendar, with an optional maximum, holidays and disabled days — submits them as one separated list. Configure it live and copy the snippet.
---

# Multiple Date Picker

Pick several days from one calendar: click a day to add it, click it again to remove it. Good for
leave requests, shift rosters or delivery days.

<PickerDemo id="multi" />

## Notes

- **`maxDates`** caps how many days can be picked; there's no limit by default.
- **`onChange` carries** `{ dates, bs, formatted, values, value }`. `dates` are AD `Date`s in date
  order; `value` is the machine values joined by `valueSeparator` (default `,`), which is what
  `submitName` writes.
- **The calendar is the date picker's.** `mode`, the BS/AD switch, `minDate` / `maxDate`,
  `disabledDates`, `disabledWeekdays`, `dayCellProps`, `events`, `weekStartsOn` and
  `weekendDays` all work the same way.
- **The field isn't typeable.** It lists the picked days, and past three days shows a count.
- **No data-attribute auto-init.** Mount it with `mountMultiDatePicker`, a framework component, or
  the `<nepali-multi-date-picker>` [custom element](/guide/installation#custom-elements).

## Vue and React

```vue
<NepaliMultiDatePicker v-model="days" :options="{ maxDates: 5 }" />
<!-- v-model is Date[] -->
```

```tsx
<NepaliMultiDatePicker maxDates={5} minDate="today" onChange={(r) => setDays(r.dates)} />
```

## See also

- [Holidays & events](/guide/options#holidays-events) — mark days on the calendar
- [Events & instance API](/api/events)
