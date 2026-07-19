<script setup lang="ts">
import { computed } from 'vue';
import { DEFS, snippet } from '../registry';
import { useFramework } from '../useFramework';
import CodeSnippet from './CodeSnippet.vue';
import FrameworkTabs from './FrameworkTabs.vue';

const framework = useFramework();

// Reuses the same generator the live demo cards use, so the "basic usage"
// sample can never drift from what the playground emits.
const code = computed(() => snippet(DEFS[0], { withTime: true }, framework.value));
</script>

<template>
  <FrameworkTabs />
  <CodeSnippet :code="code" />
</template>
