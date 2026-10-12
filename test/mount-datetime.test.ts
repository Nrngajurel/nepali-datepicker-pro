// @vitest-environment jsdom
// Reproduces exactly what an integrator does: mount the DateTime picker on a
// real <input>, open it, and confirm the time UI is present and interactive in
// the mounted popup — not just in a hand-called render.
import assert from 'node:assert/strict';
import { test, beforeEach } from 'vitest';

import { mountDateTimePicker, autoInit } from '../src/index';

beforeEach(() => {
  document.body.innerHTML = '';
});

function open(input: HTMLElement): HTMLElement | null {
  input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return document.querySelector('.ndp-panel--datetime');
}

test('withTime: opening the picker shows the time panel with wheels', () => {
  const input = document.createElement('input');
  input.type = 'text';
  document.body.appendChild(input);
  mountDateTimePicker(input, { withTime: true });

  const panel = open(input);
  assert.ok(panel, 'datetime panel is rendered on open');
  const timePanel = panel!.querySelector('.ndp-time-panel');
  assert.ok(timePanel, 'time panel is present in the opened popup');
  assert.equal(timePanel!.querySelectorAll('.ndp-wheel').length, 3, 'hour + minute + AM/PM wheels (12-hour by default)');
});

test('clicking a day does NOT close the picker when withTime is on', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { withTime: true });
  const panel = open(input);

  const day = panel!.querySelector('.ndp-cell:not(.ndp-cell--empty)')!;
  day.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.ok(document.querySelector('.ndp-time-panel'), 'time panel still visible after selecting a day');
});

test('the mounted hour wheel actually changes the value', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { withTime: true, value: new Date(2024, 3, 13, 10, 30, 0) });
  open(input);

  const hourWheel = document.querySelector('.ndp-wheel')!;
  const eleven = [...hourWheel.querySelectorAll('.ndp-wheel-item')].find((n) => n.textContent === '11')!;
  eleven.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal((inst.getState() as { time: { hour: number } }).time.hour, 11, 'hour advanced via the mounted wheel');
  assert.equal(document.querySelector('.ndp-wheel .ndp-wheel-item.is-selected')!.textContent, '11');
});

test('WITHOUT withTime there is deliberately no time panel', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, {});
  const panel = open(input);
  assert.ok(panel, 'panel opens');
  assert.equal(panel!.querySelector('.ndp-time-panel'), null, 'no time panel when withTime is off');
});

test('live update() toggles input-group buttons without remounting', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { value: new Date(2024, 3, 13) });
  const modeBtn = () => document.querySelector('.ndp-mode-toggle') as HTMLElement | null;
  const clearBtn = () => document.querySelector('.ndp-clear') as HTMLElement | null;

  // Both buttons exist up-front; visibility follows the options.
  assert.notEqual(modeBtn()!.style.display, 'none', 'mode toggle visible by default');
  assert.notEqual(clearBtn()!.style.display, 'none', 'clear visible when a value is set');

  inst.update({ allowModeToggle: false });
  assert.equal(modeBtn()!.style.display, 'none', 'mode toggle hides live');

  inst.update({ clearable: false });
  assert.equal(clearBtn()!.style.display, 'none', 'clear hides live');

  inst.update({ allowModeToggle: true, clearable: true });
  assert.notEqual(modeBtn()!.style.display, 'none', 'mode toggle returns live');
  assert.notEqual(clearBtn()!.style.display, 'none', 'clear returns live');
});

test('autoInit wires data-with-time="true" to a working time panel', () => {
  document.body.innerHTML = '<input id="dt" type="text" data-nepali-datepicker data-with-time="true" readonly>';
  autoInit();
  const input = document.getElementById('dt')!;
  const panel = open(input);
  assert.ok(panel?.querySelector('.ndp-time-panel'), 'autoInit + data-with-time shows the time panel');
});

test('bottom sheet: phone-width viewports dock the popup and the backdrop closes it', () => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ matches: query.includes('max-width: 560px'), media: query })) as unknown as typeof window.matchMedia;
  try {
    const input = document.createElement('input');
    document.body.appendChild(input);
    mountDateTimePicker(input);
    open(input);
    const portal = document.querySelector<HTMLElement>('.ndp-panel-root')!;
    assert.ok(portal.classList.contains('ndp-sheet'), 'popup is a bottom sheet');
    assert.equal(portal.style.top, '', 'no anchored top/left — CSS docks it to the bottom');
    // A tap inside the panel keeps it open; a tap on the portal itself (the backdrop) closes it.
    portal.querySelector('.ndp-cal-label')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    assert.equal(portal.style.display, 'block', 'panel tap keeps it open');
    portal.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    assert.equal(portal.style.display, 'none', 'backdrop tap closes the sheet');
  } finally {
    window.matchMedia = original;
  }
});

test('desktop-width viewports keep the anchored dropdown', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input);
  open(input);
  const portal = document.querySelector<HTMLElement>('.ndp-panel-root')!;
  assert.equal(portal.classList.contains('ndp-sheet'), false);
  assert.notEqual(portal.style.top, '');
});

test('setDefaults: one global calendar mode with the BS/AD switcher hidden everywhere', async () => {
  const { setDefaults, mountDateRangePicker } = await import('../src/index');
  setDefaults({ mode: 'AD', allowModeToggle: false });
  try {
    const dateInput = document.createElement('input');
    const rangeInput = document.createElement('input');
    document.body.append(dateInput, rangeInput);
    const date = mountDateTimePicker(dateInput, { value: new Date(2024, 3, 15) });
    const range = mountDateRangePicker(rangeInput);

    const modeOf = (picker: { getState(): unknown }) => (picker.getState() as { mode: string }).mode;
    assert.equal(modeOf(date), 'AD');
    assert.equal(modeOf(range), 'AD');
    document.querySelectorAll<HTMLElement>('.ndp-mode-toggle').forEach((btn) => {
      assert.equal(btn.style.display, 'none', 'input-group switcher hidden');
    });
    rangeInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert.ok(document.querySelector('.ndp-panel--range'), 'range popup open');
    assert.equal(document.querySelector('.ndp-panel--range .ndp-mode-toggle'), null, 'no switcher inside the range popup');

    // A per-picker option still wins over the global default.
    const bsInput = document.createElement('input');
    document.body.appendChild(bsInput);
    assert.equal(modeOf(mountDateTimePicker(bsInput, { mode: 'BS' })), 'BS');
  } finally {
    setDefaults({ mode: undefined, allowModeToggle: undefined });
  }
});

test('update({ mode }) switches an already-mounted picker', async () => {
  const { mountDateRangePicker } = await import('../src/index');
  const a = document.createElement('input');
  const b = document.createElement('input');
  document.body.append(a, b);
  const date = mountDateTimePicker(a, { value: new Date(2024, 3, 15), allowModeToggle: false });
  const range = mountDateRangePicker(b, { allowModeToggle: false });
  date.update({ mode: 'AD' });
  range.update({ mode: 'AD' });
  assert.equal((date.getState() as { mode: string }).mode, 'AD');
  assert.equal((range.getState() as { mode: string }).mode, 'AD');
  assert.equal(a.value, '2024-04-15', 'input re-renders in the new calendar');
});

test('destroy() hands the input back: same place, original attributes, no stale listeners', async () => {
  const { mountDateRangePicker, mountMonthPicker } = await import('../src/index');
  const mounts = [
    (el: HTMLInputElement) => mountDateTimePicker(el, { submitName: 'when', value: new Date(2024, 3, 15) }),
    (el: HTMLInputElement) => mountDateRangePicker(el, { submitName: 'span' }),
    (el: HTMLInputElement) => mountMonthPicker(el, { submitName: 'month' }),
  ];
  for (const mount of mounts) {
    document.body.innerHTML = '<form><label>A</label><input id="x" name="orig" class="mine"><span id="after"></span></form>';
    const input = document.querySelector<HTMLInputElement>('#x')!;
    const picker = mount(input);
    assert.ok(input.closest('.ndp-trigger-wrap'), 'wrapped while mounted');
    picker.destroy();

    assert.ok(input.isConnected, 'input still in the document');
    assert.equal(input.nextElementSibling?.id, 'after', 'input back in its original position');
    assert.equal(document.querySelector('.ndp-trigger-wrap'), null, 'wrapper removed');
    assert.equal(document.querySelector('.ndp-panel-root'), null, 'portal removed');
    assert.equal(document.querySelectorAll('input[type="hidden"]').length, 0, 'hidden submit inputs removed');
    assert.equal(input.getAttribute('name'), 'orig', 'original name restored');
    assert.equal(input.className, 'mine', 'picker classes removed');
    assert.equal(input.getAttribute('role'), null);
    assert.equal(input.hasAttribute('readonly'), false);

    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert.equal(document.querySelector('.ndp-panel'), null, 'clicking after destroy opens nothing');

    const again = mount(input);
    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert.ok(document.querySelector('.ndp-panel'), 'the input can be mounted again');
    again.destroy();
  }
});

test('destroy() on a non-input target removes the generated trigger button', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  mountDateTimePicker(host).destroy();
  assert.equal(host.children.length, 0);
});

test('clearing notifies: × button fires onClear, the clear.* DOM event and onClear subscribers; setValue(null) stays silent', async () => {
  const { mountDateRangePicker, mountMonthPicker } = await import('../src/index');
  const cases = [
    { event: 'clear.nepaliDatePicker', mount: (el: HTMLInputElement, onClear: () => void) => mountDateTimePicker(el, { value: new Date(2024, 3, 15), onClear }) },
    { event: 'clear.nepaliDateRangePicker', mount: (el: HTMLInputElement, onClear: () => void) => mountDateRangePicker(el, { value: { start: new Date(2024, 3, 1), end: new Date(2024, 3, 5) }, onClear }) },
    { event: 'clear.nepaliMonthPicker', mount: (el: HTMLInputElement, onClear: () => void) => mountMonthPicker(el, { value: { year: 2081, month: 1 }, onClear }) },
  ];
  for (const { event, mount } of cases) {
    document.body.innerHTML = '';
    const input = document.createElement('input');
    document.body.appendChild(input);
    const calls: string[] = [];
    const picker = mount(input, () => calls.push('option'));
    picker.onClear(() => calls.push('subscriber'));
    input.addEventListener(event, () => calls.push('dom'));

    document.querySelector<HTMLElement>('.ndp-clear')!.click();
    assert.deepEqual([...calls].sort(), ['dom', 'option', 'subscriber'], event);
    assert.equal(picker.getValue(), null);
    assert.equal(input.value, '');

    document.querySelector<HTMLElement>('.ndp-clear')!.click();
    assert.equal(calls.length, 3, 'clearing an empty picker notifies nothing');

    picker.setValue(null);
    assert.equal(calls.length, 3, 'setValue(null) is silent');
  }
});

test('clear shortcut: Ctrl/⌘+Backspace clears a typeable field; plain Backspace only edits a section', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  let cleared = 0;
  const picker = mountDateTimePicker(input, { value: new Date(2024, 3, 15), onClear: () => { cleared += 1; } });
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  assert.equal(cleared, 0, 'plain Backspace does not clear the whole value');
  assert.ok(picker.getValue(), 'value still set');

  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', ctrlKey: true, bubbles: true, cancelable: true }));
  assert.equal(cleared, 1);
  assert.equal(picker.getValue(), null);
  assert.ok(!/\d/.test(input.value), 'the in-progress edit is reset too (no stale digits)');

  picker.setValue(new Date(2024, 3, 15));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', metaKey: true, bubbles: true, cancelable: true }));
  assert.equal(cleared, 2, '⌘+Delete works too');
});

test('clear shortcut: plain Backspace/Delete clears a read-only trigger; clearable:false disables clearing', () => {
  const a = document.createElement('input');
  const b = document.createElement('input');
  document.body.append(a, b);
  const ro = mountDateTimePicker(a, { value: new Date(2024, 3, 15), allowInput: false });
  a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
  assert.equal(ro.getValue(), null);

  const fixed = mountDateTimePicker(b, { value: new Date(2024, 3, 15), clearable: false });
  b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', ctrlKey: true, bubbles: true, cancelable: true }));
  assert.ok(fixed.getValue(), 'not clearable → shortcut does nothing');
});

test('the × button is out of the Tab order and advertises the shortcut', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, { value: new Date(2024, 3, 15) });
  const btn = document.querySelector<HTMLButtonElement>('.ndp-clear')!;
  assert.equal(btn.getAttribute('tabindex'), '-1');
  assert.match(btn.title, /Backspace/);
  assert.equal(btn.getAttribute('aria-label'), 'Clear');
});

test('update({ value }) replaces the value silently on all three pickers', async () => {
  const { mountDateRangePicker, mountMonthPicker } = await import('../src/index');
  const changes: unknown[] = [];
  const a = document.createElement('input');
  const b = document.createElement('input');
  const c = document.createElement('input');
  document.body.append(a, b, c);
  const date = mountDateTimePicker(a, { onChange: (v) => changes.push(v) });
  const range = mountDateRangePicker(b, { onApply: (v) => changes.push(v) });
  const month = mountMonthPicker(c, { onChange: (v) => changes.push(v) });
  date.update({ value: new Date(2024, 3, 13) });
  range.update({ value: { start: new Date(2024, 3, 13), end: new Date(2024, 3, 20) } });
  month.update({ value: { year: 2081, month: 2 } });
  assert.equal(date.getValue()!.value, '2024-04-13');
  assert.equal(range.getValue()!.value, '2024-04-13,2024-04-20');
  assert.equal(month.getValue()!.month, 2);
  assert.equal(a.value, '2081-01-01', 'input re-renders');
  assert.equal(changes.length, 0, 'no change events for a controlled value');
});

test('only one popup is open at a time; Tab to another field closes it', () => {
  const a = document.createElement('input');
  const b = document.createElement('input');
  const after = document.createElement('button');
  document.body.append(a, b, after);
  const pa = mountDateTimePicker(a);
  const pb = mountDateTimePicker(b);
  pa.show();
  pb.show();
  const isOpen = (p: { getState(): unknown }) => (p.getState() as { isOpen: boolean }).isOpen;
  assert.equal(isOpen(pa), false, 'opening b closed a');
  assert.equal(isOpen(pb), true);
  assert.equal(document.querySelectorAll('.ndp-panel').length, 1);

  // Focus moving into the popup keeps it open; moving to another control closes it.
  const inPanel = document.querySelector<HTMLElement>('.ndp-panel button')!;
  b.dispatchEvent(new FocusEvent('focusout', { relatedTarget: inPanel }));
  assert.equal(isOpen(pb), true);
  b.dispatchEvent(new FocusEvent('focusout', { relatedTarget: after }));
  assert.equal(isOpen(pb), false, 'Tab to the next control closes the popup');

  pb.show();
  b.dispatchEvent(new FocusEvent('focusout', { relatedTarget: null }));
  assert.equal(isOpen(pb), true, 'focus lost to nowhere (e.g. window blur) leaves it to the click handler');
});

test('date-time altField works when mounted on a non-input element', () => {
  const host = document.createElement('div');
  const alt = document.createElement('input');
  document.body.append(host, alt);
  const p = mountDateTimePicker(host, { altField: alt, value: new Date(2024, 3, 13) });
  assert.equal(alt.value, '2024-04-13');
  p.setValue(new Date(2024, 3, 20));
  assert.equal(alt.value, '2024-04-20');
});

test('autoInit() can run again without double-mounting fields it already set up', () => {
  document.body.innerHTML = '<input data-nepali-datepicker><input data-nepali-daterange><input data-nepali-monthpicker>';
  autoInit();
  autoInit();
  assert.equal(document.querySelectorAll('.ndp-trigger-wrap').length, 3, 'one wrapper per field');
  assert.equal(document.querySelectorAll('.ndp-panel-root').length, 3, 'one portal per field');
  document.body.insertAdjacentHTML('beforeend', '<input data-nepali-datepicker>'); // e.g. AJAX-loaded content
  autoInit();
  assert.equal(document.querySelectorAll('.ndp-trigger-wrap').length, 4, 'new field mounted');
});

test('phone width: a typeable field asks for no on-screen keyboard (the sheet is the input); desktop gets the numeric keypad', () => {
  const original = window.matchMedia;
  const input = document.createElement('input');
  document.body.appendChild(input);
  window.matchMedia = ((q: string) => ({ matches: q.includes('max-width: 560px'), media: q })) as unknown as typeof window.matchMedia;
  try {
    const p = mountDateTimePicker(input);
    assert.equal(input.getAttribute('inputmode'), 'none');
    window.matchMedia = original;
    window.dispatchEvent(new Event('resize')); // e.g. rotating to a wide layout
    assert.equal(input.getAttribute('inputmode'), 'numeric');
    p.destroy();
    assert.equal(input.hasAttribute('inputmode'), false, 'destroy restores the attribute');
  } finally {
    window.matchMedia = original;
  }
});
