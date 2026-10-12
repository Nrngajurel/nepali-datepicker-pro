// @vitest-environment jsdom
// The popup's code (and the paste parser) are split off and loaded on first
// use — src/render/lazy.ts. test/setup.ts preloads them for every other test;
// here each test starts from a fresh module graph, so nothing is loaded yet.
import assert from 'node:assert/strict';
import { beforeEach, test, vi } from 'vitest';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.resetModules();
});

async function fresh() {
  const lazy = await import('../src/render/lazy');
  const lib = await import('../src/index');
  return { lazy, lib };
}

function field(): HTMLInputElement {
  const input = document.createElement('input');
  document.body.appendChild(input);
  return input;
}

const portalOf = (input: HTMLInputElement) => document.getElementById(input.getAttribute('aria-controls')!)!;

test('the popup opens once its code has loaded; the field works before that', async () => {
  const { lazy, lib } = await fresh();
  assert.equal(lazy.loaded('datetime'), undefined);
  const input = field();
  const picker = lib.mountDateTimePicker(input, { mode: 'AD' });
  // Typing needs no popup code.
  input.focus();
  for (const key of '20240413') input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  input.blur();
  assert.equal(picker.getValue()?.value, '2024-04-13');

  picker.show();
  const portal = portalOf(input);
  assert.equal(portal.style.display, 'none', 'hidden until the code is in');
  await vi.waitFor(() => assert.ok(portal.querySelector('.ndp-panel')));
  assert.equal(portal.style.display, 'block');
  assert.equal(input.getAttribute('aria-expanded'), 'true');
});

test('a date-only picker never loads the time wheels; a date-time one does', async () => {
  const { lazy, lib } = await fresh();
  const dateOnly = lib.mountDateTimePicker(field(), {});
  dateOnly.show();
  await vi.waitFor(() => assert.ok(lazy.loaded('datetime')));
  assert.equal(lazy.loaded('timeControls'), undefined);
  dateOnly.hide();

  const input = field();
  const withTime = lib.mountDateTimePicker(input, { withTime: true });
  withTime.show();
  await vi.waitFor(() => assert.ok(portalOf(input).querySelector('.ndp-time-panel')));
  assert.ok(lazy.loaded('timeControls'));
});

test('reaching for the field prefetches the popup', async () => {
  const { lazy, lib } = await fresh();
  const input = field();
  lib.mountMonthPicker(input, {});
  input.dispatchEvent(new Event('pointerenter'));
  await vi.waitFor(() => assert.ok(lazy.loaded('month') && lazy.loaded('popup')));
});

test('paste waits for the parser, then commits', async () => {
  const { lazy, lib } = await fresh();
  const input = field();
  const picker = lib.mountDateTimePicker(input, { mode: 'AD' });
  input.focus();
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => '13 April 2024' } });
  input.dispatchEvent(event);
  assert.equal(lazy.loaded('loose'), undefined);
  await vi.waitFor(() => assert.equal(picker.getValue()?.value, '2024-04-13'));
});

test('inline pickers draw as soon as the code arrives', async () => {
  const { lib } = await fresh();
  const host = document.createElement('div');
  document.body.appendChild(host);
  lib.mountDateTimePicker(host, { inline: true });
  await vi.waitFor(() => assert.ok(document.querySelector('.ndp-inline .ndp-panel')));
});
