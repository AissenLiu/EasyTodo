'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript';
import { useNow } from '@/hooks/useNow';
import CountdownCalendarList from '@/components/CountdownCalendarList';

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

type TaskGroup = {
  date: string;
  tasks: Task[];
};

function parseChinaDateStr(str: string): Date | null {
  const match = str.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export default function RightSidebar({ 
  onSearch,
  selectedDate,
  onSelectDate 
}: { 
  onSearch?: (q: string) => void,
  selectedDate?: Date | null,
  onSelectDate?: (d: Date | null) => void 
}) {
  const now = useNow();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch tasks to know which days have tasks (for dot indicators)
  useEffect(() => {
    fetch('/api/tasks')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || '加载任务失败');
        }
        setTaskGroups(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error(error);
        setTaskGroups([]);
      });
  }, []);

  useEffect(() => {
    setCalendarDate(prev => {
      const isViewingCurrentMonth =
        prev.getFullYear() === now.getFullYear() &&
        prev.getMonth() === now.getMonth();

      return isViewingCurrentMonth ? new Date(now.getFullYear(), now.getMonth(), 1) : prev;
    });
  }, [now]);

  // Compute which dates in current view have tasks
  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    (Array.isArray(taskGroups) ? taskGroups : []).forEach(group => {
      const d = parseChinaDateStr(group.date);
      if (d) set.add(d.toDateString());
    });
    return set;
  }, [taskGroups]);

  const days = ['一', '二', '三', '四', '五', '六', '日'];

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const jsFirstDay = new Date(year, month, 1).getDay();
    // jsFirstDay: 0=Sun, 1=Mon, ..., 6=Sat
    // We want 0=Mon, 1=Tue, ..., 6=Sun
    const firstDay = jsFirstDay === 0 ? 6 : jsFirstDay - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: number; month: 'prev' | 'current' | 'next'; fullDate: Date }[] = [];

    // Previous month overflow
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({ date: d, month: 'prev', fullDate: new Date(year, month - 1, d) });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: i, month: 'current', fullDate: new Date(year, month, i) });
    }
    // Next month overflow to fill 6 rows max
    let next = 1;
    while (cells.length < 42) {
      cells.push({ date: next++, month: 'next', fullDate: new Date(year, month + 1, next - 1) });
    }

    return cells;
  }, [calendarDate]);

  const prevMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const monthLabel = `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月`;

  return (
    <aside className="w-72 bg-white flex flex-col h-screen sticky top-0 p-6 overflow-y-auto">
      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索任务并回车..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (e.target.value === '' && onSearch) onSearch('');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && onSearch) onSearch(searchQuery);
          }}
          className="w-full bg-gray-50/50 border border-gray-200 py-2.5 pl-9 pr-4 text-[13px] focus:outline-none focus:bg-white focus:border-gray-300 transition-all placeholder:text-gray-400 text-gray-900 rounded"
        />
      </div>

      {/* Calendar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[15px] font-bold text-gray-900">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCalendarDate(new Date())}
                className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              >
                今天
              </button>
              <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-[12px]">
            {days.map(day => (
              <div key={day} className="text-gray-400 font-medium pb-2">{day}</div>
            ))}
            {calendarCells.map((cell, i) => {
              const isToday = cell.fullDate.toDateString() === now.toDateString();
              const isCurrentMonth = cell.month === 'current';
              const hasTask = datesWithTasks.has(cell.fullDate.toDateString()) && isCurrentMonth;

              const solar = Solar.fromYmd(cell.fullDate.getFullYear(), cell.fullDate.getMonth() + 1, cell.fullDate.getDate());
              const lunar = Lunar.fromSolar(solar);
              const holiday = HolidayUtil.getHoliday(solar.getYear(), solar.getMonth(), solar.getDay());

              // Determine secondary text
              let lunarText = lunar.getDayInChinese();
              let lunarColor = isCurrentMonth ? 'text-gray-400' : 'text-gray-200';
              
              const jieQi = lunar.getJieQi();
              const festivals = [...solar.getFestivals(), ...lunar.getFestivals()];
              const mainFestival = festivals[0];

              if (mainFestival) {
                lunarText = mainFestival.length > 3 ? mainFestival.substring(0, 3) : mainFestival;
                lunarColor = isCurrentMonth ? 'text-blue-500' : 'text-blue-200';
              } else if (jieQi) {
                lunarText = jieQi;
                lunarColor = isCurrentMonth ? 'text-emerald-500' : 'text-emerald-200';
              } else if (lunar.getDay() === 1) {
                lunarText = lunar.getMonthInChinese() + '月';
              }

              const isSelected = selectedDate ? selectedDate.toDateString() === cell.fullDate.toDateString() : false;

              return (
                <div 
                  key={i} 
                  onClick={() => {
                    if (isCurrentMonth && onSelectDate) {
                      onSelectDate(isSelected ? null : cell.fullDate);
                    }
                  }}
                  className={`flex flex-col items-center justify-start h-10 w-full relative pt-1 rounded-md transition-colors ${
                    isCurrentMonth ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isSelected ? 'bg-gray-100 ring-1 ring-gray-200' : ''}`}
                >
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[13px] ${
                    isToday
                      ? 'bg-gray-900 text-white font-bold shadow-sm'
                      : isSelected 
                      ? 'text-gray-900 font-bold'
                      : isCurrentMonth
                      ? 'text-gray-800'
                      : 'text-gray-300'
                  }`}>
                    {cell.date}
                  </span>
                  
                  <span className={`text-[9px] mt-[1px] transform scale-90 ${lunarColor}`}>
                    {lunarText}
                  </span>

                  {/* Holiday / Workday Badge */}
                  {holiday && isCurrentMonth && (
                    <span className={`absolute -top-0.5 -right-0.5 text-[8px] transform scale-75 ${
                      holiday.isWork() ? 'text-gray-500' : 'text-red-500'
                    }`}>
                      {holiday.isWork() ? '班' : '休'}
                    </span>
                  )}

                  {hasTask && !isToday && (
                    <span className="absolute bottom-0 w-1 h-1 rounded-full bg-gray-400" />
                  )}
                </div>
              );
            })}
          </div>

          <CountdownCalendarList limit={4} />
    </aside>
  );
}
