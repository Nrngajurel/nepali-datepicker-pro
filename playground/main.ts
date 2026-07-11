import '../src/theme.css';
import { autoInit } from '../src/index.js';

// Wire up every data-* input on the page.
autoInit();

const out = document.getElementById('out');
function show(text: string) {
  if (out) out.textContent = text;
}

document.addEventListener('select.nepaliDatePicker', (event) => {
  show((event as CustomEvent).detail.formatted);
});
document.addEventListener('apply.nepaliDateRangePicker', (event) => {
  show((event as CustomEvent).detail.formatted);
});
document.addEventListener('select.nepaliMonthPicker', (event) => {
  const { formatted, start, end } = (event as CustomEvent).detail;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  show(`${formatted}  ·  report range ${iso(start)} → ${iso(end)}`);
});
