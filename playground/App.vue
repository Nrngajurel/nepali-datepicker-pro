<script setup lang="ts">
import { ref } from 'vue';
import PickerCard from './PickerCard.vue';
import HelperFunctions from './HelperFunctions.vue';
import Events from './Events.vue';
import { DEFS, FRAMEWORKS, type Framework } from './registry';

const framework = ref<Framework>('vanilla');
const installCopied = ref(false);
async function copyInstall() {
  await navigator.clipboard.writeText('npm install advance-nepali-datepicker');
  installCopied.value = true;
  setTimeout(() => { installCopied.value = false; }, 1400);
}
</script>

<template>
  <section class="hero" id="top">
    <h1 class="hero-title">Advance Nepali <span>DatePicker</span></h1>
    <p class="hero-sub">
      A self-owned Bikram Sambat ↔ Gregorian calendar engine with date, time, range and month
      pickers — for vanilla JS, a <code>&lt;script&gt;</code> tag, jQuery, Vue and React.
    </p>
    <button class="install" type="button" @click="copyInstall">
      <span class="dollar">$</span>
      npm install advance-nepali-datepicker
      <span class="copyhint">{{ installCopied ? '✓ copied' : 'copy' }}</span>
    </button>
    <div class="hero-badges">
      <span>BS 1970–2100</span>
      <span>O(1) engine</span>
      <span>~11 KB gzip</span>
      <span>Verified vs. reference oracle</span>
    </div>
  </section>

  <section class="section-head" id="components">
    <h2>Components</h2>
    <p>Tweak options, preview live, and copy the snippet for your framework.</p>
  </section>

  <div class="fw-bar">
    <span class="fw-label">Framework</span>
    <div class="fw-tabs">
      <button
        v-for="f in FRAMEWORKS"
        :key="f.id"
        type="button"
        :aria-selected="framework === f.id"
        @click="framework = f.id"
      >{{ f.label }}</button>
    </div>
  </div>

  <div class="cards">
    <PickerCard v-for="def in DEFS" :key="def.id" :def="def" :framework="framework" />
  </div>

  <section class="section-head" id="helpers-head">
    <h2>Helpers &amp; events</h2>
    <p>Conversion utilities and the callback / instance API.</p>
  </section>
  <div class="cards">
    <HelperFunctions />
    <Events />
  </div>
</template>
