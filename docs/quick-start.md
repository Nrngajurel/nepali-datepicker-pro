# Quick Start

## Vanilla

```html
<link rel="stylesheet" href="nepali-datepicker/style.css">
<script type="module">
  import { mountDateRangePicker } from 'nepali-datepicker';
  mountDateRangePicker(document.querySelector('#range'), { fiscalStartMonth: 4 });
</script>
<input id="range" readonly>
```

## jQuery

```js
$('#range').nepaliDateRangePicker({
  fiscalStartMonth: 4,
  container: '#modal-id'
});
```

## React

```tsx
<NepaliDateRangePicker fiscalStartMonth={4} />
```

## Vue

```vue
<NepaliDateRangePicker :options="{ fiscalStartMonth: 4 }" />
```
