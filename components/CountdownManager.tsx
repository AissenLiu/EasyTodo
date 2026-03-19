'use client';

import { useEffect, useState } from 'react';
import {
  buildCountdownRemainingText,
  DISPLAY_UNIT_OPTIONS,
  getCountdownDisplayUnitLabel,
  parseMonthlyCycleDay,
  parseWeeklyCycleValue,
  toLocalInputDateTime,
  WEEKDAY_OPTIONS,
} from '@/lib/countdowns';
import { useNow } from '@/hooks/useNow';

type CountdownItem = {
  id: string;
  name: string;
  description: string;
  display_unit: 'day' | 'day_hour' | 'day_hour_minute' | 'day_hour_minute_second';
  mode: 'target' | 'cycle';
  target_at: string | null;
  cycle_type: 'weekly' | 'monthly' | null;
  cycle_value: string | null;
  time_of_day: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  next_due_at: string | null;
  next_due_text: string;
  remaining_text: string;
};

type FormState = {
  name: string;
  description: string;
  display_unit: 'day' | 'day_hour' | 'day_hour_minute' | 'day_hour_minute_second';
  mode: 'target' | 'cycle';
  target_at: string;
  cycle_type: 'weekly' | 'monthly';
  weekly_days: number[];
  monthly_day: number;
  time_of_day: string;
  is_active: boolean;
};

const initialForm: FormState = {
  name: '',
  description: '',
  display_unit: 'day',
  mode: 'target',
  target_at: '',
  cycle_type: 'weekly',
  weekly_days: [1],
  monthly_day: 1,
  time_of_day: '09:00',
  is_active: true,
};

function toIsoString(localDateTime: string) {
  if (!localDateTime) return null;
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function CountdownManager() {
  const now = useNow('second');
  const [items, setItems] = useState<CountdownItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchList = async () => {
    try {
      const res = await fetch('/api/countdowns');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError('加载倒计时失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    const timer = window.setInterval(fetchList, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setError('');
  };

  const toggleWeeklyDay = (value: number) => {
    setForm((prev) => {
      const exists = prev.weekly_days.includes(value);
      const nextDays = exists
        ? prev.weekly_days.filter((day) => day !== value)
        : [...prev.weekly_days, value];
      return {
        ...prev,
        weekly_days: nextDays.sort((a, b) => a - b),
      };
    });
  };

  const fillFormForEdit = (item: CountdownItem) => {
    setEditingId(item.id);
    setError('');
    setForm({
      name: item.name,
      description: item.description || '',
      display_unit: item.display_unit,
      mode: item.mode,
      target_at: toLocalInputDateTime(item.target_at),
      cycle_type: item.cycle_type ?? 'weekly',
      weekly_days: parseWeeklyCycleValue(item.cycle_value),
      monthly_day: parseMonthlyCycleDay(item.cycle_value) ?? 1,
      time_of_day: item.time_of_day || '09:00',
      is_active: item.is_active,
    });
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      display_unit: form.display_unit,
      mode: form.mode,
      is_active: form.is_active,
    };

    if (form.mode === 'target') {
      payload.target_at = toIsoString(form.target_at);
      payload.cycle_type = null;
      payload.cycle_value = null;
      payload.time_of_day = null;
    } else {
      payload.target_at = null;
      payload.cycle_type = form.cycle_type;
      payload.cycle_value = form.cycle_type === 'weekly' ? form.weekly_days : form.monthly_day;
      payload.time_of_day = form.time_of_day || '09:00';
    }

    return payload;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('请填写倒计时名称');
      return;
    }

    if (form.mode === 'target' && !form.target_at) {
      setError('请选择目标时间');
      return;
    }

    if (form.mode === 'cycle' && form.cycle_type === 'weekly' && form.weekly_days.length === 0) {
      setError('请至少选择一个周几');
      return;
    }

    if (form.mode === 'cycle' && form.cycle_type === 'monthly' && (form.monthly_day < 1 || form.monthly_day > 31)) {
      setError('每月某日需在 1-31 之间');
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      const res = await fetch(editingId ? `/api/countdowns/${editingId}` : '/api/countdowns', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || '保存失败');
        return;
      }
      await fetchList();
      resetForm();
    } catch {
      setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: CountdownItem) => {
    try {
      const res = await fetch(`/api/countdowns/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (res.ok) {
        await fetchList();
      }
    } catch {
      setError('更新状态失败');
    }
  };

  const removeItem = async (id: string) => {
    const confirmed = window.confirm('确认删除这个倒计时吗？');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/countdowns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingId === id) {
          resetForm();
        }
        await fetchList();
      }
    } catch {
      setError('删除失败');
    }
  };

  return (
    <div className="grid min-h-0 grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
      <section className="rounded border border-gray-100 bg-gray-50/30 p-6">
        <h2 className="mb-1 text-[16px] font-bold text-gray-900">{editingId ? '编辑倒计时' : '新增倒计时'}</h2>
        <p className="mb-6 text-[12px] text-gray-400">支持指定日期和固定周期（每周/每月）</p>

        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-[12px] text-gray-500">名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
              placeholder="例如：发版倒计时"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] text-gray-500">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
              placeholder="可选描述"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] text-gray-500">显示单位</label>
              <select
                value={form.display_unit}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    display_unit:
                      e.target.value === 'day_hour' ||
                      e.target.value === 'day_hour_minute' ||
                      e.target.value === 'day_hour_minute_second'
                        ? e.target.value
                        : 'day',
                  }))
                }
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
              >
                {DISPLAY_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] text-gray-500">模式</label>
              <select
                value={form.mode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mode: e.target.value === 'cycle' ? 'cycle' : 'target',
                  }))
                }
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
              >
                <option value="target">指定日期</option>
                <option value="cycle">固定周期</option>
              </select>
            </div>
          </div>

          {form.mode === 'target' ? (
            <div>
              <label className="mb-1.5 block text-[12px] text-gray-500">指定日期时间</label>
              <input
                type="datetime-local"
                value={form.target_at}
                onChange={(e) => setForm((prev) => ({ ...prev, target_at: e.target.value }))}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
              />
            </div>
          ) : (
            <div className="space-y-4 rounded border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12px] text-gray-500">固定周期类型</label>
                  <select
                    value={form.cycle_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        cycle_type: e.target.value === 'monthly' ? 'monthly' : 'weekly',
                      }))
                    }
                    className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
                  >
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] text-gray-500">时间</label>
                  <input
                    type="time"
                    value={form.time_of_day}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_of_day: e.target.value }))}
                    className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              {form.cycle_type === 'weekly' ? (
                <div>
                  <label className="mb-2 block text-[12px] text-gray-500">每周多选周几</label>
                  <div className="grid grid-cols-4 gap-2">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const active = form.weekly_days.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWeeklyDay(day.value)}
                          className={`rounded border px-2 py-1.5 text-[12px] transition-colors ${
                            active
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-[12px] text-gray-500">每月某日</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.monthly_day}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        monthly_day: Number(e.target.value || 1),
                      }))
                    }
                    className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-[12px] text-gray-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            创建/更新后保持启用
          </label>

          {error && <div className="text-[12px] text-red-500">{error}</div>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-gray-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? '保存中...' : editingId ? '保存修改' : '创建倒计时'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-gray-200 bg-white px-4 py-2 text-[13px] text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                取消编辑
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="min-h-0 rounded border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">倒计时列表</h2>
            <p className="text-[12px] text-gray-400">显示下一个到期时间和剩余时长</p>
          </div>
          <button
            type="button"
            onClick={fetchList}
            className="rounded border border-gray-200 px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
          >
            刷新
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[13px] text-gray-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="rounded border border-dashed border-gray-200 py-12 text-center text-[13px] text-gray-400">
            暂无倒计时，先在左侧创建一个
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded border border-gray-100 bg-gray-50/40 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-gray-900">{item.name}</span>
                  <span className="rounded bg-gray-200/70 px-2 py-0.5 text-[11px] text-gray-600">
                    {getCountdownDisplayUnitLabel(item.display_unit)}
                  </span>
                  <span className="rounded bg-gray-200/70 px-2 py-0.5 text-[11px] text-gray-600">
                    {item.mode === 'target' ? '指定日期' : item.cycle_type === 'weekly' ? '每周' : '每月'}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] ${
                      item.is_active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.is_active ? '启用中' : '已停用'}
                  </span>
                </div>

                {item.description && <div className="mb-2 text-[12px] text-gray-500">{item.description}</div>}

                <div className="grid gap-1 text-[12px] text-gray-500 sm:grid-cols-2">
                  <div>下一个到期：{item.next_due_text || '--'}</div>
                  <div>剩余：{buildCountdownRemainingText(item.next_due_at, item.display_unit, now)}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillFormForEdit(item)}
                    className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(item)}
                    className="rounded border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                  >
                    {item.is_active ? '停用' : '启用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded border border-red-100 bg-white px-3 py-1.5 text-[12px] text-red-500 transition-colors hover:border-red-200 hover:text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
