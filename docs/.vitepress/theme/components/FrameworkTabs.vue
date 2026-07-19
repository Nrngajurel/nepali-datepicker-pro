<script setup lang="ts">
import { FRAMEWORKS } from '../registry';
import { setFramework, useFramework } from '../useFramework';

const framework = useFramework();
</script>

<template>
  <div class="fw-bar">
    <span class="fw-label">Framework</span>
    <div class="fw-tabs" role="tablist" aria-label="Choose a framework for the code samples">
      <button v-for="f in FRAMEWORKS" :key="f.id" type="button" role="tab" :aria-selected="framework === f.id"
        @click="setFramework(f.id)">{{ f.label }}</button>
    </div>
  </div>
</template>

<style scoped>
.fw-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 16px;
}

.fw-label {
  font: 700 10.5px/1 var(--vp-font-family-mono);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-faint);
}

.fw-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}

.fw-tabs button {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font: 600 12.5px var(--vp-font-family-base);
  padding: 6px 11px;
  border-radius: 7px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.fw-tabs button:hover {
  color: var(--ink);
}

.fw-tabs button[aria-selected='true'] {
  background: var(--brand);
  color: #fff;
}
</style>
