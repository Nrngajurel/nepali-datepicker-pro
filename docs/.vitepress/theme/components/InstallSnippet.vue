<script setup lang="ts">
import { computed } from 'vue';
import { useFramework } from '../useFramework';
import CodeSnippet from './CodeSnippet.vue';
import FrameworkTabs from './FrameworkTabs.vue';

const framework = useFramework();

// The CDN bundle is the whole install story for the no-build stacks; everything
// else goes through npm.
const code = computed(() => {
  if (framework.value === 'html' || framework.value === 'jquery') {
    return [
      '<!-- No build step — drop in the CDN bundle -->',
      '<link rel="stylesheet" href="https://unpkg.com/nepali-datepicker-pro/dist/style.css">',
      '<script src="https://unpkg.com/nepali-datepicker-pro/dist/nepali-datepicker-pro.umd.cjs"><\/script>',
    ].join('\n');
  }
  return 'npm install nepali-datepicker-pro';
});
</script>

<template>
  <FrameworkTabs />
  <CodeSnippet :code="code" />
</template>
