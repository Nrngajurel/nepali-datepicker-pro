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

test('withTime: opening the picker shows the time panel with spinners', () => {
  const input = document.createElement('input');
  input.type = 'text';
  document.body.appendChild(input);
  mountDateTimePicker(input, { withTime: true });

  const panel = open(input);
  assert.ok(panel, 'datetime panel is rendered on open');
  const timePanel = panel!.querySelector('.ndp-time-panel');
  assert.ok(timePanel, 'time panel is present in the opened popup');
  assert.equal(timePanel!.querySelectorAll('.ndp-spinner').length, 2, 'hour + minute spinners present');
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

test('the mounted hour spinner actually changes the value', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  const inst = mountDateTimePicker(input, { withTime: true, value: new Date(2024, 3, 13, 10, 30, 0) });
  open(input);

  const hourUp = document.querySelector('.ndp-spinner .ndp-spin-btn')!;
  hourUp.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert.equal((inst.getState() as { time: { hour: number } }).time.hour, 11, 'hour advanced via the mounted button');
  assert.equal((document.querySelector('.ndp-spinner .ndp-spin-value') as HTMLInputElement).value, '11');
});

test('WITHOUT withTime there is deliberately no time panel', () => {
  const input = document.createElement('input');
  document.body.appendChild(input);
  mountDateTimePicker(input, {});
  const panel = open(input);
  assert.ok(panel, 'panel opens');
  assert.equal(panel!.querySelector('.ndp-time-panel'), null, 'no time panel when withTime is off');
});

test('autoInit wires data-with-time="true" to a working time panel', () => {
  document.body.innerHTML = '<input id="dt" type="text" data-nepali-datepicker data-with-time="true" readonly>';
  autoInit();
  const input = document.getElementById('dt')!;
  const panel = open(input);
  assert.ok(panel?.querySelector('.ndp-time-panel'), 'autoInit + data-with-time shows the time panel');
});
