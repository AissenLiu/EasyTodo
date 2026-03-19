export type PomodoroSessionType = 'work' | 'short_break' | 'long_break';

export type PomodoroSessionStatus = 'completed' | 'cancelled';

export type PomodoroTimerStatus = 'idle' | 'running' | 'paused';

export type PomodoroSettings = {
  id: number;
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  long_break_interval: number;
  updated_at?: string;
};

export type PomodoroSessionRecord = {
  id: string;
  session_type: PomodoroSessionType;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  status: PomodoroSessionStatus;
};

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  id: 1,
  work_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
  long_break_interval: 4
};

const toInt = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
};

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export function isPomodoroSessionType(value: unknown): value is PomodoroSessionType {
  return value === 'work' || value === 'short_break' || value === 'long_break';
}

export function isPomodoroSessionStatus(value: unknown): value is PomodoroSessionStatus {
  return value === 'completed' || value === 'cancelled';
}

export function normalizePomodoroSettings(
  input: Partial<Record<keyof PomodoroSettings, unknown>> | null | undefined
): PomodoroSettings {
  const source = input ?? {};
  return {
    id: 1,
    work_minutes: clamp(toInt(source.work_minutes, DEFAULT_POMODORO_SETTINGS.work_minutes), 1, 180),
    short_break_minutes: clamp(toInt(source.short_break_minutes, DEFAULT_POMODORO_SETTINGS.short_break_minutes), 1, 90),
    long_break_minutes: clamp(toInt(source.long_break_minutes, DEFAULT_POMODORO_SETTINGS.long_break_minutes), 1, 180),
    long_break_interval: clamp(toInt(source.long_break_interval, DEFAULT_POMODORO_SETTINGS.long_break_interval), 2, 12),
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : undefined
  };
}

export function normalizePlannedMinutes(value: unknown, fallback = DEFAULT_POMODORO_SETTINGS.work_minutes) {
  return clamp(toInt(value, fallback), 1, 180);
}

export function getSessionMinutes(type: PomodoroSessionType, settings: PomodoroSettings) {
  if (type === 'short_break') return settings.short_break_minutes;
  if (type === 'long_break') return settings.long_break_minutes;
  return settings.work_minutes;
}

export function getSessionLabel(type: PomodoroSessionType) {
  if (type === 'short_break') return '短休息';
  if (type === 'long_break') return '长休息';
  return '专注';
}

export function formatTimerSeconds(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  const mm = String(minutesPart).padStart(2, '0');
  const ss = String(secondsPart).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function getNextSessionTypeAfterCompletion(
  currentType: PomodoroSessionType,
  completedWorkCount: number,
  longBreakInterval: number
): PomodoroSessionType {
  if (currentType !== 'work') {
    return 'work';
  }
  if (completedWorkCount > 0 && completedWorkCount % Math.max(2, longBreakInterval) === 0) {
    return 'long_break';
  }
  return 'short_break';
}
