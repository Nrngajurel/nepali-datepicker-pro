---
title: Nepali Time Picker
description: A time-of-day picker with 12h/24h clocks, optional seconds, minute steps, min/max times and native-dropdown mode — the same time controls as the date-time picker, on their own. Configure it live and copy the snippet.
---

# Time Picker

A time of day on its own, with the same controls as the
[date-time picker's](/components/date-time-picker) time panel: typeable fields plus scroll
wheels, or native dropdowns.

<PickerDemo id="time" />

## Notes

- **12-hour by default.** `timeFormat: '24h'` switches the field and wheels. The submitted
  `value` is always 24-hour `HH:mm` (or `HH:mm:ss` with `withSeconds`), so your backend sees the
  same shape either way.
- **`onChange` carries** `{ hour, minute, second, formatted, value }` — e.g. `formatted:
  '09:30 AM'`, `value: '09:30'`.
- **Constraints.** `minuteStep`, `minTime` / `maxTime` and `disabledTimes(h, m)` work as on the
  date-time picker. A typed time outside them is refused with a message under the field.
- **`timeInputStyle: 'dropdown'`** swaps the wheels for native `<select>`s — compact, and familiar
  to screen-reader users.
- **Keyboard:** type into the field (`09:30`, `9:30 pm` and Nepali digits paste too); on a wheel,
  ↑/↓ step, PageUp/PageDown jump five, Home/End go to the ends, and typing jumps (`p` → PM).
- **No calendar, no `adapter`.** `showCalendarSuffix` doesn't apply.
- **No data-attribute auto-init.** Mount it with `mountTimePicker`, a framework component, or the
  `<nepali-time-picker>` [custom element](/guide/installation#custom-elements).

## Vue and React

```vue
<NepaliTimePicker v-model="time" :options="{ timeFormat: '24h' }" />
<!-- v-model is { hour, minute, second } -->
```

```tsx
<NepaliTimePicker minuteStep={15} onChange={(r) => console.log(r.value)} />
```

## See also

- [Date & Time Picker](/components/date-time-picker)
- [Accessibility](/guide/accessibility)
