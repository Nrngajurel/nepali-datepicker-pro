// @vitest-environment jsdom
// Full functional coverage of the React wrappers (src/react.tsx): mount inside
// a host <div>, callbacks fire with the latest closure, className lands on the
// host, live config updates propagate, unmount destroys cleanly (no
// "node to be removed is not a child" crash), and StrictMode double-mount is
// survived. Uses react-dom/client + React's act() — no testing-library needed.
import { describe, test, expect, afterEach } from 'vitest';
import { createElement, StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  NepaliDateTimePicker,
  NepaliDateRangePicker,
  NepaliMonthPicker,
} from '../src/react';
import type { DateTimeResult, MonthResult } from '../src/index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let containers: HTMLElement[] = [];
let roots: Root[] = [];

function render(element: React.ReactElement): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  containers.push(container);
  roots.push(root);
  return container;
}

function rerender(root: Root, element: React.ReactElement) {
  act(() => root.render(element));
}

function open(container: HTMLElement): HTMLElement {
  const input = container.querySelector('input')!;
  act(() => {
    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  return document.querySelector('.ndp-panel') as HTMLElement;
}

function clickFirstDay(panel: HTMLElement) {
  const day = panel.querySelector('.ndp-cell:not(.ndp-cell--empty)') as HTMLElement;
  act(() => {
    day.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  containers.forEach((c) => c.remove());
  roots = [];
  containers = [];
  document.body.innerHTML = '';
});

describe('NepaliDateTimePicker (React)', () => {
  test('mounts an input inside a host div', () => {
    const c = render(createElement(NepaliDateTimePicker, {}));
    const input = c.querySelector('input');
    expect(input).toBeTruthy();
    // picker wraps the input in its own trigger-wrap; that wrap lives INSIDE
    // the host div that React owns (this is what keeps unmount crash-free).
    expect(input!.closest('.ndp-trigger-wrap')).toBeTruthy();
    expect((c.firstElementChild as HTMLElement).contains(input!)).toBe(true);
  });

  test('className lands on the React-owned host', () => {
    const c = render(createElement(NepaliDateTimePicker, { className: 'my-picker' }));
    expect((c.firstElementChild as HTMLElement).classList.contains('my-picker')).toBe(true);
  });

  test('onChange fires with a DateTimeResult when a day is picked', () => {
    let result: DateTimeResult | null = null;
    const c = render(
      createElement(NepaliDateTimePicker, { onChange: (r: DateTimeResult) => { result = r; } }),
    );
    const panel = open(c);
    clickFirstDay(panel);
    expect(result).not.toBeNull();
    expect((result as unknown as DateTimeResult).ad).toBeInstanceOf(Date);
  });

  test('latest callback is used after a re-render (no stale closure)', () => {
    let calls: string[] = [];
    const c = render(
      createElement(NepaliDateTimePicker, { onChange: () => calls.push('first') }),
    );
    rerender(roots[roots.length - 1], createElement(NepaliDateTimePicker, {
      onChange: () => calls.push('second'),
    }));
    const panel = open(c);
    clickFirstDay(panel);
    expect(calls).toEqual(['second']);
  });

  test('live config change propagates via update() without remounting', () => {
    const first = render(createElement(NepaliDateTimePicker, {
      value: new Date(2024, 3, 13), allowModeToggle: true,
    }));
    const wrapBefore = first.querySelector('.ndp-trigger-wrap');
    const modeBtn = () => document.querySelector('.ndp-mode-toggle') as HTMLElement;
    expect(modeBtn().style.display).not.toBe('none');

    rerender(roots[roots.length - 1], createElement(NepaliDateTimePicker, {
      value: new Date(2024, 3, 13), allowModeToggle: false,
    }));
    expect(modeBtn().style.display).toBe('none');
    // same wrapper node → no remount
    expect(first.querySelector('.ndp-trigger-wrap')).toBe(wrapBefore);
  });

  test('unmount destroys the picker and empties the host (no crash)', () => {
    const c = render(createElement(NepaliDateTimePicker, {}));
    const root = roots[roots.length - 1];
    expect(document.querySelector('.ndp-trigger-wrap')).toBeTruthy();
    act(() => root.unmount());
    roots.pop(); // already unmounted; keep afterEach from double-unmounting
    expect(document.querySelector('.ndp-trigger-wrap')).toBeNull();
    expect(c.children.length).toBe(0);
  });

  test('survives StrictMode double mount/unmount', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    // StrictMode intentionally mounts, unmounts, then remounts effects.
    act(() => root.render(createElement(StrictMode, null, createElement(NepaliDateTimePicker, {}))));
    // exactly one live picker after the churn
    expect(container.querySelectorAll('.ndp-trigger-wrap').length).toBe(1);
    act(() => root.unmount());
    container.remove();
    expect(document.querySelector('.ndp-trigger-wrap')).toBeNull();
  });
});

describe('NepaliDateRangePicker (React)', () => {
  test('mounts and fires onApply after picking a full range', () => {
    let applied: unknown = null;
    const c = render(createElement(NepaliDateRangePicker, {
      autoApply: true,
      onApply: (r: unknown) => { applied = r; },
    }));
    expect(c.querySelector('input')!.closest('.ndp-trigger-wrap')).toBeTruthy();
    const panel = open(c);
    const days = panel.querySelectorAll('.ndp-cell:not(.ndp-cell--empty)');
    act(() => {
      (days[3] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      (days[6] as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(applied).not.toBeNull();
  });

  test('unmounts cleanly', () => {
    const c = render(createElement(NepaliDateRangePicker, {}));
    const root = roots[roots.length - 1];
    act(() => root.unmount());
    roots.pop();
    expect(c.children.length).toBe(0);
  });
});

describe('NepaliMonthPicker (React)', () => {
  test('mounts and onChange yields a from→to range MonthResult', () => {
    let result: MonthResult | null = null;
    const c = render(createElement(NepaliMonthPicker, {
      onChange: (r: MonthResult) => { result = r; },
    }));
    const input = c.querySelector('input')!;
    act(() => input.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const monthCell = document.querySelector('.ndp-panel--month .ndp-monthcell') as HTMLElement;
    expect(monthCell).toBeTruthy();
    act(() => monthCell.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(result).not.toBeNull();
    const r = result as unknown as MonthResult;
    expect(r.start).toBeInstanceOf(Date);
    expect(r.end).toBeInstanceOf(Date);
    expect(typeof r.value).toBe('string');
  });

  test('unmounts cleanly', () => {
    const c = render(createElement(NepaliMonthPicker, {}));
    const root = roots[roots.length - 1];
    act(() => root.unmount());
    roots.pop();
    expect(c.children.length).toBe(0);
  });
});
