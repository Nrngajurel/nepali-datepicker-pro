<script setup lang="ts">
import { computed } from 'vue';
import { DEFS } from '../registry';
import { useFramework } from '../useFramework';
import FrameworkTabs from './FrameworkTabs.vue';
import PickerCard from './PickerCard.vue';

// Markdown pages address a picker by id (`<PickerDemo id="datetime" />`) so the
// prose and the live demo stay in the same file.
const props = defineProps<{ id: string }>();

const framework = useFramework();
const def = computed(() => {
  const found = DEFS.find((d) => d.id === props.id);
  if (!found) throw new Error(`Unknown picker id "${props.id}" — expected one of ${DEFS.map((d) => d.id).join(', ')}`);
  return found;
});
</script>

<template>
  <FrameworkTabs />
  <PickerCard :def="def" :framework="framework" />
</template>
