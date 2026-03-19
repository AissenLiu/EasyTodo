'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { getMemoPreview, sortMemosByUpdatedAt, type MemoRecord } from '@/lib/memos';

function formatDateTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('zh-CN', { hour12: false });
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function MemoWorkspace() {
  const [memos, setMemos] = useState<MemoRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');

  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMemo = useMemo(
    () => memos.find((item) => item.id === selectedId) ?? null,
    [memos, selectedId]
  );

  const filteredMemos = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return memos;
    return memos.filter((item) => {
      const title = item.title.toLowerCase();
      const content = item.content.toLowerCase();
      return title.includes(keyword) || content.includes(keyword);
    });
  }, [memos, search]);

  const isDirty = useMemo(() => {
    if (!selectedMemo) return false;
    return draftTitle !== selectedMemo.title || draftContent !== selectedMemo.content;
  }, [draftContent, draftTitle, selectedMemo]);

  const setTransientSaveState = useCallback((state: SaveState) => {
    if (saveStateTimerRef.current) {
      clearTimeout(saveStateTimerRef.current);
      saveStateTimerRef.current = null;
    }

    setSaveState(state);

    if (state === 'saved') {
      saveStateTimerRef.current = setTimeout(() => {
        setSaveState('idle');
      }, 1800);
    }
  }, []);

  const fetchMemos = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      const res = await fetch('/api/memos');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '加载失败');
      }
      const nextMemos = sortMemosByUpdatedAt(Array.isArray(data) ? data : []);
      setMemos(nextMemos);
      setSelectedId((prev) => prev ?? nextMemos[0]?.id ?? null);
    } catch (e) {
      console.error(e);
      setMemos([]);
      setError('读取备忘录失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMemos();
  }, [fetchMemos]);

  useEffect(() => {
    if (!selectedMemo) {
      setDraftTitle('');
      setDraftContent('');
      return;
    }
    setDraftTitle(selectedMemo.title);
    setDraftContent(selectedMemo.content);
  }, [selectedMemo]);

  useEffect(() => {
    return () => {
      if (saveStateTimerRef.current) {
        clearTimeout(saveStateTimerRef.current);
      }
    };
  }, []);

  const upsertMemo = useCallback((memo: MemoRecord) => {
    setMemos((prev) => {
      const exists = prev.some((item) => item.id === memo.id);
      const next = exists
        ? prev.map((item) => (item.id === memo.id ? memo : item))
        : [memo, ...prev];
      return sortMemosByUpdatedAt(next);
    });
  }, []);

  const handleSave = useCallback(
    async ({ id = selectedId, force = false }: { id?: string | null; force?: boolean } = {}) => {
      if (!id) return true;
      const current = memos.find((item) => item.id === id);
      if (!current) return true;

      const editingSelected = id === selectedId;
      if (editingSelected && !force && !isDirty) return true;

      try {
        setError('');
        setIsSaving(true);
        setTransientSaveState('saving');
        const res = await fetch(`/api/memos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editingSelected ? draftTitle : current.title,
            content: editingSelected ? draftContent : current.content,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || '保存失败');
        }
        upsertMemo(data as MemoRecord);
        setSelectedId((data as MemoRecord).id);
        setTransientSaveState('saved');
        return true;
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : '保存失败，请稍后重试。');
        setTransientSaveState('error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [draftContent, draftTitle, isDirty, memos, selectedId, setTransientSaveState, upsertMemo]
  );

  const handleCreate = useCallback(async () => {
    if (selectedId && isDirty) {
      const ok = await handleSave({ id: selectedId });
      if (!ok) return;
    }

    try {
      setError('');
      setIsCreating(true);
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '未命名备忘录', content: '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '创建失败');
      }
      upsertMemo(data as MemoRecord);
      setSelectedId((data as MemoRecord).id);
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setError('创建备忘录失败，请稍后重试。');
    } finally {
      setIsCreating(false);
    }
  }, [handleSave, isDirty, selectedId, upsertMemo]);

  const handleSelect = useCallback(
    async (id: string) => {
      if (id === selectedId) return;
      if (selectedId && isDirty) {
        const ok = await handleSave({ id: selectedId });
        if (!ok) return;
      }
      setSelectedId(id);
      setSaveState('idle');
    },
    [handleSave, isDirty, selectedId]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedId || !selectedMemo) return;
    if (!window.confirm(`确定删除“${selectedMemo.title}”吗？`)) return;

    try {
      setError('');
      const res = await fetch(`/api/memos/${selectedId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('删除失败');

      const nextMemos = memos.filter((item) => item.id !== selectedId);
      setMemos(nextMemos);
      setSelectedId(nextMemos[0]?.id ?? null);
      setSaveState('idle');
    } catch (e) {
      console.error(e);
      setError('删除失败，请稍后重试。');
    }
  }, [memos, selectedId, selectedMemo]);

  useEffect(() => {
    if (!selectedMemo || !isDirty || isSaving) return;

    const timer = window.setTimeout(() => {
      void handleSave();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [draftContent, draftTitle, handleSave, isDirty, isSaving, selectedMemo]);

  const saveHint =
    saveState === 'saving'
      ? '自动保存中...'
      : saveState === 'saved'
      ? '已自动保存'
      : saveState === 'error'
      ? '自动保存失败'
      : isDirty
      ? '有未保存修改'
      : '自动保存已开启';

  return (
    <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="min-h-0 rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-gray-900">备忘录列表</h2>
              <p className="text-[12px] text-gray-400">{memos.length} 条记录</p>
            </div>
            <button
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded bg-gray-900 px-3 py-2 text-[12px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              新建
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题或内容..."
              className="w-full rounded border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-[13px] text-gray-900 outline-none focus:border-gray-300 focus:bg-white"
            />
          </div>
        </div>

        <div className="min-h-0 max-h-[calc(100vh-260px)] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-[13px] text-gray-400">加载中...</div>
          ) : filteredMemos.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-gray-400">
              {search.trim() ? '没有匹配的备忘录' : '还没有备忘录，先新建一条吧。'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMemos.map((memo) => {
                const isActive = memo.id === selectedId;
                return (
                  <button
                    key={memo.id}
                    onClick={() => void handleSelect(memo.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-gray-50' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="mb-1 truncate text-[13px] font-semibold text-gray-900">
                      {memo.title}
                    </div>
                    <div className="max-h-10 overflow-hidden text-[12px] leading-5 text-gray-500">
                      {getMemoPreview(memo.content)}
                    </div>
                    <div className="mt-2 text-[11px] text-gray-400">
                      {formatDateTime(memo.updated_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 rounded border border-gray-200 bg-white">
        {!selectedMemo ? (
          <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
            <FileText className="mb-4 h-10 w-10 text-gray-300" />
            <h3 className="mb-2 text-[16px] font-bold text-gray-900">还没有打开的备忘录</h3>
            <p className="max-w-md text-[13px] leading-6 text-gray-400">
              新建一条备忘录，把临时想法、会议记录或工作要点统一放在这里。
            </p>
          </div>
        ) : (
          <div className="flex h-full min-h-[520px] flex-col">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="输入标题..."
                    className="w-full border-none bg-transparent p-0 text-[24px] font-black tracking-wide text-gray-900 outline-none placeholder:text-gray-300"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                    <span>创建于 {formatDateTime(selectedMemo.created_at)}</span>
                    <span>上次更新 {formatDateTime(selectedMemo.updated_at)}</span>
                    <span>{draftContent.trim().length} 字符</span>
                    <span className={saveState === 'error' ? 'text-red-500' : saveState === 'saved' ? 'text-emerald-600' : saveState === 'saving' || isDirty ? 'text-amber-500' : ''}>
                      {saveHint}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => void handleDelete()}
                  className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-medium text-gray-600 hover:border-red-200 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-5">
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="写点什么..."
                className="h-full min-h-[420px] w-full resize-none border-none bg-transparent p-0 text-[14px] leading-7 text-gray-800 outline-none placeholder:text-gray-300"
              />
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="lg:col-span-2 rounded border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
