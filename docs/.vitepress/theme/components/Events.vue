<script setup lang="ts">
import { ref } from 'vue';

const callbacks = [
  ['onChange', 'value committed / range partial changed', 'all'],
  ['onApply', 'range applied (start + end)', 'range'],
  ['onOpen / onClose', 'popup shown / hidden', 'all'],
  ['onChangeMonthYear', 'navigated to a new month/year', 'date-time'],
];

const domEvents = [
  ['select.nepaliDatePicker', 'date-time value committed', 'date-time'],
  ['apply.nepaliDateRangePicker', 'range applied', 'range'],
  ['select.nepaliMonthPicker', 'month selected (with AD range)', 'month'],
];

const methods = ['getValue()', 'setValue(v)', 'show()', 'hide()', 'update(patch)', 'onChange(cb) → unsubscribe', 'destroy()'];

const copied = ref(false);
const example = `const picker = mountDateTimePicker(input, {
  onChange: (v) => console.log(v.formatted, v.bs, v.ad),
  onClose: () => console.log('closed'),
});

// or subscribe to the returned instance:
const off = picker.onChange((v) => save(v.ad));

// or listen to the bubbling DOM event:
input.addEventListener('select.nepaliDatePicker', (e) => {
  console.log(e.detail.formatted);
});

picker.update({ minDate: 'today' });   // patch options live
picker.destroy();                       // SPA-safe teardown`;
async function copy() {
  await navigator.clipboard.writeText(example);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 1400);
}
</script>

<template>
  <section class="card">
    <div class="card-body">
      <div class="preview">
        <div class="opt-section-title">Callbacks (options)</div>
        <table class="ev-table">
          <tr v-for="[name, when, scope] in callbacks" :key="name">
            <td><code>{{ name }}</code></td>
            <td>{{ when }}</td>
            <td><span class="scope">{{ scope }}</span></td>
          </tr>
        </table>
        <div class="opt-section-title" style="margin-top: 16px;">DOM events (bubble)</div>
        <table class="ev-table">
          <tr v-for="[name, when, scope] in domEvents" :key="name">
            <td><code>{{ name }}</code></td>
            <td>{{ when }}</td>
            <td><span class="scope">{{ scope }}</span></td>
          </tr>
        </table>
      </div>
      <div class="options">
        <div class="opt-section-title">Instance methods</div>
        <div class="ref-list">
          <div v-for="m in methods" :key="m" class="ref-row"><code>{{ m }}</code></div>
        </div>
      </div>
    </div>
    <div class="snippet">
      <div class="snippet-body">
        <button class="copy-btn" :class="{ copied }" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</button>
        <pre>{{ example }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ev-table { width: 100%; border-collapse: collapse; }
.ev-table td { padding: 6px 8px 6px 0; border-top: 1px solid var(--line); font-size: 12.5px; vertical-align: top; color: var(--ink-soft); }
.ev-table tr:first-child td { border-top: 0; }
.ev-table code { color: var(--brand-ink); }
.scope { font: 600 10px var(--mono); text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-faint); }
.ref-list { display: grid; gap: 2px; }
.ref-row { padding: 6px 0; border-top: 1px solid var(--line); font-size: 12.5px; }
.ref-row:first-child { border-top: 0; }
.ref-row code { color: var(--brand-ink); }
</style>
