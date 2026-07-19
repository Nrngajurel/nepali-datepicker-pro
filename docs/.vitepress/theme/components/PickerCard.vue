<script setup lang="ts">
import { reactive, computed, ref, onMounted, onBeforeUnmount } from 'vue';
import type { Control, Framework, PickerDef } from './registry';
import { snippet } from './registry';

const props = defineProps<{ def: PickerDef; framework: Framework }>();

const values = reactive<Record<string, unknown>>(
  Object.fromEntries(props.def.controls.map((c) => [c.key, c.def])),
);

// Minimal options — only the non-default keys. Used for the copy-paste snippet.
const options = computed(() => props.def.buildOptions(values));
// Live options for the mounted picker. We start from a reset template (every
// possible key set to undefined) so that un-checking an option actually clears
// it via `update()` — the picker patches in place and never remounts, so the
// popup no longer disappears when you tweak an option.
const liveOptions = computed(() => {
  const reset = Object.fromEntries(props.def.optionKeys.map((k) => [k, undefined]));
  return { ...reset, ...options.value };
});
const code = computed(() => snippet(props.def, options.value, props.framework));
const useCaseCode = computed(() => snippet(props.def, props.def.useCase.options, props.framework));

const result = ref('');
const copied = ref(false);
const useCaseCopied = ref(false);
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

async function copyUseCase() {
  await navigator.clipboard.writeText(useCaseCode.value);
  useCaseCopied.value = true;
  setTimeout(() => { useCaseCopied.value = false; }, 1400);
}
</script>

<template>
  <section class="card">
    <header>
      <h2>{{ def.title }}</h2>
      <p>{{ def.description }}</p>
    </header>
    <div class="card-body">
      <div class="preview" ref="host">
        <div class="field">
          <label>Live preview</label>
          <component :is="def.component" :options="liveOptions" />
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

    <div class="reference">
      <details open>
        <summary>All options</summary>
        <table class="ref-table">
          <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr v-for="o in def.optionDocs" :key="o.name">
              <td><code>{{ o.name }}</code></td>
              <td><code class="ty">{{ o.type }}</code></td>
              <td class="def">{{ o.def }}</td>
              <td>{{ o.desc }}</td>
            </tr>
          </tbody>
        </table>
      </details>
      <details>
        <summary>Events &amp; callbacks</summary>
        <table class="ref-table">
          <thead><tr><th>Name</th><th>Payload</th><th>Fires when</th></tr></thead>
          <tbody>
            <tr v-for="e in def.events" :key="e.name">
              <td><code>{{ e.name }}</code></td>
              <td><code class="ty">{{ e.payload }}</code></td>
              <td>{{ e.desc }}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>

    <div class="snippet">
      <div class="snippet-body">
        <button class="copy-btn" :class="{ copied }" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</button>
        <pre>{{ code }}</pre>
      </div>
    </div>

    <div class="use-case">
      <div class="opt-section-title">Real-world example — {{ def.useCase.title }}</div>
      <p class="use-case-desc">{{ def.useCase.description }}</p>
      <div class="snippet">
        <div class="snippet-body">
          <button class="copy-btn" :class="{ copied: useCaseCopied }" @click="copyUseCase">{{ useCaseCopied ? 'Copied!' : 'Copy' }}</button>
          <pre>{{ useCaseCode }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.use-case { border-top: 1px solid var(--line); padding: 16px 20px 0; }
.use-case .opt-section-title {
  font: 600 12px var(--mono); letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--ink-faint); margin: 0 0 6px;
}
.use-case-desc { margin: 0 0 10px; font-size: 13px; color: var(--ink-soft); }
.use-case .snippet { border-top: 0; }
.reference { border-top: 1px solid var(--line); }
.reference details { border-bottom: 1px solid var(--line); }
.reference summary {
  cursor: pointer; padding: 12px 20px; font: 600 12px var(--mono);
  letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-faint);
  user-select: none;
}
.reference summary:hover { color: var(--brand-ink); }
.ref-table { width: 100%; border-collapse: collapse; margin: 0 0 12px; font-size: 12.5px; }
.ref-table th {
  text-align: left; padding: 4px 12px; font: 600 10px var(--mono);
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-faint);
}
.ref-table td { padding: 7px 12px; border-top: 1px solid var(--line); vertical-align: top; color: var(--ink-soft); }
.ref-table code { color: var(--brand-ink); font-size: 12px; }
.ref-table code.ty { color: var(--ink-faint); }
.ref-table td.def { font: 12px var(--mono); color: var(--ink-faint); white-space: nowrap; }
.ref-table td:last-child { min-width: 180px; }
</style>
