import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { mountDateRangePicker, mountDateTimePicker, mountMonthPicker } from './index.js';
import type { DateRangePickerOptions, DateTimePickerOptions, MonthPickerOptions, PickerInstance } from './index.js';

export const NepaliDateRangePicker = defineComponent({
  name: 'NepaliDateRangePicker',
  props: ['options'],
  setup(props: { options?: DateRangePickerOptions }) {
    const input = ref<HTMLInputElement | null>(null);
    let instance: PickerInstance<unknown, DateRangePickerOptions> | null = null;
    onMounted(() => {
      if (input.value) instance = mountDateRangePicker(input.value, props.options ?? {});
    });
    watch(() => props.options, (next) => instance?.update(next ?? {}), { deep: true });
    onBeforeUnmount(() => instance?.destroy());
    // Read-only state is owned by the mount (typeable pickers unlock it).
    return () => h('input', { ref: input });
  },
});

export const NepaliDateTimePicker = defineComponent({
  name: 'NepaliDateTimePicker',
  props: ['options'],
  setup(props: { options?: DateTimePickerOptions }) {
    const input = ref<HTMLInputElement | null>(null);
    let instance: PickerInstance<unknown, DateTimePickerOptions> | null = null;
    onMounted(() => {
      if (input.value) instance = mountDateTimePicker(input.value, props.options ?? {});
    });
    watch(() => props.options, (next) => instance?.update(next ?? {}), { deep: true });
    onBeforeUnmount(() => instance?.destroy());
    // Editable by default (masked + validated typing); mount sets readOnly.
    return () => h('input', { ref: input });
  },
});

export const NepaliMonthPicker = defineComponent({
  name: 'NepaliMonthPicker',
  props: ['options'],
  setup(props: { options?: MonthPickerOptions }) {
    const input = ref<HTMLInputElement | null>(null);
    let instance: PickerInstance<unknown, MonthPickerOptions> | null = null;
    onMounted(() => {
      if (input.value) instance = mountMonthPicker(input.value, props.options ?? {});
    });
    watch(() => props.options, (next) => instance?.update(next ?? {}), { deep: true });
    onBeforeUnmount(() => instance?.destroy());
    // Read-only state is owned by the mount.
    return () => h('input', { ref: input });
  },
});
