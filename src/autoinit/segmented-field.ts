// Turns a single <input> into a native-`<input type="date">`-style segmented
// editor: fixed separators, focus selects a whole section, Arrow Up/Down step
// the focused section, digits fill it with auto-advance, Left/Right move
// between sections and Backspace clears. It never behaves like a free-text
// field. The set of sections is described by a schema, so the same widget
// backs the date, datetime (incl. AM/PM), month and range pickers.
import { normalizeDigits } from '../format/parse.js';
import { isSheetViewport } from '../render/viewport.js';

export interface SegmentSpec {
  key: string;
  len: number;
  min: number;
  max: number;
  placeholder: string;
  kind?: 'num' | 'meridiem';
}

export type SegmentValues = Record<string, number | null>;

export interface SegmentedFieldConfig {
  /** Ordered sections + separator strings; re-read on every focus so mode /
   *  withTime changes rebuild the field. */
  schema: () => Array<SegmentSpec | string>;
  /** Parse the controller's ASCII value into per-key section values. */
  seed: (ascii: string) => SegmentValues;
  /** Build the controller's ASCII value from a complete set of section values. */
  toAscii: (values: SegmentValues) => string;
  /** Placeholder shown when the field is empty and unfocused. */
  placeholder: () => string;
  /** Locale display string shown when the field is not being edited. */
  formatted: () => string;
  /** ASCII of the committed value, or '' if none — seeds sections on focus. */
  committed: () => string;
  /** ASCII of the value or today — seeds a section on first arrow step. */
  reference: () => string;
  validate: (ascii: string) => 'valid' | 'invalid' | 'empty';
  commit: (ascii: string) => 'valid' | 'invalid' | 'empty';
  open: () => void;
  close: () => void;
  /** Pasted text: parse and commit it; return whether it was accepted. */
  paste?: (text: string) => boolean | Promise<boolean>;
  /** A commit was refused on leaving the field: the canonical ASCII that
   *  failed validation, or null for a partly filled field. */
  onReject?: (ascii: string | null) => void;
  /** Keep refused text in the field (marked invalid) instead of reverting. */
  keepInvalid?: () => boolean;
  /** Typing changed the field (valid or not) — e.g. to clear a stale message. */
  onEdit?: () => void;
}

export interface SegmentedField {
  isEditing: () => boolean;
  /** The field shows refused text kept by `keepInvalid` — don't overwrite it. */
  isHoldingInvalid: () => boolean;
  /** Re-seed an in-progress edit from the committed value (e.g. after a clear). */
  reset: () => void;
  destroy: () => void;
}

interface Segment extends SegmentSpec {
  value: number | null;
  buffer: string;
}

export function attachSegmentedField(input: HTMLInputElement, cfg: SegmentedFieldConfig): SegmentedField {
  let segments: Segment[] = [];
  let layout: Array<Segment | string> = [];
  let active = 0;
  let editing = false;
  let dirty = false; // whether the user changed anything this editing session
  let holding = false; // refused text left in the field (keepInvalid)

  function build(): void {
    segments = [];
    layout = cfg.schema().map((part) => {
      if (typeof part === 'string') return part;
      const seg: Segment = { ...part, kind: part.kind ?? 'num', value: null, buffer: '' };
      segments.push(seg);
      return seg;
    });
  }

  function display(seg: Segment): string {
    // A year being typed shows the digits so far plus what's left ("208Y"),
    // not a zero-padded number that looks finished ("0208").
    if (seg.buffer && seg.len >= 4 && seg.buffer.length < seg.len) return seg.buffer + seg.placeholder.slice(seg.buffer.length);
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
    // Nothing typed yet: the mask reads as a hint (faint), with only the
    // active section highlighted — not as if a date were filled in.
    input.classList.toggle('is-mask', segments.every((seg) => seg.value == null));
    const [a, b] = rangeOf(active);
    input.setSelectionRange(a, b);
    input.setAttribute('aria-valuetext', input.value);
  }

  // Full ASCII string, or null when a section is still empty.
  function assemble(): string | null {
    if (segments.some((s) => s.value == null)) return null;
    const values: SegmentValues = {};
    segments.forEach((s) => { values[s.key] = s.value; });
    return cfg.toAscii(values);
  }

  // Flag the field valid/invalid after each edit (no calendar mutation — like a
  // native date input, the picker only updates on commit).
  function sync(): void {
    cfg.onEdit?.();
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

  function seedFromReference(seg: Segment): void {
    const v = cfg.seed(cfg.reference())[seg.key];
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
    const n = parseInt(seg.buffer, 10);
    // Two-digit sections clamp (typing 9 into a month means 09). A year is
    // kept as typed: clamping a half-typed "205" up to the first supported
    // year would silently save a date nobody entered — out of range, it fails
    // validation and the field reverts instead.
    seg.value = seg.len >= 4 ? n : Math.max(seg.min, Math.min(seg.max, n));
    seg.buffer = '';
  }

  function typeDigit(digit: string): void {
    const seg = segments[active];
    if (seg.kind === 'meridiem') return; // AM/PM is set with a/p, not digits
    dirty = true;
    seg.buffer += digit;
    const n = parseInt(seg.buffer, 10);
    if (seg.len >= 4) {
      seg.value = n;
      if (seg.buffer.length >= seg.len) { finalize(seg); advance(); }
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
    dirty = true;
    segments[active].value = pm ? 1 : 0;
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
    holding = false;
    build();
    const map = cfg.seed(cfg.committed());
    segments.forEach((s) => { s.value = map[s.key] ?? null; s.buffer = ''; });
    editing = true;
    dirty = false;
    active = atPos == null ? 0 : segmentAtPos(atPos);
    paint();
  }

  // A refused value: revert to the last good one, or (keepInvalid) leave the
  // text in place, marked invalid, so it can be corrected.
  function refuse(ascii: string | null): void {
    cfg.onReject?.(ascii);
    if (cfg.keepInvalid?.()) {
      holding = true;
      input.value = render();
      input.classList.add('ndp-input-invalid');
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    input.value = cfg.formatted();
  }

  // Back into a field holding refused text: carry on editing that text.
  function startEditing(atPos?: number): void {
    if (holding && segments.length) {
      holding = false;
      editing = true;
      dirty = true;
      active = atPos == null ? 0 : segmentAtPos(atPos);
      paint();
      sync();
      return;
    }
    beginEditing(atPos);
  }

  function finishEditing(): void {
    editing = false;
    input.classList.remove('is-mask');
    input.classList.remove('ndp-input-invalid');
    input.removeAttribute('aria-invalid');
    // Untouched session — just restore the canonical display, don't re-commit.
    if (!dirty) { input.value = cfg.formatted(); return; }
    segments.forEach(finalize);
    const filled = segments.filter((s) => s.value != null).length;
    if (filled === segments.length) {
      const ascii = assemble()!;
      if (cfg.commit(ascii) === 'invalid') refuse(ascii);
    } else if (filled === 0) {
      cfg.commit('');
    } else {
      refuse(null); // a partial entry
    }
  }

  function onKeydown(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.altKey || e.ctrlKey || e.metaKey) return; // leave shortcuts alone
    if (!editing) { if (e.key !== 'Tab') startEditing(); }
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
    } else if (key === 'ArrowRight' || key === '-' || key === '/' || key === '.' || key === ':' || key === ' ') {
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
      holding = false;
      input.classList.remove('is-mask');
      input.value = cfg.formatted();
      input.classList.remove('ndp-input-invalid');
      input.removeAttribute('aria-invalid');
      cfg.close();
    } else if (key !== 'Tab') {
      e.preventDefault(); // block any other free-text insertion
    }
  }

  function onFocus(): void {
    if (!editing) startEditing();
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

  // Paste a whole date ("2081-04-15", "15/04/2081", "Jun 29 2025", Devanagari
  // digits…): the mount parses it, and on success the field shows the result.
  function onPaste(event: Event): void {
    const e = event as ClipboardEvent;
    const text = e.clipboardData?.getData('text') ?? '';
    e.preventDefault();
    if (!text.trim() || !cfg.paste) return;
    const finish = (ok: boolean): void => {
      if (ok) {
        dirty = false;
        if (document.activeElement === input) beginEditing();
        else { editing = false; input.value = cfg.formatted(); }
      } else {
        cfg.onReject?.(null);
      }
    };
    // The parser may still be loading (it's split off); then this settles later.
    const result = cfg.paste(text);
    if (typeof result === 'boolean') finish(result);
    else result.then(finish, () => finish(false));
  }

  input.classList.add('ndp-trigger--segmented');
  // On phone widths the bottom sheet is the way to pick (calendar + time
  // wheels); an on-screen keyboard would pop up over it, so ask for none
  // there. Wider screens get the numeric keypad for typing.
  const syncInputMode = (): void => input.setAttribute('inputmode', isSheetViewport() ? 'none' : 'numeric');
  syncInputMode();
  window.addEventListener('resize', syncInputMode);
  input.setAttribute('autocomplete', 'off');
  // The mask (YYYY, hh, …) isn't a word: no spell-check squiggle under it.
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('autocapitalize', 'off');
  if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', cfg.placeholder());
  input.addEventListener('keydown', onKeydown);
  input.addEventListener('focus', onFocus);
  input.addEventListener('mouseup', onMouseup);
  input.addEventListener('blur', onBlur);
  input.addEventListener('beforeinput', onBeforeinput);
  input.addEventListener('paste', onPaste);

  return {
    isEditing: () => editing,
    isHoldingInvalid: () => holding,
    reset() {
      holding = false;
      if (editing) beginEditing();
    },
    destroy() {
      input.classList.remove('ndp-trigger--segmented');
      input.removeEventListener('keydown', onKeydown);
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('mouseup', onMouseup);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('beforeinput', onBeforeinput);
      input.removeEventListener('paste', onPaste);
      window.removeEventListener('resize', syncInputMode);
    },
  };
}
