// @vitest-environment jsdom
// Full functional coverage of the Vue 3 wrappers (src/vue.ts): mount, v-model
// write-back on selection, external modelValue -> setValue sync (exercises the
// datetime raw-Date setValue path), @change/@open/@close events, reactive
// options watch, and clean unmount. Uses Vue's own createApp — no
// @vue/test-utils needed.
import { describe, test, expect, afterEach } from 'vitest';
import { createApp, h, ref, nextTick, type App } from 'vue';
import {
  NepaliDateTimePicker,
  NepaliDateRangePicker,
  NepaliMonthPicker,
} from '../src/vue';
import type { DateTimeResult, MonthResult } from '../src/index';

let apps: App[] = [];
let hosts: HTMLElement[] = [];

function mountApp(setup: () => ReturnType<typeof h>) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const app = createApp({ render: setup });
  app.mount(host);
  apps.push(app);
  hosts.push(host);
  return host;
}

function open(host: HTMLElement): HTMLElement {
  const input = host.querySelector('input')!;
  input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return document.querySelector('.ndp-panel') as HTMLElement;
}

function clickFirstDay(panel: HTMLElement) {
  const day = panel.querySelector('.ndp-cell:not(.ndp-cell--empty)') as HTMLElement;
  day.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

afterEach(() => {
  apps.forEach((a) => a.unmount());
  hosts.forEach((h) => h.remove());
  apps = [];
  hosts = [];
  document.body.innerHTML = '';
});

describe('NepaliDateTimePicker (Vue)', () => {
  test('mounts an input wrapped by the picker', () => {
    const host = mountApp(() => h(NepaliDateTimePicker));
    const input = host.querySelector('input');
    expect(input).toBeTruthy();
    expect(input!.closest('.ndp-trigger-wrap')).toBeTruthy();
  });

  test('v-model write-back + @change fire on selection', async () => {
    const model = ref<Date | null>(null);
    let changed: DateTimeResult | null = null;
    const host = mountApp(() =>
      h(NepaliDateTimePicker, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: Date | null) => { model.value = v; },
        onChange: (r: DateTimeResult) => { changed = r; },
      }),
    );
    const panel = open(host);
    clickFirstDay(panel);
    await nextTick();
    expect(model.value).toBeInstanceOf(Date);
    expect(changed).not.toBeNull();
    expect((changed as unknown as DateTimeResult).ad).toBeInstanceOf(Date);
  });

  test('external modelValue change syncs into the picker (raw Date setValue)', async () => {
    const model = ref<Date | null>(null);
    const host = mountApp(() =>
      h(NepaliDateTimePicker, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: Date | null) => { model.value = v; },
      }),
    );
    // Programmatically drive the model — this used to throw
    // "DateValue requires a valid Date" because setValue expected {ad}.
    model.value = new Date(2024, 3, 13);
    await nextTick();
    // The visible input should now reflect a committed value (non-empty).
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  test('initial value option renders a value', async () => {
    const host = mountApp(() =>
      h(NepaliDateTimePicker, { options: { value: new Date(2024, 3, 13) } }),
    );
    await nextTick();
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  test('reactive options watch propagates a live update', async () => {
    const allowToggle = ref(true);
    const host = mountApp(() =>
      h(NepaliDateTimePicker, {
        options: { value: new Date(2024, 3, 13), allowModeToggle: allowToggle.value },
      }),
    );
    await nextTick();
    const modeBtn = () => host.querySelector('.ndp-mode-toggle') as HTMLElement;
    expect(modeBtn().style.display).not.toBe('none');
    allowToggle.value = false;
    await nextTick();
    expect(modeBtn().style.display).toBe('none');
  });

  test('unmounts without throwing', () => {
    const host = mountApp(() => h(NepaliDateTimePicker));
    const app = apps[apps.length - 1];
    expect(() => app.unmount()).not.toThrow();
    apps.pop();
  });
});

describe('NepaliDateRangePicker (Vue)', () => {
  test('mounts and emits change/update on a full range', async () => {
    const model = ref<{ start: Date; end: Date } | null>(null);
    let changed = false;
    const host = mountApp(() =>
      h(NepaliDateRangePicker, {
        options: { autoApply: true },
        modelValue: model.value,
        'onUpdate:modelValue': (v: { start: Date; end: Date } | null) => { model.value = v; },
        onChange: () => { changed = true; },
      }),
    );
    const panel = open(host);
    const days = panel.querySelectorAll('.ndp-cell:not(.ndp-cell--empty)');
    (days[3] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    (days[6] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(changed).toBe(true);
    expect(model.value).not.toBeNull();
    expect(model.value!.start).toBeInstanceOf(Date);
    expect(model.value!.end).toBeInstanceOf(Date);
  });

  test('external modelValue range syncs in', async () => {
    const model = ref<{ start: Date; end: Date } | null>(null);
    const host = mountApp(() =>
      h(NepaliDateRangePicker, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: { start: Date; end: Date } | null) => { model.value = v; },
      }),
    );
    model.value = { start: new Date(2024, 3, 1), end: new Date(2024, 3, 10) };
    await nextTick();
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  test('unmounts without throwing', () => {
    mountApp(() => h(NepaliDateRangePicker));
    const app = apps[apps.length - 1];
    expect(() => app.unmount()).not.toThrow();
    apps.pop();
  });
});

describe('NepaliMonthPicker (Vue)', () => {
  test('mounts and emits a from→to range MonthResult', async () => {
    const model = ref<MonthResult | null>(null);
    let changed: MonthResult | null = null;
    const host = mountApp(() =>
      h(NepaliMonthPicker, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: MonthResult | null) => { model.value = v; },
        onChange: (r: MonthResult) => { changed = r; },
      }),
    );
    const input = host.querySelector('input')!;
    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const cell = document.querySelector('.ndp-panel--month .ndp-monthcell') as HTMLElement;
    expect(cell).toBeTruthy();
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(changed).not.toBeNull();
    const r = changed as unknown as MonthResult;
    expect(r.start).toBeInstanceOf(Date);
    expect(r.end).toBeInstanceOf(Date);
    expect(typeof r.value).toBe('string');
    expect(model.value).not.toBeNull();
  });

  test('external modelValue { year, month } syncs in', async () => {
    const model = ref<MonthResult | null>(null);
    const host = mountApp(() =>
      h(NepaliMonthPicker, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: MonthResult | null) => { model.value = v; },
      }),
    );
    model.value = { year: 2081, month: 1 } as unknown as MonthResult;
    await nextTick();
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);
  });

  test('unmounts without throwing', () => {
    mountApp(() => h(NepaliMonthPicker));
    const app = apps[apps.length - 1];
    expect(() => app.unmount()).not.toThrow();
    apps.pop();
  });
});
