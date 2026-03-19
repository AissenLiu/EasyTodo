'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Save } from 'lucide-react';
import {
  DEFAULT_POMODORO_SETTINGS,
  formatTimerSeconds,
  getNextSessionTypeAfterCompletion,
  getSessionLabel,
  getSessionMinutes,
  normalizePomodoroSettings,
  type PomodoroSessionRecord,
  type PomodoroSessionType,
  type PomodoroSettings,
  type PomodoroTimerStatus
} from '@/lib/pomodoro';

type SettingsDraft = {
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  long_break_interval: number;
};

const draftFromSettings = (settings: PomodoroSettings): SettingsDraft => ({
  work_minutes: settings.work_minutes,
  short_break_minutes: settings.short_break_minutes,
  long_break_minutes: settings.long_break_minutes,
  long_break_interval: settings.long_break_interval
});

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
};

const inputCls =
  'w-full bg-white border border-gray-200 px-3 py-2 text-[13px] text-gray-900 rounded focus:outline-none focus:border-gray-400';

export default function PomodoroPanel() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<SettingsDraft>(draftFromSettings(DEFAULT_POMODORO_SETTINGS));
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentType, setCurrentType] = useState<PomodoroSessionType>('work');
  const [timerStatus, setTimerStatus] = useState<PomodoroTimerStatus>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_POMODORO_SETTINGS.work_minutes * 60);
  const [completedWorkCount, setCompletedWorkCount] = useState(0);

  const [recentSessions, setRecentSessions] = useState<PomodoroSessionRecord[]>([]);
  const [error, setError] = useState('');

  const timerStatusRef = useRef<PomodoroTimerStatus>('idle');
  const currentTypeRef = useRef<PomodoroSessionType>('work');
  const settingsRef = useRef<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS);
  const completedWorkCountRef = useRef(0);
  const targetEndAtRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const plannedMinutesRef = useRef<number | null>(null);
  const completeLockRef = useRef(false);

  useEffect(() => {
    timerStatusRef.current = timerStatus;
  }, [timerStatus]);

  useEffect(() => {
    currentTypeRef.current = currentType;
  }, [currentType]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    completedWorkCountRef.current = completedWorkCount;
  }, [completedWorkCount]);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, sessionsRes] = await Promise.all([
          fetch('/api/pomodoro/settings'),
          fetch('/api/pomodoro/sessions?limit=12')
        ]);
        const settingsData = normalizePomodoroSettings(await settingsRes.json());
        const sessionsData = (await sessionsRes.json()) as PomodoroSessionRecord[];

        setSettings(settingsData);
        setDraftSettings(draftFromSettings(settingsData));
        setRecentSessions(Array.isArray(sessionsData) ? sessionsData : []);

        const workCompleted = (Array.isArray(sessionsData) ? sessionsData : []).filter(
          (item) => item.session_type === 'work' && item.status === 'completed'
        ).length;
        setCompletedWorkCount(workCompleted);
        setRemainingSeconds(settingsData.work_minutes * 60);
      } catch (e) {
        console.error(e);
        setError('加载番茄钟数据失败，请稍后重试。');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const resetCurrentStage = () => {
    targetEndAtRef.current = null;
    sessionStartedAtRef.current = null;
    plannedMinutesRef.current = null;
    completeLockRef.current = false;
    setTimerStatus('idle');
    setRemainingSeconds(getSessionMinutes(currentTypeRef.current, settingsRef.current) * 60);
  };

  const switchStage = (type: PomodoroSessionType) => {
    currentTypeRef.current = type;
    setCurrentType(type);
    targetEndAtRef.current = null;
    sessionStartedAtRef.current = null;
    plannedMinutesRef.current = null;
    completeLockRef.current = false;
    setTimerStatus('idle');
    setRemainingSeconds(getSessionMinutes(type, settingsRef.current) * 60);
  };

  const completeCurrentStage = async () => {
    if (completeLockRef.current) return;
    completeLockRef.current = true;

    const endedAt = new Date().toISOString();
    const type = currentTypeRef.current;
    const plannedMinutes =
      plannedMinutesRef.current ?? getSessionMinutes(type, settingsRef.current);
    const startedAt =
      sessionStartedAtRef.current ??
      new Date(Date.now() - plannedMinutes * 60 * 1000).toISOString();

    const payload = {
      session_type: type,
      planned_minutes: plannedMinutes,
      started_at: startedAt,
      ended_at: endedAt,
      status: 'completed'
    };

    try {
      const res = await fetch('/api/pomodoro/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const savedSession = (await res.json()) as PomodoroSessionRecord;
      if (savedSession && savedSession.id) {
        setRecentSessions((prev) => [savedSession, ...prev].slice(0, 12));
      }
    } catch (e) {
      console.error(e);
    }

    let nextWorkCount = completedWorkCountRef.current;
    if (type === 'work') {
      nextWorkCount += 1;
      completedWorkCountRef.current = nextWorkCount;
      setCompletedWorkCount(nextWorkCount);
    }

    const nextType = getNextSessionTypeAfterCompletion(
      type,
      nextWorkCount,
      settingsRef.current.long_break_interval
    );

    currentTypeRef.current = nextType;
    setCurrentType(nextType);
    setTimerStatus('idle');
    setRemainingSeconds(getSessionMinutes(nextType, settingsRef.current) * 60);
    targetEndAtRef.current = null;
    sessionStartedAtRef.current = null;
    plannedMinutesRef.current = null;
    completeLockRef.current = false;
  };

  useEffect(() => {
    if (timerStatus !== 'running') return;

    const tick = () => {
      if (targetEndAtRef.current === null) return;
      const diff = targetEndAtRef.current - Date.now();
      const nextSeconds = Math.ceil(diff / 1000);

      if (nextSeconds <= 0) {
        setRemainingSeconds(0);
        targetEndAtRef.current = null;
        setTimerStatus('idle');
        void completeCurrentStage();
        return;
      }

      setRemainingSeconds(nextSeconds);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [timerStatus]);

  const handleStartOrResume = () => {
    if (timerStatusRef.current === 'running') return;
    if (timerStatusRef.current === 'idle') {
      if (remainingSeconds <= 0) {
        setRemainingSeconds(getSessionMinutes(currentTypeRef.current, settingsRef.current) * 60);
      }
      sessionStartedAtRef.current = new Date().toISOString();
      plannedMinutesRef.current = Math.max(1, Math.ceil(remainingSeconds / 60));
    }

    targetEndAtRef.current = Date.now() + Math.max(1, remainingSeconds) * 1000;
    setTimerStatus('running');
  };

  const handlePause = () => {
    if (timerStatusRef.current !== 'running') return;
    if (targetEndAtRef.current !== null) {
      const diff = targetEndAtRef.current - Date.now();
      setRemainingSeconds(Math.max(0, Math.ceil(diff / 1000)));
    }
    targetEndAtRef.current = null;
    setTimerStatus('paused');
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setError('');
    const normalized = normalizePomodoroSettings({
      ...draftSettings,
      id: 1
    });

    try {
      const res = await fetch('/api/pomodoro/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
      const data = normalizePomodoroSettings(await res.json());
      setSettings(data);
      setDraftSettings(draftFromSettings(data));
      if (timerStatusRef.current === 'idle') {
        setRemainingSeconds(getSessionMinutes(currentTypeRef.current, data) * 60);
      }
    } catch (e) {
      console.error(e);
      setError('保存设置失败，请稍后重试。');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const setDraftNumber = (key: keyof SettingsDraft, value: string) => {
    const parsed = Number(value);
    setDraftSettings((prev) => ({
      ...prev,
      [key]: Number.isFinite(parsed) ? Math.trunc(parsed) : prev[key]
    }));
  };

  const stageTotalSeconds = getSessionMinutes(currentType, settings) * 60;
  const progress =
    stageTotalSeconds > 0
      ? Math.min(100, Math.max(0, ((stageTotalSeconds - remainingSeconds) / stageTotalSeconds) * 100))
      : 0;

  const statusLabel =
    timerStatus === 'running' ? '进行中' : timerStatus === 'paused' ? '已暂停' : '待开始';

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
      <section className="bg-white border border-gray-200 p-6 lg:p-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-1">番茄钟</h2>
            <p className="text-[13px] text-gray-400">专注、休息、循环推进</p>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-gray-400">状态</div>
            <div className="text-[13px] font-bold text-gray-900">{statusLabel}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {(['work', 'short_break', 'long_break'] as PomodoroSessionType[]).map((type) => (
            <button
              key={type}
              onClick={() => switchStage(type)}
              className={`px-3 py-2 text-[13px] border transition-colors ${
                currentType === type
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {getSessionLabel(type)}
            </button>
          ))}
        </div>

        <div className="border border-gray-200 p-6 mb-5 bg-gray-50/40">
          <div className="text-[12px] text-gray-500 mb-2">{getSessionLabel(currentType)}</div>
          <div className="text-6xl font-black tracking-wider text-gray-900 mb-4">
            {formatTimerSeconds(remainingSeconds)}
          </div>
          <div className="h-1.5 w-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-gray-900 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {timerStatus === 'running' ? (
            <button
              onClick={handlePause}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
            >
              <Pause className="w-4 h-4" />
              暂停
            </button>
          ) : (
            <button
              onClick={handleStartOrResume}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
            >
              <Play className="w-4 h-4" />
              {timerStatus === 'paused' ? '继续' : '开始'}
            </button>
          )}
          <button
            onClick={resetCurrentStage}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-[13px] text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>

        {error && <div className="mt-4 text-[12px] text-red-500">{error}</div>}
      </section>

      <section className="space-y-6">
        <div className="bg-white border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-bold text-gray-900">计时设置</h3>
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-[12px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              保存
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] text-gray-500">
              工作时长(分钟)
              <input
                type="number"
                min={1}
                max={180}
                value={draftSettings.work_minutes}
                onChange={(e) => setDraftNumber('work_minutes', e.target.value)}
                className={`${inputCls} mt-1.5`}
              />
            </label>
            <label className="block text-[12px] text-gray-500">
              短休息(分钟)
              <input
                type="number"
                min={1}
                max={90}
                value={draftSettings.short_break_minutes}
                onChange={(e) => setDraftNumber('short_break_minutes', e.target.value)}
                className={`${inputCls} mt-1.5`}
              />
            </label>
            <label className="block text-[12px] text-gray-500">
              长休息(分钟)
              <input
                type="number"
                min={1}
                max={180}
                value={draftSettings.long_break_minutes}
                onChange={(e) => setDraftNumber('long_break_minutes', e.target.value)}
                className={`${inputCls} mt-1.5`}
              />
            </label>
            <label className="block text-[12px] text-gray-500">
              长休息周期
              <input
                type="number"
                min={2}
                max={12}
                value={draftSettings.long_break_interval}
                onChange={(e) => setDraftNumber('long_break_interval', e.target.value)}
                className={`${inputCls} mt-1.5`}
              />
            </label>
          </div>
          <div className="text-[11px] text-gray-400 mt-3">
            每完成 {settings.long_break_interval} 个专注阶段后自动进入长休息。
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-[14px] font-bold text-gray-900 mb-4">最近会话</h3>
          {isLoading ? (
            <div className="text-[12px] text-gray-400">加载中...</div>
          ) : recentSessions.length === 0 ? (
            <div className="text-[12px] text-gray-400">暂无完成记录</div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {recentSessions.map((item) => (
                <div key={item.id} className="border border-gray-200 p-3 bg-gray-50/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-bold text-gray-900">
                      {getSessionLabel(item.session_type)}
                    </span>
                    <span className="text-[11px] text-gray-500">{item.planned_minutes} 分钟</span>
                  </div>
                  <div className="text-[11px] text-gray-500">{formatDateTime(item.started_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
