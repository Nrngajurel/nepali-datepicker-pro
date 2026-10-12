/**
 * Vue 3 wrappers for the Nepali date picker family.
 *
 * Features
 * ────────
 * • v-model          – two-way binding via modelValue prop + update:modelValue emit
 * • @change          – typed result emitted on every picker change
 * • @open / @close / @clear / @invalid – lifecycle and validation events
 * • @changeMonthYear – (DateTimePicker only); @cancel – (DateRangePicker only)
 * • Template ref API – show / hide / clear / getValue / setValue / update / focus
 *   and the underlying `instance`, via `expose()`
 * • Reactive options – deep-watches `options` prop and calls instance.update()
 * • Lifecycle safe   – destroys instance in onBeforeUnmount
 *
 * Usage examples
 * ──────────────
 * <!-- DateTimePicker -->
 * <NepaliDateTimePicker
 *   ref="picker"
 *   v-model="myDate"
 *   :options="{ mode: 'BS', withTime: true }"
 *   @change="onDateChange"
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
 * <!-- MonthPicker / YearPicker / TimePicker / MultiDatePicker -->
 * <NepaliMonthPicker v-model="myMonth" :options="{ locale: 'ne' }" />
 * <NepaliYearPicker v-model="myYear" />
 * <NepaliTimePicker v-model="myTime" :options="{ timeFormat: '24h' }" />
 * <NepaliMultiDatePicker v-model="myDates" :options="{ maxDates: 5 }" />
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
  mountMultiDatePicker,
  mountTimePicker,
  mountYearPicker,
} from './index.js';

import type {
  DateRangePickerOptions,
  DateRangeResult,
  DateTimePickerOptions,
  DateTimeResult,
  InvalidReason,
  MonthPickerOptions,
  MonthResult,
  MonthValue,
  MultiDatePickerOptions,
  MultiDateResult,
  PickerInstance,
  TimePickerOptions,
  TimeResult,
  TimeValue,
  YearPickerOptions,
  YearResult,
} from './index.js';

/** Shape used for v-model on the range picker. */
export interface DateRangeModelValue {
  start: Date;
  end: Date;
}

/** What a picker component's template ref exposes. */
export interface PickerExpose<TResult, TOptions, TInput> {
  show(): void;
  hide(): void;
  clear(): void;
  getValue(): TResult | null;
  setValue(value: TInput | null): void;
  update(patch: Partial<TOptions>): void;
  focus(): void;
  readonly instance: PickerInstance<TResult, TOptions, TInput> | null;
}

const CALLBACKS = ['onChange', 'onApply', 'onOpen', 'onClose', 'onClear', 'onCancel', 'onChangeMonthYear', 'onInvalid'];

interface Spec<TOptions, TResult, TModel, TInput> {
  name: string;
  mount: (input: HTMLInputElement, options: TOptions) => PickerInstance<TResult, TOptions, TInput>;
  /** Vue runtime prop type(s) for modelValue. */
  modelType: PropType<TModel | null>;
  /** The callback carrying the committed value ('onChange' or 'onApply'). */
  valueCallback: 'onChange' | 'onApply';
  toModel(result: TResult): TModel;
  fromModel(model: TModel): TInput;
  /** Extra emits beyond the shared ones. */
  extra?: { changeMonthYear?: boolean; cancel?: boolean };
}

function createPickerComponent<TOptions extends object, TResult, TModel, TInput>(spec: Spec<TOptions, TResult, TModel, TInput>) {
  return defineComponent({
    name: spec.name,

    props: {
      /** v-model value. */
      modelValue: {
        type: spec.modelType,
        default: null,
      },
      options: {
        type: Object as PropType<TOptions>,
        default: () => ({}),
      },
    },

    emits: {
      /** v-model write-back. */
      'update:modelValue': (_value: TModel | null) => true,
      /** Full picker result on every committed change. */
      change: (_result: TResult) => true,
      open: () => true,
      close: () => true,
      /** The user cleared the value; v-model is set to null. */
      clear: () => true,
      /** A typed value was refused, or a required field was left empty. */
      invalid: (_reason: InvalidReason, _message: string) => true,
      changeMonthYear: (_year: number, _month: number) => true,
      cancel: () => true,
    },

    setup(props, { emit, expose }) {
      const inputRef = ref<HTMLInputElement | null>(null);
      let instance: PickerInstance<TResult, TOptions, TInput> | null = null;
      const own = () => props.options as Record<string, ((...args: unknown[]) => void) | undefined>;

      onMounted(() => {
        if (!inputRef.value) return;
        const options = { ...(props.options as Record<string, unknown>) } as Record<string, unknown>;
        if (props.modelValue != null) options.value = spec.fromModel(props.modelValue as TModel);
        options[spec.valueCallback] = (result: TResult) => {
          emit('update:modelValue', spec.toModel(result));
          emit('change', result);
          own()[spec.valueCallback]?.(result);
        };
        // The range picker reports partial picks through onChange too.
        if (spec.valueCallback === 'onApply') options.onChange = (partial: unknown) => own().onChange?.(partial);
        options.onClear = () => {
          emit('update:modelValue', null);
          emit('clear');
          own().onClear?.();
        };
        options.onOpen = () => { emit('open'); own().onOpen?.(); };
        options.onClose = () => { emit('close'); own().onClose?.(); };
        options.onInvalid = (reason: InvalidReason, message: string) => { emit('invalid', reason, message); own().onInvalid?.(reason, message); };
        if (spec.extra?.changeMonthYear) options.onChangeMonthYear = (y: number, m: number) => { emit('changeMonthYear', y, m); own().onChangeMonthYear?.(y, m); };
        if (spec.extra?.cancel) options.onCancel = () => { emit('cancel'); own().onCancel?.(); };
        instance = spec.mount(inputRef.value, options as TOptions);
      });

      // Keep picker in sync when modelValue changes externally.
      watch(
        () => props.modelValue,
        (next) => instance?.setValue(next == null ? null : spec.fromModel(next as TModel)),
      );

      // Propagate option changes (excluding callbacks — those are routed above —
      // and `value`: v-model is the controlled value in Vue, synced by the watcher above).
      watch(
        () => props.options,
        (next) => {
          if (!next) return;
          const rest: Record<string, unknown> = {};
          Object.entries(next as Record<string, unknown>).forEach(([key, value]) => {
            if (key !== 'value' && !CALLBACKS.includes(key)) rest[key] = value;
          });
          instance?.update(rest as Partial<TOptions>);
        },
        { deep: true },
      );

      onBeforeUnmount(() => instance?.destroy());

      const api: PickerExpose<TResult, TOptions, TInput> = {
        show: () => instance?.show(),
        hide: () => instance?.hide(),
        clear: () => instance?.clear(),
        getValue: () => instance?.getValue() ?? null,
        setValue: (value) => instance?.setValue(value),
        update: (patch) => instance?.update(patch),
        focus: () => inputRef.value?.focus(),
        get instance() {
          return instance;
        },
      };
      expose(api);

      return () => h('input', { ref: inputRef });
    },
  });
}

// ─── components ─────────────────────────────────────────────────────────────

export const NepaliDateTimePicker = createPickerComponent<DateTimePickerOptions, DateTimeResult, Date, Date>({
  name: 'NepaliDateTimePicker',
  mount: mountDateTimePicker,
  // `Date`, not `Object`: Vue's runtime prop check types a Date as "Date",
  // so `Object` would warn on every v-model value.
  modelType: Date as PropType<Date | null>,
  valueCallback: 'onChange',
  toModel: (result) => result.ad,
  fromModel: (date) => date,
  extra: { changeMonthYear: true },
});

export const NepaliDateRangePicker = createPickerComponent<DateRangePickerOptions, DateRangeResult, DateRangeModelValue, DateRangeModelValue>({
  name: 'NepaliDateRangePicker',
  mount: mountDateRangePicker,
  modelType: Object as PropType<DateRangeModelValue | null>,
  valueCallback: 'onApply',
  toModel: (result) => ({ start: result.start, end: result.end }),
  fromModel: (range) => range,
  extra: { cancel: true },
});

export const NepaliMonthPicker = createPickerComponent<MonthPickerOptions, MonthResult, MonthResult, MonthValue>({
  name: 'NepaliMonthPicker',
  mount: mountMonthPicker,
  // A plain { year, month } works too — only those two fields are read.
  modelType: Object as PropType<MonthResult | null>,
  valueCallback: 'onChange',
  toModel: (result) => result,
  // MonthPicker takes { year, month } as value, not the whole result.
  fromModel: (model) => ({ year: model.year, month: model.month }),
});

export const NepaliYearPicker = createPickerComponent<YearPickerOptions, YearResult, number, number>({
  name: 'NepaliYearPicker',
  mount: mountYearPicker,
  modelType: Number as PropType<number | null>,
  valueCallback: 'onChange',
  toModel: (result) => result.year,
  fromModel: (year) => year,
});

export const NepaliTimePicker = createPickerComponent<TimePickerOptions, TimeResult, TimeValue, TimeValue>({
  name: 'NepaliTimePicker',
  mount: mountTimePicker,
  modelType: Object as PropType<TimeValue | null>,
  valueCallback: 'onChange',
  toModel: (result) => ({ hour: result.hour, minute: result.minute, second: result.second }),
  fromModel: (time) => time,
});

export const NepaliMultiDatePicker = createPickerComponent<MultiDatePickerOptions, MultiDateResult, Date[], Date[]>({
  name: 'NepaliMultiDatePicker',
  mount: mountMultiDatePicker,
  modelType: Array as PropType<Date[] | null>,
  valueCallback: 'onChange',
  toModel: (result) => result.dates,
  fromModel: (dates) => dates,
});
