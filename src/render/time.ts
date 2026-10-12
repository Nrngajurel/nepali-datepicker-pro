// Time-of-day controls: keyboard-first spinbutton fields, iOS-style scroll
// wheels, or native selects (timeInputStyle: 'dropdown'), plus the phone
// time step and the range picker's per-end time row.
import type { DateRangeController, RangeEnd } from '../application/date-range-controller.js';
import type { DateTimeController } from '../application/date-time-controller.js';
import { monthNames, digits } from '../application/ui.js';
import { normalizeDigits } from '../format/parse.js';
import { el, pad2, setText, uid } from './parts.js';

function meridiemOf(hour: number): 'AM' | 'PM' {
  return hour < 12 ? 'AM' : 'PM';
}

export function to12h(hour: number): number {
  const h = hour % 12;
  return h === 0 ? 12 : h;
}

interface WheelItem {
  value: number;
  text: string;
  disabled: boolean;
}

// A scrollable "drum" column, iOS-style. The row nearest the center band is the
// selection; disabled rows are shown struck-through and skipped when the scroll
// settles. Clicking a row selects it directly — the deterministic path used by
// touch and tests — while a flick-scroll commits the centered value once it
// comes to rest (a full re-render then re-centers on the committed row).
// The scrolling list is a focusable listbox (a scroll region must be reachable
// from the keyboard): ↑/↓ step, PageUp/PageDown jump five, Home/End go to the
// ends, digits / letters jump by value.
function timeWheel(label: string, field: string, items: WheelItem[], selectedValue: number, onSelect: (value: number) => void): HTMLElement {
  const wheel = el('div', 'ndp-wheel');
  const list = el('div', 'ndp-wheel-list', { role: 'listbox', 'aria-label': label, 'data-ndp-field': field });
  const rows: HTMLElement[] = [];
  let selectedIndex = Math.max(0, items.findIndex((it) => it.value === selectedValue));
  const idBase = uid('ndp-opt');

  items.forEach((it, i) => {
    const classes = ['ndp-wheel-item'];
    if (it.disabled) classes.push('is-disabled');
    if (it.value === selectedValue) classes.push('is-selected');
    const row = setText(el('button', classes.join(' '), {
      type: 'button',
      role: 'option',
      id: `${idBase}-${i}`,
      tabindex: '-1',
      'aria-selected': it.value === selectedValue ? 'true' : 'false',
      'aria-disabled': it.disabled ? 'true' : 'false',
    }), it.text);
    if (!it.disabled) row.addEventListener('click', () => onSelect(it.value));
    rows.push(row);
    list.appendChild(row);
  });
  wheel.appendChild(list);

  {
    list.tabIndex = 0;
    if (rows[selectedIndex]) list.setAttribute('aria-activedescendant', rows[selectedIndex].id);
    let typed = '';
    let typedTimer = 0;
    const pickFrom = (start: number, direction: 1 | -1): void => {
      for (let i = start; i >= 0 && i < items.length; i += direction) {
        if (!items[i].disabled) {
          if (items[i].value !== selectedValue) onSelect(items[i].value);
          return;
        }
      }
    };
    list.addEventListener('keydown', (event) => {
      const e = event as KeyboardEvent;
      if (e.key === 'ArrowDown') pickFrom(selectedIndex + 1, 1);
      else if (e.key === 'ArrowUp') pickFrom(selectedIndex - 1, -1);
      else if (e.key === 'PageDown') pickFrom(Math.min(items.length - 1, selectedIndex + 5), 1);
      else if (e.key === 'PageUp') pickFrom(Math.max(0, selectedIndex - 5), -1);
      else if (e.key === 'Home') pickFrom(0, 1);
      else if (e.key === 'End') pickFrom(items.length - 1, -1);
      else if (/^[0-9a-zA-Z०-९]$/.test(e.key)) {
        // Type-ahead: "0", "3" → 03; "p" → PM.
        window.clearTimeout(typedTimer);
        typed += normalizeDigits(e.key).toLowerCase();
        typedTimer = window.setTimeout(() => { typed = ''; }, 700);
        const match = items.find((it) => !it.disabled && it.text.toLowerCase().startsWith(typed))
          ?? items.find((it) => !it.disabled && it.text.toLowerCase().replace(/^0/, '').startsWith(typed));
        if (match && match.value !== selectedValue) onSelect(match.value);
      } else return;
      e.preventDefault();
    });
  }

  const center = (): void => {
    const row = rows[selectedIndex];
    if (row) list.scrollTop = row.offsetTop - (list.clientHeight - row.clientHeight) / 2;
  };

  let settle = 0;
  list.addEventListener('scroll', () => {
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      // A tap re-renders the panel, replacing this wheel; a settle timer still
      // pending on the old one must not override what was just tapped.
      if (!list.isConnected) return;
      const mid = list.scrollTop + list.clientHeight / 2;
      let bestIndex = selectedIndex;
      let bestDist = Infinity;
      rows.forEach((row, i) => {
        if (items[i].disabled) return;
        const dist = Math.abs(row.offsetTop + row.clientHeight / 2 - mid);
        if (dist < bestDist) { bestDist = dist; bestIndex = i; }
      });
      if (items[bestIndex] && items[bestIndex].value !== selectedValue) onSelect(items[bestIndex].value);
      else { selectedIndex = bestIndex; center(); }
    }, 130);
  }, { passive: true });

  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(center);
  else center();
  return wheel;
}

// An accessible, keyboard-first numeric field for one time segment. It's an
// ARIA spinbutton: type digits (masked to two, Nepali digits accepted), Arrow
// Up/Down steps, Enter/blur commits. `onCommit` returns false for an invalid or
// disabled value, and the field reverts to the last good display. `field` tags
// the element so focus can be restored after the panel re-renders.
function timeInput(opts: {
  field: string;
  label: string;
  display: string;
  min: number;
  max: number;
  now: number;
  onCommit: (raw: string) => boolean;
  onStep: (delta: number) => void;
}): HTMLInputElement {
  const input = el('input', 'ndp-time-input', {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: '2',
    role: 'spinbutton',
    'aria-label': opts.label,
    'aria-valuemin': String(opts.min),
    'aria-valuemax': String(opts.max),
    'aria-valuenow': String(opts.now),
    'aria-valuetext': opts.display,
    'data-ndp-field': opts.field,
  });
  input.value = opts.display;
  const revert = () => { input.value = opts.display; input.classList.remove('ndp-input-invalid'); input.removeAttribute('aria-invalid'); };
  input.addEventListener('focus', () => input.select());
  input.addEventListener('input', () => {
    input.value = normalizeDigits(input.value).replace(/\D/g, '').slice(0, 2);
    // Live invalid hint without committing (empty is neutral, not invalid).
    const n = Number(input.value);
    const bad = input.value !== '' && (Number.isNaN(n) || n < opts.min || n > opts.max);
    input.classList.toggle('ndp-input-invalid', bad);
    if (bad) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); opts.onStep(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); opts.onStep(-1); }
    else if (e.key === 'PageUp') { e.preventDefault(); opts.onStep(5); }
    else if (e.key === 'PageDown') { e.preventDefault(); opts.onStep(-5); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!opts.onCommit(input.value)) revert(); }
  });
  input.addEventListener('blur', () => { if (!opts.onCommit(input.value)) revert(); });
  return input;
}

function meridiemButton(pm: boolean, field: string, label: string, toggle: () => void): HTMLElement {
  const ampm = setText(el('button', 'ndp-time-ampm', {
    type: 'button',
    'data-ndp-field': field,
    'aria-label': `${label}: ${pm ? 'PM' : 'AM'}`,
  }), pm ? 'PM' : 'AM');
  ampm.addEventListener('click', toggle);
  ampm.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); toggle(); }
  });
  return ampm;
}

function select(field: string, label: string, options: Array<{ value: number; text: string; disabled?: boolean }>, selected: number, onChange: (value: number) => void): HTMLSelectElement {
  const node = el('select', 'ndp-time-select', { 'aria-label': label, 'data-ndp-field': field });
  options.forEach((option) => {
    const opt = setText(el('option', '', { value: String(option.value) }), option.text);
    if (option.disabled) opt.disabled = true;
    if (option.value === selected) opt.selected = true;
    node.appendChild(opt);
  });
  node.addEventListener('change', () => onChange(Number(node.value)));
  return node;
}

// `touch` is the phone time step: just big wheels (spinning is the touch idiom;
// typing digits on an on-screen keyboard is not), without the typed entry.
export function renderTimeControls(controller: DateTimeController, touch = false): HTMLElement | null {
  const state = controller.getState();
  if (!state.time) return null;
  const options = controller.getOptions();
  const s = controller.getUi().strings;
  const { hour, minute, second } = state.time;
  const is12h = state.timeFormat === '12h';
  const seconds = !!options.withSeconds;
  const step = state.minuteStep > 0 ? state.minuteStep : 1;
  const pm = meridiemOf(hour) === 'PM';
  const dropdown = options.timeInputStyle === 'dropdown' && !touch;

  const panel = el('div', touch ? 'ndp-time-panel ndp-time-panel--touch' : `ndp-time-panel${dropdown ? ' ndp-time-panel--dropdown' : ''}`, { role: 'group', 'aria-label': s.time });
  if (!touch) panel.appendChild(setText(el('div', 'ndp-time-title', { 'aria-hidden': 'true' }), s.time));

  const to24 = (display: number): number => (is12h ? (display % 12) + (pm ? 12 : 0) : display);
  const hourDisplay = is12h ? to12h(hour) : hour;

  const hourItems: WheelItem[] = [];
  if (is12h) {
    for (let d = 1; d <= 12; d += 1) hourItems.push({ value: d, text: pad2(d), disabled: controller.isHourDisabled(to24(d)) });
  } else {
    for (let h = 0; h < 24; h += 1) hourItems.push({ value: h, text: pad2(h), disabled: controller.isHourDisabled(h) });
  }
  const minuteItems: WheelItem[] = [];
  for (let m = 0; m < 60; m += step) minuteItems.push({ value: m, text: pad2(m), disabled: controller.isMinuteDisabled(hour, m) });
  const secondItems: WheelItem[] = [];
  if (seconds) for (let sec = 0; sec < 60; sec += 1) secondItems.push({ value: sec, text: pad2(sec), disabled: false });

  if (dropdown) {
    const row = el('div', 'ndp-time-entry ndp-time-entry--dropdown');
    row.appendChild(select('hour', s.hour, hourItems, hourDisplay, (v) => controller.setTime(to24(v), minute, second)));
    row.appendChild(setText(el('span', 'ndp-time-entry-colon', { 'aria-hidden': 'true' }), ':'));
    // A minute off the step grid (typed, or from setValue) stays selectable.
    const minuteOptions = minuteItems.some((it) => it.value === minute) ? minuteItems : [...minuteItems, { value: minute, text: pad2(minute), disabled: false }].sort((a, b) => a.value - b.value);
    row.appendChild(select('minute', s.minute, minuteOptions, minute, (v) => controller.setTime(hour, v, second)));
    if (seconds) {
      row.appendChild(setText(el('span', 'ndp-time-entry-colon', { 'aria-hidden': 'true' }), ':'));
      row.appendChild(select('second', s.second, secondItems, second, (v) => controller.setTime(hour, minute, v)));
    }
    if (is12h) {
      row.appendChild(select('ampm', s.meridiem, [{ value: 0, text: 'AM' }, { value: 1, text: 'PM' }], pm ? 1 : 0, (v) => { if ((v === 1) !== pm) controller.toggleMeridiem(); }));
    }
    panel.appendChild(row);
  } else {
    // ---- editable entry (keyboard-first): type HH : mm [: ss] [AM/PM] ----
    if (!touch) {
      const entry = el('div', 'ndp-time-entry', { role: 'group', 'aria-label': s.enterTime });
      entry.appendChild(timeInput({
        field: 'hour',
        label: is12h ? `${s.hour} (1–12)` : `${s.hour} (0–23)`,
        display: pad2(hourDisplay),
        min: is12h ? 1 : 0,
        max: is12h ? 12 : 23,
        now: hourDisplay,
        onCommit: (raw) => {
          if (raw === '') return false;
          const n = Number(normalizeDigits(raw));
          if (!Number.isInteger(n)) return false;
          if (is12h) return n >= 1 && n <= 12 ? controller.setHour((n % 12) + (pm ? 12 : 0)) : false;
          return controller.setHour(n);
        },
        onStep: (d) => controller.stepHour(d),
      }));
      entry.appendChild(setText(el('span', 'ndp-time-entry-colon', { 'aria-hidden': 'true' }), ':'));
      entry.appendChild(timeInput({
        field: 'minute',
        label: `${s.minute} (0–59)`,
        display: pad2(minute),
        min: 0,
        max: 59,
        now: minute,
        onCommit: (raw) => {
          if (raw === '') return false;
          const n = Number(normalizeDigits(raw));
          return Number.isInteger(n) ? controller.setMinute(n) : false;
        },
        onStep: (d) => controller.stepMinute(d),
      }));
      if (seconds) {
        entry.appendChild(setText(el('span', 'ndp-time-entry-colon', { 'aria-hidden': 'true' }), ':'));
        entry.appendChild(timeInput({
          field: 'second',
          label: `${s.second} (0–59)`,
          display: pad2(second),
          min: 0,
          max: 59,
          now: second,
          onCommit: (raw) => {
            if (raw === '') return false;
            const n = Number(normalizeDigits(raw));
            return Number.isInteger(n) ? controller.setSecond(n) : false;
          },
          onStep: (d) => controller.stepSecond(d),
        }));
      }
      if (is12h) entry.appendChild(meridiemButton(pm, 'ampm', s.meridiem, () => controller.toggleMeridiem()));
      panel.appendChild(entry);
      panel.appendChild(setText(el('div', 'ndp-time-scroll-hint', { 'aria-hidden': 'true' }), s.orScroll));
    }

    const wheels = el('div', 'ndp-time-wheels');
    wheels.appendChild(timeWheel(s.hourWheel, 'wheel-hour', hourItems, hourDisplay, (display) => controller.setTime(to24(display), minute, second)));
    wheels.appendChild(setText(el('span', 'ndp-wheel-colon', { 'aria-hidden': 'true' }), ':'));
    wheels.appendChild(timeWheel(s.minuteWheel, 'wheel-minute', minuteItems, minute, (m) => controller.setTime(hour, m, second)));
    if (seconds) {
      wheels.appendChild(setText(el('span', 'ndp-wheel-colon', { 'aria-hidden': 'true' }), ':'));
      wheels.appendChild(timeWheel(s.secondWheel, 'wheel-second', secondItems, second, (sec) => controller.setTime(hour, minute, sec)));
    }
    if (is12h) {
      const merItems: WheelItem[] = [
        { value: 0, text: 'AM', disabled: false },
        { value: 1, text: 'PM', disabled: false },
      ];
      wheels.appendChild(timeWheel(s.meridiemWheel, 'wheel-ampm', merItems, pm ? 1 : 0, (v) => { if ((v === 1) !== pm) controller.toggleMeridiem(); }));
    }
    panel.appendChild(wheels);
  }

  const now = setText(el('button', 'ndp-time-now', { type: 'button', 'data-ndp-field': 'now' }), s.now);
  now.addEventListener('click', () => controller.setTimeToNow());
  panel.appendChild(now);
  return panel;
}

// Step 2 of the phone date-time sheet: which date you picked (tap to go back
// and change it), the time as a big readout, and the wheels.
export function renderTimeStep(controller: DateTimeController): HTMLElement {
  const adapter = controller.getAdapter();
  const ui = controller.getUi();
  const state = controller.getState();
  const selected = state.selected!;
  const time = state.time!;
  const wrap = el('div', 'ndp-time-step');

  const bsLabel = `${digits(selected.bs.day, 'BS', adapter, ui)} ${monthNames('BS', adapter, ui, state.mode)[selected.bs.month - 1]} ${digits(selected.bs.year, 'BS', adapter, ui)}`;
  const adLabel = `${digits(selected.ad.getDate(), 'AD', adapter, ui)} ${monthNames('AD', adapter, ui, state.mode)[selected.ad.getMonth()]} ${digits(selected.ad.getFullYear(), 'AD', adapter, ui)}`;
  const back = el('button', 'ndp-step-back', { type: 'button', 'aria-label': `${ui.strings.changeDate}: ${state.mode === 'AD' ? adLabel : bsLabel}`, 'data-ndp-field': 'step-back' });
  back.appendChild(setText(el('span', 'ndp-step-back-icon', { 'aria-hidden': 'true' }), '‹'));
  const dateText = el('span', 'ndp-step-date', { 'aria-hidden': 'true' });
  dateText.appendChild(setText(el('span', 'ndp-step-date-primary'), state.mode === 'AD' ? adLabel : bsLabel));
  if (state.showSecondaryCalendar) dateText.appendChild(setText(el('span', 'ndp-step-date-secondary'), state.mode === 'AD' ? bsLabel : adLabel));
  back.appendChild(dateText);
  back.addEventListener('click', () => controller.setPanelStep('date'));
  wrap.appendChild(back);

  const is12h = state.timeFormat === '12h';
  const sec = controller.getOptions().withSeconds ? `:${pad2(time.second)}` : '';
  const readout = is12h
    ? `${pad2(to12h(time.hour))}:${pad2(time.minute)}${sec} ${meridiemOf(time.hour)}`
    : `${pad2(time.hour)}:${pad2(time.minute)}${sec}`;
  wrap.appendChild(setText(el('div', 'ndp-time-readout', { 'aria-live': 'polite' }), readout));
  wrap.appendChild(renderTimeControls(controller, true)!);
  return wrap;
}

// The range picker's time row: a compact HH:mm [AM/PM] entry for each end.
export function renderRangeTimeRow(controller: DateRangeController): HTMLElement | null {
  const state = controller.getState();
  if (!state.startTime || !state.endTime) return null;
  const s = controller.getUi().strings;
  const is12h = state.timeFormat === '12h';
  const row = el('div', 'ndp-range-times');
  (['start', 'end'] as RangeEnd[]).forEach((which) => {
    const time = which === 'start' ? state.startTime! : state.endTime!;
    const pm = time.hour >= 12;
    const label = which === 'start' ? s.start : s.end;
    const group = el('div', 'ndp-time-entry', { role: 'group', 'aria-label': `${label} · ${s.time}` });
    group.appendChild(setText(el('span', 'ndp-range-time-label', { 'aria-hidden': 'true' }), label));
    const hourDisplay = is12h ? to12h(time.hour) : time.hour;
    group.appendChild(timeInput({
      field: `${which}-hour`,
      label: `${label} ${s.hour}`,
      display: pad2(hourDisplay),
      min: is12h ? 1 : 0,
      max: is12h ? 12 : 23,
      now: hourDisplay,
      onCommit: (raw) => {
        const n = Number(normalizeDigits(raw));
        if (raw === '' || !Number.isInteger(n)) return false;
        if (is12h) return n >= 1 && n <= 12 ? controller.setRangeTime(which, (n % 12) + (pm ? 12 : 0), time.minute) : false;
        return controller.setRangeTime(which, n, time.minute);
      },
      onStep: (d) => controller.stepRangeTime(which, 'hour', d),
    }));
    group.appendChild(setText(el('span', 'ndp-time-entry-colon', { 'aria-hidden': 'true' }), ':'));
    group.appendChild(timeInput({
      field: `${which}-minute`,
      label: `${label} ${s.minute}`,
      display: pad2(time.minute),
      min: 0,
      max: 59,
      now: time.minute,
      onCommit: (raw) => {
        const n = Number(normalizeDigits(raw));
        if (raw === '' || !Number.isInteger(n)) return false;
        return controller.setRangeTime(which, time.hour, n);
      },
      onStep: (d) => controller.stepRangeTime(which, 'minute', d),
    }));
    if (is12h) group.appendChild(meridiemButton(pm, `${which}-ampm`, `${label} ${s.meridiem}`, () => controller.toggleRangeMeridiem(which)));
    row.appendChild(group);
  });
  return row;
}
