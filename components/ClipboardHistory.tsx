'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Search, Trash2, Eraser, Check } from 'lucide-react';

type ClipboardItem = {
  id: string;
  content: string;
  content_hash: string;
  source: string;
  created_at: string;
};

function isTauriDesktop() {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window || window.navigator.userAgent.includes('Tauri');
}

function formatDateTime(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('zh-CN', { hour12: false });
}

async function copyToClipboard(content: string) {
  if (isTauriDesktop()) {
    try {
      const plugin = await import('@tauri-apps/plugin-clipboard-manager');
      await plugin.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to write clipboard via Tauri plugin:', error);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to write clipboard via browser API:', error);
    }
  }

  return false;
}

export default function ClipboardHistory() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const searchPlaceholder = useMemo(
    () => (isTauriDesktop() ? '搜索复制历史...' : '搜索剪切板历史（浏览器仅查看）...'),
    []
  );

  const fetchHistory = async (keyword: string) => {
    try {
      setError('');
      setIsLoading(true);
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('q', keyword.trim());
      params.set('limit', '300');
      const res = await fetch(`/api/clipboard?${params.toString()}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError('读取剪切板历史失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchHistory(search);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [search]);

  const handleCopy = async (item: ClipboardItem) => {
    try {
      setBusyId(item.id);
      const copied = await copyToClipboard(item.content);
      if (!copied) {
        setError('当前环境不支持写入剪切板。');
        return;
      }

      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 1200);

      await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: item.content, source: 'manual' })
      });
    } catch (e) {
      console.error(e);
      setError('复制失败，请重试。');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/clipboard/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('删除失败');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error(e);
      setError('删除失败，请稍后重试。');
    } finally {
      setBusyId(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('确定清空全部剪切板历史吗？')) return;
    try {
      setIsClearing(true);
      const res = await fetch('/api/clipboard', { method: 'DELETE' });
      if (!res.ok) throw new Error('清空失败');
      setItems([]);
    } catch (e) {
      console.error(e);
      setError('清空失败，请稍后重试。');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-gray-50 border border-gray-200 py-2.5 pl-10 pr-4 text-[13px] rounded focus:outline-none focus:border-gray-300 focus:bg-white text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={handleClear}
          disabled={isClearing || items.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        >
          <Eraser className="w-3.5 h-3.5" />
          清空全部
        </button>
      </div>

      {error && (
        <div className="mb-4 text-[12px] text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 bg-white rounded">
        {isLoading ? (
          <div className="h-full min-h-36 flex items-center justify-center text-[13px] text-gray-400">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="h-full min-h-36 flex items-center justify-center text-[13px] text-gray-400 px-6 text-center">
            暂无记录，复制一段文本后会自动出现在这里。
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <article key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-gray-800 whitespace-pre-wrap break-words leading-6">
                      {item.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span>{formatDateTime(item.created_at)}</span>
                      <span className="uppercase tracking-wide">{item.source || 'system'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(item)}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border border-gray-200 bg-gray-50 text-gray-600 hover:bg-white hover:text-gray-900 disabled:opacity-50 rounded transition-colors"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === item.id ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-[12px] border border-gray-200 bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 rounded transition-colors"
                      aria-label="删除记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
