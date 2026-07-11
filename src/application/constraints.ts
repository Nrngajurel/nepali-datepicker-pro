import { nativeDateMath } from '../date-math/native-date-math.js';
import { startOfLocalDay } from '../domain/date-value.js';
import type { DateMath } from '../types.js';

// Resolve a bound that may be a Date, an ISO string, 'today', or a relative
// token like '+7d' / '-1m' / '+2y' (parsed via DateMath), normalized to the
// start of its local day.
export function resolveBound(value: Date | string | null | undefined, dateMath: DateMath = nativeDateMath): Date | null {
  if (value == null) return null;
  const parsed = dateMath.parse(value);
  return parsed ? startOfLocalDay(parsed) : null;
}

export interface DayConstraints {
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  disabledDates?: (date: Date) => boolean;
  disabledWeekdays?: number[];
}

// True when a calendar day should be shown but not selectable.
export function isDayDisabled(date: Date, constraints: DayConstraints, dateMath: DateMath = nativeDateMath): boolean {
  const day = startOfLocalDay(date);
  const time = day.getTime();
  const min = resolveBound(constraints.minDate, dateMath);
  if (min && time < min.getTime()) return true;
  const max = resolveBound(constraints.maxDate, dateMath);
  if (max && time > max.getTime()) return true;
  if (constraints.disabledWeekdays && constraints.disabledWeekdays.includes(day.getDay())) return true;
  if (constraints.disabledDates && constraints.disabledDates(day)) return true;
  return false;
}
