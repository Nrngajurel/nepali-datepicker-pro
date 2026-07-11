import { useEffect, useRef } from 'react';
import { mountDateRangePicker, mountDateTimePicker, mountMonthPicker } from './index.js';
import type { DateRangePickerOptions, DateTimePickerOptions, MonthPickerOptions, PickerInstance } from './index.js';

export function NepaliDateRangePicker(props: DateRangePickerOptions & { className?: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const instance = useRef<PickerInstance<unknown, DateRangePickerOptions> | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    instance.current = mountDateRangePicker(ref.current, props);
    return () => instance.current?.destroy();
  }, []);
  useEffect(() => {
    instance.current?.update(props);
  }, [props]);
  return <input ref={ref} className={props.className} readOnly />;
}

export function NepaliDateTimePicker(props: DateTimePickerOptions & { className?: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const instance = useRef<PickerInstance<unknown, DateTimePickerOptions> | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    instance.current = mountDateTimePicker(ref.current, props);
    return () => instance.current?.destroy();
  }, []);
  useEffect(() => {
    instance.current?.update(props);
  }, [props]);
  return <input ref={ref} className={props.className} readOnly />;
}

export function NepaliMonthPicker(props: MonthPickerOptions & { className?: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const instance = useRef<PickerInstance<unknown, MonthPickerOptions> | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    instance.current = mountMonthPicker(ref.current, props);
    return () => instance.current?.destroy();
  }, []);
  useEffect(() => {
    instance.current?.update(props);
  }, [props]);
  return <input ref={ref} className={props.className} readOnly />;
}
