<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ code: string }>();

const copied = ref(false);
async function copy(text: string) {
  await navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 1400);
}
</script>

<template>
  <div class="code-block">
    <button class="copy-btn" :class="{ copied }" type="button" @click="copy(code)">
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
    <pre>{{ code }}</pre>
  </div>
</template>

<style scoped>
.code-block {
  position: relative;
  margin: 14px 0;
}

.code-block pre {
  margin: 0;
  overflow-x: auto;
  background: var(--code-bg);
  color: var(--code-ink);
  padding: 16px 18px;
  border-radius: 12px;
  font: 500 12.5px/1.65 var(--vp-font-family-mono);
}
</style>
