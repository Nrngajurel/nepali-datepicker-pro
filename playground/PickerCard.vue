<script setup lang="ts">
import { reactive, computed, ref, onMounted, onBeforeUnmount } from 'vue';
import type { Control, Framework, PickerDef } from './registry';
import { snippet } from './registry';

const props = defineProps<{ def: PickerDef; framework: Framework }>();

const values = reactive<Record<string, unknown>>(
  Object.fromEntries(props.def.controls.map((c) => [c.key, c.def])),
);

const options = computed(() => props.def.buildOptions(values));
// Remount the live picker whenever options change so structural options (e.g.
// toggling `withTime`) are always reflected, not just patched.
const optionsKey = computed(() => JSON.stringify(options.value));
const code = computed(() => snippet(props.def, options.value, props.framework));

const result = ref('');
const copied = ref(false);
const host = ref<HTMLElement | null>(null);

function onPicked(event: Event) {
  result.value = props.def.describe((event as CustomEvent).detail);
}
onMounted(() => host.value?.addEventListener(props.def.eventName, onPicked as EventListener));
onBeforeUnmount(() => host.value?.removeEventListener(props.def.eventName, onPicked as EventListener));

function enabled(c: Control): boolean {
  return !c.enabledWhen || c.enabledWhen(values);
}

async function copy() {
  await navigator.clipboard.writeText(code.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 1400);
}
</script>

<template>
  <section class="card" :id="def.id">
    <header>
      <h2>{{ def.title }}</h2>
      <p>{{ def.description }}</p>
    </header>
    <div class="card-body">
      <div class="preview" ref="host">
        <div class="field">
          <label>Live preview</label>
          <component :is="def.component" :options="options" :key="optionsKey" />
        </div>
        <div class="result">{{ result || '— pick a value to see the result —' }}</div>
      </div>
      <div class="options">
        <div class="opt-section-title">Options</div>
        <div v-for="c in def.controls" :key="c.key" class="opt" :class="{ 'is-disabled': !enabled(c) }">
          <label :for="def.id + '-' + c.key">
            {{ c.label }}
            <span v-if="c.hint" class="hint">{{ c.hint }}</span>
          </label>
          <input v-if="c.type === 'bool'" type="checkbox" :id="def.id + '-' + c.key" v-model="values[c.key]" />
          <select v-else-if="c.type === 'select'" :id="def.id + '-' + c.key" v-model="values[c.key]">
            <option v-for="o in c.choices" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <input v-else-if="c.type === 'number'" type="number" :id="def.id + '-' + c.key" v-model.number="values[c.key]" :min="c.min" :max="c.max" />
          <input v-else type="text" :id="def.id + '-' + c.key" v-model="values[c.key]" :placeholder="c.placeholder" />
        </div>
      </div>
    </div>
    <div class="snippet">
      <div class="snippet-body">
        <button class="copy-btn" :class="{ copied }" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</button>
        <pre>{{ code }}</pre>
      </div>
    </div>
  </section>
</template>
