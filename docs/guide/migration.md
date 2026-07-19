---
title: Migration
description: Move to Nepali Datepicker Pro from the classic nepalidatepicker global NepaliFunctions object, or from daterangepicker.js — the compatible option shapes and API names.
---

# Migration Notes

## From `nepalidatepicker.sajanmaharjan.com.np`

Use `nepaliFunctions` from `nepali-datepicker-pro` instead of the global `window.NepaliFunctions` object:

```ts
import { nepaliFunctions } from 'nepali-datepicker-pro';

const bs = nepaliFunctions.AD2BS(new Date());
const ad = nepaliFunctions.BS2AD(bs.year, bs.month, bs.day);
```

The compatibility layer preserves familiar names such as `AD2BS`, `BS2AD`, `ConvertToUnicode`, `BS.GetDaysInMonth`, and `BS.ValidateDate`, but it is exported under this package namespace to avoid global collisions.

## From `daterangepicker.js`

The range picker accepts the familiar `locale`, `opens`, `drops`, `autoApply`, `linkedCalendars`, and `ranges` shape:

```ts
import { mountDateRangePicker } from 'nepali-datepicker-pro';

mountDateRangePicker(input, {
  ranges: {
    Today: [new Date(), new Date()]
  },
  locale: {
    separator: ' – ',
    applyLabel: 'Apply',
    firstDay: 0
  }
});
```
