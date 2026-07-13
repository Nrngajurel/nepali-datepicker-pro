/**
 * Refined Vue 3 wrappers for the Nepali date picker family.
 *
 * Features
 * ────────
 * • v-model          – two-way binding via modelValue prop + update:modelValue emit
 * • @change          – typed result emitted on every picker change
 * • @open / @close   – lifecycle events
 * • @changeMonthYear – (DateTimePicker only)
 * • Full TypeScript – props and emits are narrowly typed; no `unknown` leaks
 * • Reactive options – deep-watches `options` prop and calls instance.update()
 * • Lifecycle safe   – destroys instance in onBeforeUnmount
 *
 * Usage examples
 * ──────────────
 * <!-- DateTimePicker -->
 * <NepaliDateTimePicker
 *   v-model="myDate"
 *   :options="{ mode: 'BS', withTime: true }"
 *   @change="onDateChange"
 *   @open="onOpen"
 *   @close="onClose"
 *   @changeMonthYear="onMonthYear"
 * />
 *
 * <!-- DateRangePicker -->
 * <NepaliDateRangePicker
 *   v-model="myRange"
 *   :options="{ mode: 'BS', numberOfMonths: 2 }"
 *   @change="onRangeChange"
 * />
 *
 * <!-- MonthPicker -->
 * <NepaliMonthPicker
 *   v-model="myMonth"
 *   :options="{ locale: 'ne' }"
 *   @change="onMonthChange"
 * />
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from 'vue';

import {
  mountDateRangePicker,
  mountDateTimePicker,
  mountMonthPicker,
} from './index.js';

import type {
  DateRangePickerOptions,
  DateRangeResult,
  DateTimePickerOptions,
  DateTimeResult,
  MonthPickerOptions,
  MonthResult,
  PickerInstance,
} from './index.js';

// ─── DateTimePicker ──────────────────────────────────────────────────────────

export const NepaliDateTimePicker = defineComponent({
  name: 'NepaliDateTimePicker',

  props: {
    /** v-model value — the raw AD Date that drives the picker. */
    modelValue: {
      type: Object as PropType<Date | null>,
      default: null,
    },
    options: {
      type: Object as PropType<DateTimePickerOptions>,
      default: () => ({}),
    },
  },

  emits: {
    /** v-model write-back. */
    'update:modelValue': (value: Date | null) => true,
    /** Full picker result on every selection. */
    change: (result: DateTimeResult) => true,
    open: () => true,
    close: () => true,
    changeMonthYear: (year: number, month: number) => true,
  },

  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null);
    let instance: PickerInstance<DateTimeResult, DateTimePickerOptions> | null = null;

    onMounted(() => {
      if (!inputRef.value) return;

      instance = mountDateTimePicker(inputRef.value, {
        ...props.options,
        // Sync initial value from v-model (prefer modelValue, fall back to options.value)
        value: props.modelValue ?? props.options?.value ?? null,

        onChange(result) {
          emit('update:modelValue', result.ad);
          emit('change', result);
          props.options?.onChange?.(result);
        },

        onOpen() {
          emit('open');
          props.options?.onOpen?.();
        },

        onClose() {
          emit('close');
          props.options?.onClose?.();
        },

        onChangeMonthYear(year, month) {
          emit('changeMonthYear', year, month);
          props.options?.onChangeMonthYear?.(year, month);
        },
      });
    });

    // Keep picker in sync when modelValue changes externally.
    watch(
      () => props.modelValue,
      (next) => instance?.setValue(next as any),
    );

    // Propagate option changes (excluding callbacks — those are baked in above).
    watch(
      () => props.options,
      (next) => {
        if (!next) return;
        const { onChange, onOpen, onClose, onChangeMonthYear, ...rest } = next;
        instance?.update(rest);
      },
      { deep: true },
    );

    onBeforeUnmount(() => instance?.destroy());

    return () => h('input', { ref: inputRef });
  },
});

// ─── DateRangePicker ─────────────────────────────────────────────────────────

/** Shape used for v-model on the range picker. */
export interface DateRangeModelValue {
  start: Date;
  end: Date;
}

export const NepaliDateRangePicker = defineComponent({
  name: 'NepaliDateRangePicker',

  props: {
    modelValue: {
      type: Object as PropType<DateRangeModelValue | null>,
      default: null,
    },
    options: {
      type: Object as PropType<DateRangePickerOptions>,
      default: () => ({}),
    },
  },

  emits: {
    'update:modelValue': (value: DateRangeModelValue | null) => true,
    /** Emitted when both start and end are selected (autoApply or Apply click). */
    change: (result: DateRangeResult) => true,
    open: () => true,
    close: () => true,
  },

  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null);
    let instance: PickerInstance<DateRangeResult, DateRangePickerOptions> | null = null;

    onMounted(() => {
      if (!inputRef.value) return;

      instance = mountDateRangePicker(inputRef.value, {
        ...props.options,
        value: props.modelValue ?? props.options?.value ?? null,

        onApply(result) {
          emit('update:modelValue', { start: result.start, end: result.end });
          emit('change', result);
          props.options?.onApply?.(result);
        },

        onOpen() {
          emit('open');
          props.options?.onOpen?.();
        },

        onClose() {
          emit('close');
          props.options?.onClose?.();
        },
      });
    });

    watch(
      () => props.modelValue,
      (next) => instance?.setValue(next as any),
    );

    watch(
      () => props.options,
      (next) => {
        if (!next) return;
        const { onApply, onOpen, onClose, onChange, ...rest } = next;
        instance?.update(rest);
      },
      { deep: true },
    );

    onBeforeUnmount(() => instance?.destroy());

    return () => h('input', { ref: inputRef });
  },
});

// ─── MonthPicker ─────────────────────────────────────────────────────────────

export const NepaliMonthPicker = defineComponent({
  name: 'NepaliMonthPicker',

  props: {
    modelValue: {
      type: Object as PropType<MonthResult | null>,
      default: null,
    },
    options: {
      type: Object as PropType<MonthPickerOptions>,
      default: () => ({}),
    },
  },

  emits: {
    'update:modelValue': (value: MonthResult | null) => true,
    change: (result: MonthResult) => true,
    open: () => true,
    close: () => true,
  },

  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null);
    let instance: PickerInstance<MonthResult, MonthPickerOptions> | null = null;

    onMounted(() => {
      if (!inputRef.value) return;

      instance = mountMonthPicker(inputRef.value, {
        ...props.options,
        // MonthPicker takes { year, month } as value, not Date.
        value: props.modelValue
          ? { year: props.modelValue.year, month: props.modelValue.month }
          : props.options?.value ?? null,

        onChange(result) {
          emit('update:modelValue', result);
          emit('change', result);
          props.options?.onChange?.(result);
        },

        onOpen() {
          emit('open');
          props.options?.onOpen?.();
        },

        onClose() {
          emit('close');
          props.options?.onClose?.();
        },
      });
    });

    watch(
      () => props.modelValue,
      (next) => {
        if (!next) { instance?.setValue(null); return; }
        instance?.setValue({ year: next.year, month: next.month } as any);
      },
    );

    watch(
      () => props.options,
      (next) => {
        if (!next) return;
        const { onChange, onOpen, onClose, ...rest } = next;
        instance?.update(rest);
      },
      { deep: true },
    );

    onBeforeUnmount(() => instance?.destroy());

    return () => h('input', { ref: inputRef });
  },
});