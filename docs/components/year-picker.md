---
title: Nepali Year Picker
description: Pick a single Bikram Sambat or Gregorian year from a scrollable list — the picker resolves it to the AD date range it covers. Configure it live and copy the snippet.
---

# Year Picker

Pick one year, BS (the default) or AD, from a single scrollable list of every supported year.
Like the [month picker](/components/month-picker), a year is reported as the date range it covers,
so an annual report filter needs no calendar math on your side.

<PickerDemo id="year" />

## Notes

- **A year is emitted as a range.** `onChange` carries `{ year, mode, start, end, startValue,
  endValue, value, formatted }`, where `start`/`end` are the AD `Date`s of the year's first and
  last day — in whichever calendar the picker is in. A BS year runs from 1 Baisakh to the end of
  Chaitra.
- **`value` is the `"start,end"` pair.** `submitName: { start: 'from_date', end: 'to_date' }`
  writes two hidden fields instead.
- **`minYear` / `maxYear` are in the active calendar**, and default to the supported range
  (BS 1970–2100, about AD 1913–2044). `disabledYears(year)` shows a year but blocks picking it.
- **It can switch calendars.** With `allowModeToggle` (default `true`) the BS/AD switch on the
  field flips between BS and AD years.
- **Keyboard:** type the four digits into the field, or open the list and use the arrow keys,
  Home/End and PageUp/PageDown; Enter picks.
- **No data-attribute auto-init.** Mount it with `mountYearPicker`, a framework component, or the
  `<nepali-year-picker>` [custom element](/guide/installation#custom-elements).

## Vue and React

```vue
<NepaliYearPicker v-model="year" :options="{ minYear: 2070 }" />
<!-- v-model is the year number -->
```

```tsx
<NepaliYearPicker minYear={2070} onChange={(r) => setRange([r.start, r.end])} />
```

## See also

- [Month Picker](/components/month-picker)
- [Events & instance API](/api/events)
