// Turns a single <input> into a native-`<input type="date">`-style segmented
// editor: fixed separators, focus selects a whole section (year/month/day and,
// with time, hour/minute plus AM/PM in 12-hour mode), Arrow Up/Down step the
// focused section, digits fill it with auto-advance, Left/Right move between
// sections and Backspace clears. It never behaves like a free-text field.
import { normalizeDigits } from '../format/parse.js';

type SegmentType = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'meridiem';

interface Segment {
  type: SegmentType;
  kind: 'num' | 'meridiem';
  len: number;
  placeholder: string;
  min: number;
  max: number;
  value: number | null;
  buffer: string; // digits typed so far for the in-progress section
}

export interface SegmentedFieldConfig {
  withTime: () => boolean;
  hour12: () => boolean;
  yearBounds: () => { min: number; max: number };
  /** ASCII `YYYY-MM-DD[ HH:mm]` (24-hour) of the committed selection, or ''. */
  committed: () => string;
  /** ASCII of the selection or today — seeds a section on first arrow step. */
  reference: () => string;
  /** Locale display string shown when the field is not being edited. */
  formatted: () => string;
  validate: (ascii: string) => 'valid' | 'invalid' | 'empty';
  /** Final commit (emits / clears) on Enter or blur. */
  commit: (ascii: string) => 'valid' | 'invalid' | 'empty';
  open: () => void;
  close: () => void;
}

export interface SegmentedField {
  isEditing: () => boolean;
  destroy: () => void;
}

const REF_RE = /^(\d+)-(\d+)-(\d+)(?:[ ](\d+):(\d+))?$/;
const to12 = (h: number): number => h % 12 || 12;

export function attachSegmentedField(input: HTMLInputElement, cfg: SegmentedFieldConfig): SegmentedField {
  let segments: Segment[] = [];
  let layout: Array<Segment | string> = [];
  let active = 0;
  let editing = false;
  let dirty = false; // whether the user changed anything this editing session
  let hour12 = false; // whether the current build uses a 12-hour clock

  function build(): void {
    const yb = cfg.yearBounds();
    const withTime = cfg.withTime();
    hour12 = withTime && cfg.hour12();
    const year: Segment = { type: 'year', kind: 'num', len: 4, placeholder: 'YYYY', min: yb.min, max: yb.max, value: null, buffer: '' };
    const month: Segment = { type: 'month', kind: 'num', len: 2, placeholder: 'MM', min: 1, max: 12, value: null, buffer: '' };
    const day: Segment = { type: 'day', kind: 'num', len: 2, placeholder: 'DD', min: 1, max: 31, value: null, buffer: '' };
    segments = [year, month, day];
    layout = [year, '-', month, '-', day];
    if (withTime) {
      const hour: Segment = { type: 'hour', kind: 'num', len: 2, placeholder: hour12 ? 'hh' : 'HH', min: hour12 ? 1 : 0, max: hour12 ? 12 : 23, value: null, buffer: '' };
      const minute: Segment = { type: 'minute', kind: 'num', len: 2, placeholder: 'mm', min: 0, max: 59, value: null, buffer: '' };
      segments.push(hour, minute);
      layout.push(' ', hour, ':', minute);
      if (hour12) {
        const meridiem: Segment = { type: 'meridiem', kind: 'meridiem', len: 2, placeholder: '--', min: 0, max: 1, value: null, buffer: '' };
        segments.push(meridiem);
        layout.push(' ', meridiem);
      }
    }
  }

  function display(seg: Segment): string {
    if (seg.value == null) return seg.placeholder;
    if (seg.kind === 'meridiem') return seg.value === 1 ? 'PM' : 'AM';
    return String(seg.value).padStart(seg.len, '0');
  }

  function render(): string {
    return layout.map((p) => (typeof p === 'string' ? p : display(p))).join('');
  }

  // Character range of a section — widths are fixed (placeholder length === len).
  function rangeOf(index: number): [number, number] {
    let pos = 0;
    for (const p of layout) {
      if (typeof p === 'string') { pos += p.length; continue; }
      if (segments.indexOf(p) === index) return [pos, pos + p.len];
      pos += p.len;
    }
    return [0, 0];
  }

  function segmentAtPos(pos: number): number {
    let offset = 0;
    for (const p of layout) {
      if (typeof p === 'string') { offset += p.length; continue; }
      if (pos <= offset + p.len) return segments.indexOf(p);
      offset += p.len;
    }
    return segments.length - 1;
  }

  function paint(): void {
    input.value = render();
    const [a, b] = rangeOf(active);
    input.setSelectionRange(a, b);
    input.setAttribute('aria-valuetext', input.value);
  }

  const byType = (t: SegmentType): Segment | undefined => segments.find((s) => s.type === t);

  // Assemble the full 24-hour ASCII string, or null when a section is empty.
  function assemble(): string | null {
    if (segments.some((s) => s.value == null)) return null;
    const v = (t: SegmentType) => byType(t)!.value!;
    const date = `${String(v('year')).padStart(4, '0')}-${String(v('month')).padStart(2, '0')}-${String(v('day')).padStart(2, '0')}`;
    if (!byType('hour')) return date;
    let hour = v('hour');
    if (byType('meridiem')) hour = (v('hour') % 12) + (v('meridiem') === 1 ? 12 : 0);
    return `${date} ${String(hour).padStart(2, '0')}:${String(v('minute')).padStart(2, '0')}`;
  }

  // Flag the field valid/invalid after each edit (no calendar mutation — like a
  // native date input, the picker only updates on commit).
  function sync(): void {
    const ascii = assemble();
    if (!ascii) {
      input.classList.remove('ndp-input-invalid');
      input.removeAttribute('aria-invalid');
      return;
    }
    const status = cfg.validate(ascii);
    input.classList.toggle('ndp-input-invalid', status === 'invalid');
    input.setAttribute('aria-invalid', status === 'invalid' ? 'true' : 'false');
  }

  function selectSegment(index: number): void {
    active = Math.max(0, Math.min(segments.length - 1, index));
    paint();
  }

  // Map a parsed 24-hour section value onto a segment (converting for 12h).
  function valueFor(seg: Segment, parts: { year: number; month: number; day: number; hour: number | null; minute: number | null }): number | null {
    switch (seg.type) {
      case 'year': return parts.year;
      case 'month': return parts.month;
      case 'day': return parts.day;
      case 'hour': return parts.hour == null ? null : (hour12 ? to12(parts.hour) : parts.hour);
      case 'minute': return parts.minute;
      case 'meridiem': return parts.hour == null ? null : (parts.hour >= 12 ? 1 : 0);
      default: return null;
    }
  }

  function parseAscii(ascii: string): { year: number; month: number; day: number; hour: number | null; minute: number | null } | null {
    const m = REF_RE.exec(ascii);
    if (!m) return null;
    return { year: +m[1], month: +m[2], day: +m[3], hour: m[4] != null ? +m[4] : null, minute: m[5] != null ? +m[5] : null };
  }

  function seedFromReference(seg: Segment): void {
    const parts = parseAscii(cfg.reference());
    const v = parts ? valueFor(seg, parts) : null;
    seg.value = v == null ? seg.min : Math.max(seg.min, Math.min(seg.max, v));
  }

  function step(delta: number): void {
    const seg = segments[active];
    seg.buffer = '';
    dirty = true;
    if (seg.value == null) {
      seedFromReference(seg); // first press lands on today's part
    } else {
      const range = seg.max - seg.min + 1;
      seg.value = ((seg.value - seg.min + delta) % range + range) % range + seg.min;
    }
    paint();
    sync();
  }

  function finalize(seg: Segment): void {
    if (!seg.buffer) return;
    seg.value = Math.max(seg.min, Math.min(seg.max, parseInt(seg.buffer, 10)));
    seg.buffer = '';
  }

  function typeDigit(digit: string): void {
    const seg = segments[active];
    if (seg.kind === 'meridiem') return; // AM/PM is set with a/p, not digits
    dirty = true;
    seg.buffer += digit;
    const n = parseInt(seg.buffer, 10);
    if (seg.type === 'year') {
      seg.value = n;
      if (seg.buffer.length >= 4) { finalize(seg); advance(); }
    } else if (seg.buffer.length >= 2 || n * 10 > seg.max) {
      finalize(seg);
      advance();
    } else {
      seg.value = n;
    }
    paint();
    sync();
  }

  function setMeridiem(pm: boolean): void {
    const seg = segments[active];
    dirty = true;
    seg.value = pm ? 1 : 0;
    paint();
    sync();
  }

  function advance(): void {
    if (active < segments.length - 1) active += 1;
  }

  function backspace(): void {
    const seg = segments[active];
    dirty = true;
    if (seg.value != null || seg.buffer) {
      seg.value = null;
      seg.buffer = '';
    } else if (active > 0) {
      active -= 1;
      segments[active].value = null;
      segments[active].buffer = '';
    }
    paint();
    sync();
  }

  function beginEditing(atPos?: number): void {
    build();
    const parts = parseAscii(cfg.committed());
    if (parts) segments.forEach((s) => { s.value = valueFor(s, parts); s.buffer = ''; });
    editing = true;
    dirty = false;
    active = atPos == null ? 0 : segmentAtPos(atPos);
    paint();
  }

  function finishEditing(): void {
    editing = false;
    input.classList.remove('ndp-input-invalid');
    input.removeAttribute('aria-invalid');
    // Untouched session — just restore the canonical display, don't re-commit.
    if (!dirty) { input.value = cfg.formatted(); return; }
    segments.forEach(finalize);
    const filled = segments.filter((s) => s.value != null).length;
    if (filled === segments.length) {
      const ascii = assemble()!;
      if (cfg.commit(ascii) === 'invalid') input.value = cfg.formatted();
    } else if (filled === 0) {
      cfg.commit('');
    } else {
      input.value = cfg.formatted(); // discard a partial entry
    }
  }

  function onKeydown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.altKey || e.ctrlKey || e.metaKey) return; // leave shortcuts alone
    if (!editing) { if (e.key !== 'Tab') beginEditing(); }
    const key = e.key;
    const seg = segments[active];
    if (seg && seg.kind === 'meridiem' && /^[apAP]$/.test(key)) {
      e.preventDefault();
      setMeridiem(/p/i.test(key));
    } else if (/^[0-9]$/.test(key) || /^[०-९]$/.test(key)) {
      e.preventDefault();
      typeDigit(normalizeDigits(key));
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      step(1);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      step(-1);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      selectSegment(active - 1);
    } else if (key === 'ArrowRight' || key === '-' || key === '/' || key === ':' || key === ' ') {
      e.preventDefault();
      selectSegment(active + 1);
    } else if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      backspace();
    } else if (key === 'Enter') {
      e.preventDefault();
      finishEditing();
      cfg.close();
    } else if (key === 'Escape') {
      e.preventDefault();
      editing = false;
      input.value = cfg.formatted();
      input.classList.remove('ndp-input-invalid');
      input.removeAttribute('aria-invalid');
      cfg.close();
    } else if (key !== 'Tab') {
      e.preventDefault(); // block any other free-text insertion
    }
  }

  function onFocus(): void {
    if (!editing) beginEditing();
    cfg.open();
  }

  function onMouseup(): void {
    // Re-select the whole section the caret landed in.
    if (editing) selectSegment(segmentAtPos(input.selectionStart ?? 0));
  }

  function onBlur(): void {
    if (editing) finishEditing();
  }

  function onBeforeinput(e: Event): void {
    e.preventDefault(); // route all input through keydown
  }

  function placeholderText(): string {
    if (!cfg.withTime()) return 'YYYY-MM-DD';
    return cfg.hour12() ? 'YYYY-MM-DD hh:mm --' : 'YYYY-MM-DD HH:mm';
  }

  input.classList.add('ndp-trigger--segmented');
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('autocomplete', 'off');
  if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', placeholderText());
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('focus', onFocus);
  input.addEventListener('mouseup', onMouseup);
  input.addEventListener('blur', onBlur);
  input.addEventListener('beforeinput', onBeforeinput);

  return {
    isEditing: () => editing,
    destroy() {
      input.classList.remove('ndp-trigger--segmented');
      input.removeEventListener('keydown', onKeydown);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('mouseup', onMouseup);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('beforeinput', onBeforeinput);
    },
  };
}
