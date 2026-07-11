<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { nepaliFunctions as NF } from '../src/index.js';

// AD → BS
const ad = ref(new Date().toISOString().slice(0, 10));
const adToBs = computed(() => {
  const d = new Date(ad.value);
  if (Number.isNaN(d.getTime())) return null;
  try { return NF.AD2BS(new Date(d.getFullYear(), d.getMonth(), d.getDate())); } catch { return null; }
});

// BS → AD
const bs = reactive({ year: NF.BS.GetCurrentYear(), month: NF.BS.GetCurrentMonth(), day: NF.BS.GetCurrentDay() });
const bsToAd = computed(() => {
  try {
    if (!NF.BS.ValidateDate(bs.year, bs.month, bs.day)) return null;
    const d = NF.BS2AD(bs.year, bs.month, bs.day);
    return d.toISOString().slice(0, 10);
  } catch { return null; }
});
const daysInBsMonth = computed(() => {
  try { return NF.BS.GetDaysInMonth(bs.year, bs.month); } catch { return '—'; }
});

const reference = [
  ['AD2BS(date)', 'AD Date → { year, month, day } BS'],
  ['BS2AD(y, m, d)', 'BS parts → AD Date'],
  ['ConvertToUnicode(n)', 'Digits → Devanagari (२०८१)'],
  ['ConvertToNumber(s)', 'Devanagari digits → ASCII'],
  ['BS.GetCurrentDate()', "Today's BS date"],
  ['BS.GetDaysInMonth(y, m)', 'Days in a BS month'],
  ['BS.GetMonthsInUnicode()', 'Nepali month names'],
  ['BS.ValidateDate(y, m, d)', 'Is this a real BS date?'],
  ['BS.IsBetweenDates(d, a, b)', 'Range comparison'],
  ['AD.GetDaysInMonth(y, m)', 'Days in an AD month'],
  ['AD.DatesDiff(a, b)', 'Whole days between AD dates'],
  ['AD.AddDays(d, n)', 'Shift an AD date by n days'],
];

const copied = ref(false);
const importSnippet = `import { nepaliFunctions as NF } from 'advance-nepali-datepicker';

NF.AD2BS(new Date());              // → { year, month, day }
NF.BS2AD(2081, 4, 1);              // → Date (AD)
NF.BS.GetDaysInMonth(2081, 4);     // → 32
NF.ConvertToUnicode(2081);         // → '२०८१'`;
async function copy() {
  await navigator.clipboard.writeText(importSnippet);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 1400);
}
</script>

<template>
  <section class="card" id="helpers">
    <header>
      <h2>Helper functions</h2>
      <p>A tree-shakeable, <code>NepaliFunctions</code>-compatible toolkit for BS↔AD math — no picker required.</p>
    </header>
    <div class="card-body">
      <div class="preview">
        <div class="conv">
          <label>AD → BS</label>
          <input type="date" v-model="ad" />
          <div class="conv-out">
            <template v-if="adToBs">
              {{ adToBs.year }}-{{ String(adToBs.month).padStart(2, '0') }}-{{ String(adToBs.day).padStart(2, '0') }} BS
              <span class="uni">({{ NF.ConvertToUnicode(adToBs.year) }})</span>
            </template>
            <template v-else>invalid date</template>
          </div>
        </div>
        <div class="conv">
          <label>BS → AD</label>
          <div class="bs-inputs">
            <input type="number" v-model.number="bs.year" min="1970" max="2100" aria-label="BS year" />
            <input type="number" v-model.number="bs.month" min="1" max="12" aria-label="BS month" />
            <input type="number" v-model.number="bs.day" :min="1" :max="daysInBsMonth === '—' ? 32 : daysInBsMonth" aria-label="BS day" />
          </div>
          <div class="conv-out">
            <template v-if="bsToAd">{{ bsToAd }} AD <span class="uni">· {{ daysInBsMonth }} days in month</span></template>
            <template v-else>invalid BS date</template>
          </div>
        </div>
      </div>
      <div class="options">
        <div class="opt-section-title">Reference</div>
        <div class="ref-list">
          <div v-for="[sig, desc] in reference" :key="sig" class="ref-row">
            <code>{{ sig }}</code>
            <span>{{ desc }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="snippet">
      <div class="snippet-body">
        <button class="copy-btn" :class="{ copied }" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</button>
        <pre>{{ importSnippet }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.conv { display: grid; gap: 8px; margin-bottom: 18px; }
.conv > label { font-weight: 700; font-size: 13px; }
.conv input { font: inherit; font-size: 14px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
.bs-inputs { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 6px; }
.conv-out { font: 600 14px var(--mono); color: var(--brand-ink); }
.conv-out .uni { color: var(--ink-faint); font-weight: 400; }
.ref-list { display: grid; gap: 2px; }
.ref-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid var(--line); font-size: 12.5px; }
.ref-row:first-child { border-top: 0; }
.ref-row code { color: var(--brand-ink); white-space: nowrap; }
.ref-row span { color: var(--ink-soft); text-align: right; }
</style>
