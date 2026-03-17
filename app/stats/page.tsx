'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, LineChart as LineChartIcon, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  created_at?: string;
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

const CustomTooltip = ({ active, payload, label, taskStatus }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string; taskStatus?: string }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, e) => s + e.value, 0);
  return (
    <div className="bg-white border border-gray-200 p-3 shadow-sm text-[12px] font-medium min-w-[120px]">
      <p className="mb-2 text-gray-500">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-700">{entry.name}</span>
          </div>
          <span className="text-gray-900">{entry.value}</span>
        </div>
      ))}
      {taskStatus === 'all' && payload.length > 1 && (
        <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-gray-100">
          <span className="text-gray-700 font-bold">总计</span>
          <span className="text-gray-900 font-bold">{total}</span>
        </div>
      )}
    </div>
  );
};

export default function StatsPage() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [taskStatus, setTaskStatus] = useState<'all' | 'completed' | 'uncompleted'>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTaskGroups, setAllTaskGroups] = useState<TaskGroup[]>([]);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setAllTaskGroups(data))
      .catch(console.error);
  }, []);

  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(d.setDate(start.getDate() + 6));
    return { start, end };
  };

  const formatDate = (date: Date) =>
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

  const formatMonth = (date: Date) =>
    `${date.getFullYear()}年${date.getMonth() + 1}月`;

  const getDateDisplay = () => {
    if (timeRange === 'daily') return formatDate(currentDate);
    if (timeRange === 'weekly') {
      const { start, end } = getWeekRange(currentDate);
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    return formatMonth(currentDate);
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (timeRange === 'daily') d.setDate(d.getDate() - 1);
    if (timeRange === 'weekly') d.setDate(d.getDate() - 7);
    if (timeRange === 'monthly') d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (timeRange === 'daily') d.setDate(d.getDate() + 1);
    if (timeRange === 'weekly') d.setDate(d.getDate() + 7);
    if (timeRange === 'monthly') d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => setCurrentDate(new Date());

  const getTodayLabel = () => {
    if (timeRange === 'daily') return '回到今天';
    if (timeRange === 'weekly') return '回到本周';
    return '回到本月';
  };

  const isCurrentPeriod = useMemo(() => {
    const today = new Date();
    if (timeRange === 'daily') return currentDate.toDateString() === today.toDateString();
    if (timeRange === 'weekly') {
      const cw = getWeekRange(currentDate);
      const tw = getWeekRange(today);
      return cw.start.toDateString() === tw.start.toDateString();
    }
    return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  }, [currentDate, timeRange]);

  const rawData = useMemo(() => {
    const allTasks: { completed: boolean; date: Date; createdAt: Date | null }[] = [];
    allTaskGroups.forEach(group => {
      const d = parseChinaDateStr(group.date);
      if (!d) return;
      group.tasks.forEach(t => {
        const createdAt = t.created_at ? new Date(t.created_at) : null;
        allTasks.push({ completed: t.completed, date: d, createdAt });
      });
    });

    if (timeRange === 'daily') {
      // 按 24 小时分桶
      return Array.from({ length: 24 }, (_, hour) => {
        const label = `${hour}:00`;
        const hourTasks = allTasks.filter(t => {
          if (t.date.toDateString() !== currentDate.toDateString()) return false;
          // 没有 created_at 的任务归入 0 时
          if (!t.createdAt) return hour === 0;
          const h = t.createdAt.getHours();
          return h === hour;
        });
        return {
          time: label,
          completed: hourTasks.filter(t => t.completed).length,
          uncompleted: hourTasks.filter(t => !t.completed).length,
        };
      });
    } else if (timeRange === 'weekly') {
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      const { start } = getWeekRange(currentDate);
      return days.map((day, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dayTasks = allTasks.filter(t => t.date.toDateString() === d.toDateString());
        return { time: `${day} ${d.getMonth() + 1}/${d.getDate()}`, completed: dayTasks.filter(t => t.completed).length, uncompleted: dayTasks.filter(t => !t.completed).length };
      });
    } else {
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
        const dayTasks = allTasks.filter(t => t.date.toDateString() === d.toDateString());
        return { time: `${i + 1}日`, completed: dayTasks.filter(t => t.completed).length, uncompleted: dayTasks.filter(t => !t.completed).length };
      });
    }
  }, [timeRange, currentDate, allTaskGroups]);

  const data = useMemo(() => rawData.map(item => ({
    ...item,
    tasks: taskStatus === 'all' ? item.completed + item.uncompleted :
           taskStatus === 'completed' ? item.completed : item.uncompleted
  })), [rawData, taskStatus]);

  const totalTasks = data.reduce((s, i) => s + i.tasks, 0);
  const maxTasks = Math.max(...data.map(i => i.tasks), 0);
  const chartGridColor = 'var(--color-gray-100)';
  const chartAxisColor = 'var(--color-gray-400)';
  const chartCursorColor = 'var(--color-gray-50)';
  const completedColor = 'var(--color-emerald-500)';
  const uncompletedColor = 'var(--color-gray-400)';



  return (
    <div className="flex-1 flex w-full h-full bg-white relative">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-12 pt-12 pb-12 flex flex-col min-h-full">

          {/* Header */}
          <div className="flex items-end justify-between mb-12">
            <div>
              <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-2">统计看板</h1>
              <p className="text-[13px] text-gray-400">查看您的任务完成趋势与效率分析</p>
            </div>
            <div className="text-right">
              <div className="text-[32px] font-black leading-none">{totalTasks}</div>
              <div className="text-[11px] text-gray-400 tracking-widest uppercase mt-1">
                {taskStatus === 'all' ? '总计任务' : taskStatus === 'completed' ? '已完成任务' : '未完成任务'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-8 border-b border-gray-200">
            <div className="flex">
              {(['daily', 'weekly', 'monthly'] as const).map((r, _, arr) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`px-6 py-3 text-[14px] font-medium transition-colors border-b-2 -mb-[1px] ${timeRange === r ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-900'}`}>
                  {r === 'daily' ? '天' : r === 'weekly' ? '周' : '月'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 pb-2">
              <div className="flex items-center gap-2 mr-2">
                <div className="flex items-center gap-1 border border-gray-200 bg-gray-50 p-0.5">
                  <button onClick={handlePrev} className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-500 hover:text-gray-900 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                  <div className="flex items-center gap-2 text-[12px] font-medium text-gray-700 min-w-[160px] justify-center px-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />{getDateDisplay()}
                  </div>
                  <button onClick={handleNext} className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-500 hover:text-gray-900 transition-all"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <button onClick={handleToday} disabled={isCurrentPeriod}
                  className={`px-3 py-1 text-[12px] font-medium border transition-colors ${isCurrentPeriod ? 'text-gray-400 bg-gray-50 border-transparent cursor-not-allowed' : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-white hover:text-gray-900'}`}>
                  {getTodayLabel()}
                </button>
              </div>
              <div className="flex border border-gray-200 bg-gray-50 p-0.5">
                {(['all', 'completed', 'uncompleted'] as const).map(s => (
                  <button key={s} onClick={() => setTaskStatus(s)}
                    className={`px-4 py-1 text-[12px] font-medium transition-colors ${taskStatus === s ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>
                    {s === 'all' ? '全部' : s === 'completed' ? '已完成' : '未完成'}
                  </button>
                ))}
              </div>
              <div className="flex border border-gray-200 bg-gray-50 p-0.5">
                <button onClick={() => setChartType('bar')}
                  className={`p-1 transition-colors ${chartType === 'bar' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button onClick={() => setChartType('line')}
                  className={`p-1 transition-colors ${chartType === 'line' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}>
                  <LineChartIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 min-h-[400px] w-full border border-gray-200 p-8 bg-white">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-[13px] font-bold text-gray-900">任务数量趋势</h3>
              <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 border border-gray-200">峰值: {maxTasks}</span>
            </div>
            {totalTasks === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-gray-400 text-[13px]">
                当前时间段暂无任务数据，先去添加一些待办吧
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartAxisColor }} dy={10} interval={timeRange === 'daily' ? 2 : timeRange === 'monthly' ? 2 : 0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartAxisColor }} allowDecimals={false} />
                      <Tooltip cursor={{ fill: chartCursorColor }} content={<CustomTooltip taskStatus={taskStatus} />} />
                      {taskStatus !== 'uncompleted' && <Bar dataKey="completed" name="已完成" stackId="a" fill={completedColor} radius={0} barSize={timeRange === 'monthly' ? 12 : timeRange === 'daily' ? 16 : 32} />}
                      {taskStatus !== 'completed' && <Bar dataKey="uncompleted" name="未完成" stackId="a" fill={uncompletedColor} radius={0} barSize={timeRange === 'monthly' ? 12 : timeRange === 'daily' ? 16 : 32} />}
                    </BarChart>
                  ) : (
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartAxisColor }} dy={10} interval={timeRange === 'daily' ? 2 : timeRange === 'monthly' ? 2 : 0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartAxisColor }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip taskStatus={taskStatus} />} />
                      {taskStatus !== 'uncompleted' && <Line type="monotone" dataKey="completed" name="已完成" stroke={completedColor} strokeWidth={2} dot={{ r: 3, fill: completedColor, strokeWidth: 0 }} activeDot={{ r: 5, fill: completedColor, strokeWidth: 0 }} />}
                      {taskStatus !== 'completed' && <Line type="monotone" dataKey="uncompleted" name="未完成" stroke={uncompletedColor} strokeWidth={2} dot={{ r: 3, fill: uncompletedColor, strokeWidth: 0 }} activeDot={{ r: 5, fill: uncompletedColor, strokeWidth: 0 }} />}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
