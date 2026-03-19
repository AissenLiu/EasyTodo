export type CountdownDisplayUnit =
  | 'day'
  | 'day_hour'
  | 'day_hour_minute'
  | 'day_hour_minute_second';
export type CountdownMode = 'target' | 'cycle';
export type CountdownCycleType = 'weekly' | 'monthly' | null;

export type CountdownRecord = {
  id: string;
  name: string;
  description: string;
  display_unit: CountdownDisplayUnit;
  mode: CountdownMode;
  target_at: string | null;
  cycle_type: CountdownCycleType;
  cycle_value: string | null;
  time_of_day: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CountdownSummary = {
  nextDueAt: string | null;
  nextDueText: string;
  remainingText: string;
};

export const DISPLAY_UNIT_OPTIONS = [
  { value: 'day', label: 'x 天' },
  { value: 'day_hour', label: 'x 天 x 小时' },
  { value: 'day_hour_minute', label: 'x 天 x 小时 x 分' },
  { value: 'day_hour_minute_second', label: 'x 天 x 小时 x 分 x 秒' },
] as const;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
] as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;
const SECOND_MS = 1000;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

function toLocalDateTimeLabel(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

function fallbackId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDescription(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return isValidDate(date) ? date : null;
}

function normalizeTimeSegment(segment: string, max: number) {
  if (!/^\d{1,2}$/.test(segment)) return null;
  const numeric = Number(segment);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > max) return null;
  return numeric;
}

function parseTimeOfDay(value: string | null) {
  if (!value) return { hour: 9, minute: 0 };
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = normalizeTimeSegment(hourRaw ?? '', 23);
  const minute = normalizeTimeSegment(minuteRaw ?? '', 59);
  if (hour === null || minute === null) {
    return { hour: 9, minute: 0 };
  }
  return { hour, minute };
}

function createMonthlyDate(year: number, month: number, day: number, hour: number, minute: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(lastDay, day));
  return new Date(year, month, safeDay, hour, minute, 0, 0);
}

function dedupeSortWeekdays(values: number[]) {
  const set = new Set<number>();
  values.forEach((value) => {
    if (Number.isInteger(value) && value >= 0 && value <= 6) {
      set.add(value);
    }
  });
  return Array.from(set).sort((a, b) => a - b);
}

export function normalizeDisplayUnit(value: unknown): CountdownDisplayUnit {
  if (value === 'day_hour' || value === 'hour') return 'day_hour';
  if (value === 'day_hour_minute') return 'day_hour_minute';
  if (value === 'day_hour_minute_second') return 'day_hour_minute_second';
  return 'day';
}

export function normalizeMode(value: unknown): CountdownMode {
  if (value === 'cycle') return 'cycle';
  if (value === 'absolute' || value === 'target') return 'target';
  return 'target';
}

export function normalizeCycleType(value: unknown): CountdownCycleType {
  if (value === 'weekly' || value === 'monthly') return value;
  return null;
}

export function normalizeTimeOfDay(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const [hourRaw, minuteRaw] = value.trim().split(':');
  const hour = normalizeTimeSegment(hourRaw ?? '', 23);
  const minute = normalizeTimeSegment(minuteRaw ?? '', 59);
  if (hour === null || minute === null) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function normalizeTargetAt(value: unknown): string | null {
  const date = parseDateLike(value);
  return date ? date.toISOString() : null;
}

export function parseWeeklyCycleValue(value: unknown): number[] {
  if (Array.isArray(value)) {
    return dedupeSortWeekdays(value.map((item) => Number(item)));
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return dedupeSortWeekdays(parsed.map((item) => Number(item)));
    }
  } catch {
    // ignore JSON parse error and fallback to comma parsing
  }
  return dedupeSortWeekdays(trimmed.split(/[,\s，]+/).map((item) => Number(item)));
}

export function parseMonthlyCycleDay(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 31) return null;
  return numeric;
}

export function normalizeCycleValue(cycleType: CountdownCycleType, value: unknown): string | null {
  if (!cycleType) return null;
  if (cycleType === 'weekly') {
    const weekdays = parseWeeklyCycleValue(value);
    return weekdays.length > 0 ? JSON.stringify(weekdays) : null;
  }
  const day = parseMonthlyCycleDay(value);
  return day ? String(day) : null;
}

export function normalizeCountdownRecord(row: Partial<CountdownRecord> & Record<string, unknown>): CountdownRecord {
  const mode = normalizeMode(row.mode);
  const cycleType = mode === 'cycle' ? normalizeCycleType(row.cycle_type) : null;
  const cycleValue = mode === 'cycle' ? normalizeCycleValue(cycleType, row.cycle_value) : null;
  const targetAt = mode === 'target' ? normalizeTargetAt(row.target_at) : null;

  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id : fallbackId(),
    name: normalizeName(row.name),
    description: normalizeDescription(row.description),
    display_unit: normalizeDisplayUnit(row.display_unit),
    mode,
    target_at: targetAt,
    cycle_type: cycleType,
    cycle_value: cycleValue,
    time_of_day: mode === 'cycle' ? normalizeTimeOfDay(row.time_of_day) : null,
    is_active: normalizeBool(row.is_active, true),
    created_at: typeof row.created_at === 'string' && row.created_at ? row.created_at : new Date().toISOString(),
    updated_at: typeof row.updated_at === 'string' && row.updated_at ? row.updated_at : new Date().toISOString(),
  };
}

export function getNextDueDate(record: CountdownRecord, baseDate: Date = new Date()): Date | null {
  if (!record.is_active) return null;
  if (record.mode === 'target') {
    const targetDate = parseDateLike(record.target_at);
    return targetDate;
  }

  if (record.mode !== 'cycle' || !record.cycle_type) return null;

  const now = baseDate;
  const nowMs = now.getTime();
  const { hour, minute } = parseTimeOfDay(record.time_of_day);

  if (record.cycle_type === 'weekly') {
    const weekdays = parseWeeklyCycleValue(record.cycle_value);
    if (weekdays.length === 0) return null;
    let nextDate: Date | null = null;
    weekdays.forEach((weekday) => {
      const candidate = new Date(now);
      candidate.setHours(hour, minute, 0, 0);
      const diff = (weekday - candidate.getDay() + 7) % 7;
      candidate.setDate(candidate.getDate() + diff);
      if (candidate.getTime() <= nowMs) {
        candidate.setDate(candidate.getDate() + 7);
      }
      if (!nextDate || candidate.getTime() < nextDate.getTime()) {
        nextDate = candidate;
      }
    });
    return nextDate;
  }

  const day = parseMonthlyCycleDay(record.cycle_value);
  if (!day) return null;

  let candidate = createMonthlyDate(now.getFullYear(), now.getMonth(), day, hour, minute);
  if (candidate.getTime() <= nowMs) {
    candidate = createMonthlyDate(now.getFullYear(), now.getMonth() + 1, day, hour, minute);
  }
  return candidate;
}

function getDisplayUnits(displayUnit: CountdownDisplayUnit) {
  if (displayUnit === 'day_hour') {
    return [
      { ms: DAY_MS, label: '天' },
      { ms: HOUR_MS, label: '小时' },
    ];
  }

  if (displayUnit === 'day_hour_minute') {
    return [
      { ms: DAY_MS, label: '天' },
      { ms: HOUR_MS, label: '小时' },
      { ms: MINUTE_MS, label: '分' },
    ];
  }

  if (displayUnit === 'day_hour_minute_second') {
    return [
      { ms: DAY_MS, label: '天' },
      { ms: HOUR_MS, label: '小时' },
      { ms: MINUTE_MS, label: '分' },
      { ms: SECOND_MS, label: '秒' },
    ];
  }

  return [{ ms: DAY_MS, label: '天' }];
}

export function getCountdownDisplayUnitLabel(displayUnit: CountdownDisplayUnit) {
  return DISPLAY_UNIT_OPTIONS.find((item) => item.value === displayUnit)?.label ?? 'x 天';
}

export function formatCountdownDuration(durationMs: number, displayUnit: CountdownDisplayUnit) {
  const absMs = Math.max(0, durationMs);
  const units = getDisplayUnits(displayUnit);
  const smallestUnitMs = units[units.length - 1]?.ms ?? DAY_MS;
  const roundedMs = Math.max(
    smallestUnitMs,
    Math.ceil(absMs / smallestUnitMs) * smallestUnitMs
  );

  let remaining = roundedMs;

  const parts = units
    .map((unit) => {
      const value = Math.floor(remaining / unit.ms);
      remaining -= value * unit.ms;
      return { value, label: unit.label };
    });

  const nonZeroParts = parts.filter((part) => part.value > 0);
  if (nonZeroParts.length === 0) {
    const fallback = parts[parts.length - 1];
    return `0 ${fallback?.label ?? '秒'}`;
  }

  return nonZeroParts.map((part) => `${part.value} ${part.label}`).join(' ');
}

export function buildCountdownRemainingText(
  nextDueAt: string | Date | null,
  displayUnit: CountdownDisplayUnit,
  baseDate: Date = new Date()
) {
  if (!nextDueAt) return '无到期时间';

  const nextDue = nextDueAt instanceof Date ? nextDueAt : parseDateLike(nextDueAt);
  if (!nextDue) return '无到期时间';

  const diff = nextDue.getTime() - baseDate.getTime();
  if (diff === 0) return '已到期';

  const formatted = formatCountdownDuration(Math.abs(diff), displayUnit);
  return diff > 0 ? `还剩 ${formatted}` : `已过 ${formatted}`;
}

export function buildCountdownSummary(record: CountdownRecord, baseDate: Date = new Date()): CountdownSummary {
  const nextDue = getNextDueDate(record, baseDate);
  if (!nextDue) {
    return {
      nextDueAt: null,
      nextDueText: '--',
      remainingText: '无到期时间',
    };
  }

  return {
    nextDueAt: nextDue.toISOString(),
    nextDueText: toLocalDateTimeLabel(nextDue),
    remainingText: buildCountdownRemainingText(nextDue, record.display_unit, baseDate),
  };
}

export function sortCountdownsByDue(records: CountdownRecord[], baseDate: Date = new Date()) {
  return [...records].sort((a, b) => {
    const nextA = getNextDueDate(a, baseDate);
    const nextB = getNextDueDate(b, baseDate);

    if (!nextA && !nextB) return a.updated_at < b.updated_at ? 1 : -1;
    if (!nextA) return 1;
    if (!nextB) return -1;
    return nextA.getTime() - nextB.getTime();
  });
}

export function toLocalInputDateTime(value: string | null) {
  if (!value) return '';
  const date = parseDateLike(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function toDisplayDateTime(value: string | Date | null) {
  if (!value) return '--';
  const date = value instanceof Date ? value : parseDateLike(value);
  if (!date) return '--';
  return toLocalDateTimeLabel(date);
}
