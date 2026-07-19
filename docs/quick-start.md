# Quick Start

Every picker attaches to an `<input>` and returns an instance you can drive
programmatically. The value is emitted as `{ ad, bs, time?, formatted }` (see
each picker's result type) — you get both calendars and a preformatted
string. These snippets mirror the live playground (`npm run dev`) — switch
the framework tab there to copy the exact code for your stack.

Install once:

```bash
npm install nepali-datepicker-pro
```

```ts
import 'nepali-datepicker-pro/style.css';
```

---

## Date & Time picker

### Vanilla JS

```ts
import { mountDateTimePicker } from 'nepali-datepicker-pro';
import 'nepali-datepicker-pro/style.css';

mountDateTimePicker(document.querySelector('#picker'), {
  withTime: true,
  valueFormat: 'iso',
});
```

### HTML / `<script>` tag

```html
<link rel="stylesheet" href="https://unpkg.com/nepali-datepicker-pro/dist/style.css">
<script src="https://unpkg.com/nepali-datepicker-pro/dist/nepali-datepicker-pro.umd.cjs"></script>

<input data-nepali-datepicker data-with-time="true" data-value-format="iso" readonly>
<script>NepaliPicker.autoInit()</script>
```

### React

```tsx
import { NepaliDateTimePicker } from 'nepali-datepicker-pro/react';
import 'nepali-datepicker-pro/style.css';

<NepaliDateTimePicker withTime valueFormat="iso" />
```

### Vue 3

```vue
<script setup lang="ts">
import { NepaliDateTimePicker } from 'nepali-datepicker-pro/vue';
import 'nepali-datepicker-pro/style.css';
</script>

<template>
  <NepaliDateTimePicker :options="{ withTime: true, valueFormat: 'iso' }" />
</template>
```

### jQuery

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://unpkg.com/nepali-datepicker-pro/dist/nepali-datepicker-pro.umd.cjs"></script>

<script>
  $('#picker').nepaliDateTimePicker({ withTime: true, valueFormat: 'iso' });
</script>
```

---

## Date Range picker

### Vanilla JS

```ts
import { mountDateRangePicker } from 'nepali-datepicker-pro';
import 'nepali-datepicker-pro/style.css';

mountDateRangePicker(document.querySelector('#range'), { fiscalStartMonth: 4 });
```

### HTML / `<script>` tag

```html
<input data-nepali-daterange data-fiscal-start-month="4" readonly>
<script>NepaliPicker.autoInit()</script>
```

### React

```tsx
import { NepaliDateRangePicker } from 'nepali-datepicker-pro/react';

<NepaliDateRangePicker fiscalStartMonth={4} onApply={(r) => console.log(r)} />
```

### Vue 3

```vue
<NepaliDateRangePicker :options="{ fiscalStartMonth: 4 }" @apply="onApply" />
```

### jQuery

```js
$('#range').nepaliDateRangePicker({
  fiscalStartMonth: 4,
  appendTo: '#modal-id',
});
```

---

## Month picker

### Vanilla JS

```ts
import { mountMonthPicker } from 'nepali-datepicker-pro';

mountMonthPicker(document.querySelector('#month'), {
  submitName: { start: 'from_date', end: 'to_date' },
});
```

### HTML / `<script>` tag

```html
<input data-nepali-monthpicker data-submit-name="report_month" readonly>
<script>NepaliPicker.autoInit()</script>
```

### React

```tsx
import { NepaliMonthPicker } from 'nepali-datepicker-pro/react';

<NepaliMonthPicker submitName={{ start: 'from_date', end: 'to_date' }} onChange={(r) => console.log(r.start, r.end)} />
```

### Vue 3

```vue
<NepaliMonthPicker :options="{ submitName: { start: 'from_date', end: 'to_date' } }" @change="onChange" />
```

### jQuery

```js
$('#month').nepaliMonthPicker({ submitName: { start: 'from_date', end: 'to_date' } });
```

---

## Helper functions (no picker needed)

```ts
import { nepaliFunctions as NF } from 'nepali-datepicker-pro';

NF.AD2BS(new Date());              // → { year, month, day }
NF.BS2AD(2081, 4, 1);              // → Date (AD)
NF.BS.GetDaysInMonth(2081, 4);     // → 32
NF.ConvertToUnicode(2081);         // → '२०८१'
```

See the main [README](../README.md) for the full option/event reference, and [options.md](./options.md) for integration-specific options.
