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
    return () => h('input', { ref: input, readonly: true });
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
    return () => h('input', { ref: input, readonly: true });
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
    return () => h('input', { ref: input, readonly: true });
  },
});
