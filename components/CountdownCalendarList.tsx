'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildCountdownRemainingText,
  type CountdownRecord,
} from '@/lib/countdowns';
import { useNow } from '@/hooks/useNow';

type CountdownListItem = CountdownRecord & {
  next_due_at: string | null;
  next_due_text: string;
  remaining_text: string;
};

type CountdownCalendarListProps = {
  items?: CountdownListItem[];
  limit?: number;
  title?: string;
  className?: string;
};

export default function CountdownCalendarList({
  items,
  limit = 5,
  title = '倒计时',
  className = '',
}: CountdownCalendarListProps) {
  const now = useNow('second');
  const [list, setList] = useState<CountdownListItem[]>([]);
  const [loading, setLoading] = useState(items === undefined);

  useEffect(() => {
    if (items) {
      setList(items.slice(0, limit));
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/countdowns?activeOnly=1&limit=${limit}`);
        const data = await res.json();
        if (mounted) {
          setList(Array.isArray(data) ? data : []);
        }
      } catch {
        if (mounted) {
          setList([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 30 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [items, limit]);

  const displayList = useMemo(
    () =>
      list.slice(0, limit).map((item) => ({
        ...item,
        remaining_text: buildCountdownRemainingText(item.next_due_at, item.display_unit, now),
      })),
    [list, limit, now]
  );

  return (
    <section className={`mt-8 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-bold tracking-widest text-gray-500">{title}</h3>
        <span className="text-[11px] text-gray-400">{list.length} 条</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded border border-gray-100 bg-gray-50/40 px-3 py-4 text-center text-[12px] text-gray-400">
            加载中...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded border border-gray-100 bg-gray-50/40 px-3 py-4 text-center text-[12px] text-gray-400">
            暂无倒计时
          </div>
        ) : (
          displayList.map((item) => (
            <div key={item.id} className="rounded border border-gray-100 bg-gray-50/40 px-3 py-2.5">
              <div className="mb-1 truncate text-[13px] font-semibold text-gray-800">{item.name}</div>
              <div className="text-[11px] text-gray-500">下次到期：{item.next_due_text || '--'}</div>
              <div className="text-[11px] text-gray-400">{item.remaining_text || '无到期时间'}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
