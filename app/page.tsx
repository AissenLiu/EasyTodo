'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Bell, Bot as BotIcon, Monitor } from 'lucide-react';
import { useCommands } from '@/hooks/useCommands';
import RightSidebar from '@/components/RightSidebar';
import ReminderModal, { TaskReminderData, ReminderType } from '@/components/ReminderModal';
import { Bot as BotType } from '@/components/BotEditor';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  sort_order?: number;
  reminder_time?: string | null;
  reminder_type?: ReminderType | null;
  bot_id?: string | null;
  bot_mentions?: string | null;
  bot_mention_all?: boolean;
  bot_custom_message?: string | null;
  is_reminded?: boolean;
  is_pinned?: boolean;
  tag_text?: string | null;
  tag_color?: string | null;
};

type TaskGroup = {
  date: string;
  tasks: Task[];
};

export default function Home() {
  const [newTaskText, setNewTaskText] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const { commands } = useCommands();
  const inputContainerRef = useRef<HTMLDivElement>(null);
  
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [dateStr, setDateStr] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Drag and drop state — use groupDate+taskId for stable identification
  const [draggedItem, setDraggedItem] = useState<{ groupDate: string; taskId: string } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    groupIdx: number;
    taskId: string;
  } | null>(null);

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Tag modal state
  const [activeTagTask, setActiveTagTask] = useState<{ groupIdx: number, taskId: string, text: string, color: string } | null>(null);

  // Reminder state
  const [activeReminderTask, setActiveReminderTask] = useState<{ groupIdx: number, taskId: string } | null>(null);
  
  // Ref for the latest taskGroups to avoid stale closures in setTimeout/setInterval/events
  const taskGroupsRef = useRef(taskGroups);
  const dragTargetRef = useRef<{ groupDate: string; taskId: string } | null>(null);
  
  // Update ref on taskGroups change
  useEffect(() => {
    taskGroupsRef.current = taskGroups;
  }, [taskGroups]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTaskGroups(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Background Reminder Checker
  useEffect(() => {
    let allBots: BotType[] = [];
    fetch('/api/bots').then(res => res.json()).then(data => allBots = data).catch(() => {});

    const interval = setInterval(() => {
      const now = new Date();
      const currentGroups = [...taskGroupsRef.current];
      let needsStateUpdate = false;

      currentGroups.forEach(group => {
        group.tasks.forEach(task => {
          if (task.completed || task.is_reminded || !task.reminder_time || task.reminder_type === 'none' || !task.reminder_type) return;

          const reminderTime = new Date(task.reminder_time);
          if (now >= reminderTime) {
            // Trigger Reminder!
            task.is_reminded = true;
            needsStateUpdate = true;
            
            // Execute Update API
            fetch(`/api/tasks/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_reminded: true }),
            });

            if (task.reminder_type === 'popup') {
              alert(`提醒： 您规划的任务 "${task.text}" (原定于 ${reminderTime.toLocaleTimeString()}) 时间到了！`);
            } else if (task.reminder_type === 'robot' && task.bot_id) {
              const bot = allBots.find(b => b.id === task.bot_id);
              if (bot && bot.webhook) {
                let mentionString = '';
                if (task.bot_mention_all) {
                  mentionString = '<at user_id="-1">所有人</at>';
                } else if (task.bot_mentions) {
                  const names = task.bot_mentions.split(/[,，\s]+/).filter(Boolean);
                  mentionString = names.map(n => `<at login_name="${n}">${n}</at>`).join('');
                }

                // If user provided a custom message, only use the custom message and mentions.
                // Otherwise use the default format.
                const fallbackMessageText = `【任务提醒】\n您有任务到期啦！\n任务内容：${task.text}\n计划时间：${reminderTime.toLocaleString()}`;
                const messageText = task.bot_custom_message && task.bot_custom_message.trim() 
                  ? task.bot_custom_message.trim() 
                  : fallbackMessageText;

                // Send custom robot message
                fetch(bot.webhook, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    msgtype: 'text',
                    text: {
                      content: `${messageText}${mentionString ? '\n' + mentionString : ''}`
                    }
                  })
                }).catch(console.error);
              }
            }
          }
        });
      });

      if (needsStateUpdate) {
        setTaskGroups(currentGroups);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTasks();
    const today = new Date();
    setDateStr(`${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setContextMenu(null);
      if (inputContainerRef.current && !inputContainerRef.current.contains(e.target as Node)) {
        setShowCommands(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingTaskId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingTaskId]);

  const toggleTask = async (groupIdx: number, taskId: string) => {
    const newGroups = [...taskGroups];
    const task = newGroups[groupIdx].tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      setTaskGroups(newGroups);
      
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: task.completed }),
        });
      } catch (e) {
        // Revert on error
        task.completed = !task.completed;
        setTaskGroups([...newGroups]);
      }
    }
  };

  // Helper: find actual index in taskGroups by groupDate
  const findGroupIdx = (groups: TaskGroup[], groupDate: string) => groups.findIndex(g => g.date === groupDate);

  const handleDragStart = (e: React.DragEvent, groupDate: string, taskId: string) => {
    setDraggedItem({ groupDate, taskId });
    dragTargetRef.current = { groupDate, taskId };
    e.dataTransfer.effectAllowed = 'move';
  };

  // handleDragOver: ONLY handles same-group reordering
  const handleDragOver = (e: React.DragEvent, targetGroupDate: string, targetTaskIdx: number) => {
    e.preventDefault();
    if (!dragTargetRef.current) return;

    const cur = dragTargetRef.current;
    // Only handle same-group reordering; cross-group handled by onDrop
    if (cur.groupDate !== targetGroupDate) return;

    const groups = taskGroupsRef.current;
    const gi = findGroupIdx(groups, cur.groupDate);
    if (gi === -1) return;

    const srcTi = groups[gi].tasks.findIndex(t => t.id === cur.taskId);
    if (srcTi === -1 || srcTi === targetTaskIdx) return;

    const newGroups = groups.map(g => ({ ...g, tasks: [...g.tasks] }));
    const [movedTask] = newGroups[gi].tasks.splice(srcTi, 1);
    newGroups[gi].tasks.splice(targetTaskIdx, 0, movedTask);

    taskGroupsRef.current = newGroups;
    setTaskGroups(newGroups);
  };

  // handleGroupDrop: handles CROSS-GROUP moves (including pin/unpin)
  const handleGroupDrop = async (e: React.DragEvent, targetGroupDate: string) => {
    e.preventDefault();
    if (!dragTargetRef.current) return;

    const cur = dragTargetRef.current;
    // If same group, nothing to do (reordering is handled by handleDragOver)
    if (cur.groupDate === targetGroupDate) return;

    const groups = taskGroupsRef.current;
    const srcGi = findGroupIdx(groups, cur.groupDate);
    if (srcGi === -1) return;

    const srcTi = groups[srcGi].tasks.findIndex(t => t.id === cur.taskId);
    if (srcTi === -1) return;

    const tgtGi = findGroupIdx(groups, targetGroupDate);
    if (tgtGi === -1) return;

    // Move task from source to target (append to end)
    const newGroups = groups.map(g => ({ ...g, tasks: [...g.tasks] }));
    const [movedTask] = newGroups[srcGi].tasks.splice(srcTi, 1);
    newGroups[tgtGi].tasks.push(movedTask);

    // Remove empty source group (except pinned group)
    if (newGroups[srcGi].tasks.length === 0 && newGroups[srcGi].date !== '置顶待办') {
      newGroups.splice(srcGi, 1);
    }

    // Clear drag state immediately — the re-render will destroy the original 
    // dragged DOM element, so onDragEnd will NOT fire. We must clean up here.
    dragTargetRef.current = null;
    taskGroupsRef.current = newGroups;
    setDraggedItem(null);
    setTaskGroups(newGroups);

    // Save to backend: update pin state + reorder
    const isPinning = targetGroupDate === '置顶待办';
    const tgtGiNew = newGroups.findIndex(g => g.date === targetGroupDate);
    const reorderUpdates = tgtGiNew >= 0 ? newGroups[tgtGiNew].tasks.map((t, idx) => ({
      id: t.id,
      date: targetGroupDate,
      sort_order: idx
    })) : [];

    try {
      await Promise.all([
        fetch(`/api/tasks/${cur.taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_pinned: isPinning }),
        }),
        reorderUpdates.length > 0 ? fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: reorderUpdates }),
        }) : Promise.resolve(),
      ]);
      fetchTasks();
    } catch {
      fetchTasks();
    }
  };

  const handleDragEnd = async () => {
    if (!dragTargetRef.current) {
      setDraggedItem(null);
      return;
    }

    const cur = dragTargetRef.current;
    const groups = taskGroupsRef.current;
    const tgtGi = findGroupIdx(groups, cur.groupDate);

    // Reset visual drag state
    dragTargetRef.current = null;
    setDraggedItem(null);

    if (tgtGi === -1) {
      fetchTasks();
      return;
    }

    const targetGroup = groups[tgtGi];
    const targetDate = targetGroup.date;

    // Save sort order for all tasks in the target group
    const updates = targetGroup.tasks.map((t, idx) => ({
      id: t.id,
      date: targetDate,
      sort_order: idx
    }));

    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      fetchTasks();
    } catch {
      fetchTasks();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, groupIdx: number, taskId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      groupIdx,
      taskId,
    });
  };

  const handleDeleteTask = async (groupIdx: number, taskId: string) => {
    const newGroups = [...taskGroups];
    const taskList = newGroups[groupIdx].tasks;
    const taskIndex = taskList.findIndex(t => t.id === taskId);
    const deletedTask = taskList[taskIndex];
    
    newGroups[groupIdx].tasks = taskList.filter(t => t.id !== taskId);
    // Remove group if empty
    if (newGroups[groupIdx].tasks.length === 0) {
      newGroups.splice(groupIdx, 1);
    }
    
    setTaskGroups(newGroups);

    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
      // Revert if API fails
    }
  };

  const startEditing = (groupIdx: number, taskId: string, currentText: string) => {
    setEditingTaskId(taskId);
    setEditTaskText(currentText);
  };

  const saveEdit = async (groupIdx: number, taskId: string) => {
    if (editTaskText.trim()) {
      const newGroups = [...taskGroups];
      const task = newGroups[groupIdx].tasks.find(t => t.id === taskId);
      if (task) {
        const oldText = task.text;
        task.text = editTaskText.trim();
        setTaskGroups(newGroups);
        
        try {
          await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: task.text }),
          });
        } catch (e) {
          task.text = oldText;
          setTaskGroups([...newGroups]);
        }
      }
    }
    setEditingTaskId(null);
  };

  const togglePin = async (groupIdx: number, taskId: string) => {
    const newGroups = [...taskGroups];
    const task = newGroups[groupIdx].tasks.find(t => t.id === taskId);
    if (task) {
      task.is_pinned = !task.is_pinned;

      // Re-fetch to seamlessly re-group based on the new backend structure
      // that puts it into the '置顶待办' group instead of local optimistic update.

      setTaskGroups(newGroups);
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_pinned: task.is_pinned }),
        });
        // We might want to re-fetch or re-sort right away
        fetchTasks();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveTag = async (groupIdx: number, taskId: string, tagText: string, tagColor: string) => {
    const newGroups = [...taskGroups];
    const task = newGroups[groupIdx].tasks.find(t => t.id === taskId);
    if (task) {
      task.tag_text = tagText;
      task.tag_color = tagColor;
      setTaskGroups(newGroups);
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_text: tagText || null, tag_color: tagColor || null }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    setActiveTagTask(null);
  };

  const handleSaveReminder = async (groupIdx: number, taskId: string, data: TaskReminderData) => {
    const newGroups = [...taskGroups];
    const task = newGroups[groupIdx].tasks.find(t => t.id === taskId);
    if (task) {
      task.reminder_time = data.reminder_time;
      task.reminder_type = data.reminder_type;
      task.bot_id = data.bot_id;
      task.bot_mentions = data.bot_mentions;
      task.bot_mention_all = data.bot_mention_all;
      task.bot_custom_message = data.bot_custom_message;
      task.is_reminded = false; // Reset reminded state when modified
      setTaskGroups(newGroups);
      
      try {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reminder_time: task.reminder_time,
            reminder_type: task.reminder_type,
            bot_id: task.bot_id,
            bot_mentions: task.bot_mentions,
            bot_mention_all: task.bot_mention_all,
            bot_custom_message: task.bot_custom_message,
            is_reminded: false
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
    setActiveReminderTask(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewTaskText(val);

    if (val.startsWith('/')) {
      // Only show dropdown while the user is still typing the command name
      // i.e., no space yet (they haven't started the argument part)
      const hasSpace = val.includes(' ');
      if (hasSpace) {
        // User is now typing the argument — hide the dropdown
        setShowCommands(false);
      } else {
        const matched = commands.filter(cmd =>
          cmd.name.toLowerCase().startsWith(val.toLowerCase())
        );
        setShowCommands(matched.length > 0);
        setSelectedCommandIndex(0);
      }
    } else {
      setShowCommands(false);
    }
  };

  const createTask = async (id: string, text: string, completed: boolean = false, createdAtOverride?: string) => {
    const groupDate = dateStr || '今天';
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text, completed, date: groupDate, sort_order: 0, created_at: createdAtOverride }),
      });
      return { id, text, completed };
    } catch(e) {
      console.error(e);
      return null;
    }
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only show commands for the part before any space
    const cmdPart = newTaskText.split(' ')[0];
    const visibleCommands = commands.filter(cmd =>
      cmd.name.toLowerCase().startsWith(cmdPart.toLowerCase())
    );

    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev + 1) % visibleCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev - 1 + visibleCommands.length) % visibleCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (visibleCommands[selectedCommandIndex]) {
          // Fill in the command name and add a space — user can then type their argument
          setNewTaskText(visibleCommands[selectedCommandIndex].name + ' ');
          setShowCommands(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommands(false);
        return;
      }
    }

    if (e.key === 'Enter' && newTaskText.trim() && !showCommands) {
      const text = newTaskText.trim();
      const groupDate = dateStr;
      
      const newGroups = [...taskGroups];
      let todayGroupIdx = newGroups.findIndex(g => g.date === groupDate);
      if (todayGroupIdx === -1) {
        newGroups.unshift({ date: groupDate, tasks: [] });
        todayGroupIdx = 0;
      }
      
      const parts = text.split(' ');
      const cmdName = parts[0];
      const arg = parts.slice(1).join(' ');
      
      const matchedCommand = commands.find(c => c.name === cmdName);
      
      setNewTaskText('');
      setShowCommands(false);
      
      if (matchedCommand) {
        // Pre-generate IDs to keep UI and DB in sync
        const now = Date.now();
        const createdTasks = matchedCommand.tasks.map((taskTemplate, idx) => ({
          id: `${now}-${idx}`,
          text: taskTemplate.replace(/\{arg\}/g, arg),
          completed: false,
        }));
        newGroups[todayGroupIdx].tasks.unshift(...createdTasks);
        setTaskGroups(newGroups);

        // Persist each task with an explicit created_at so they stay in A, B, C order (newest first = A first)
        for (let i = 0; i < createdTasks.length; i++) {
          const timestamp = new Date(now - i * 10).toISOString();
          await createTask(createdTasks[i].id, createdTasks[i].text, false, timestamp);
        }
        // Refresh to get accurate order from server
        fetchTasks();
      } else {
        const tempId = Date.now().toString();
        newGroups[todayGroupIdx].tasks.unshift({
          id: tempId,
          text: text,
          completed: false,
        });
        setTaskGroups(newGroups);
        await createTask(tempId, text, false);
      }
    }
  };

  // Show dropdown only when user is still typing the command name (no space yet)
  const visibleCommands = newTaskText.includes(' ')
    ? []
    : commands.filter(cmd =>
        cmd.name.toLowerCase().startsWith(newTaskText.toLowerCase()) && newTaskText.startsWith('/')
      );

  const displayedTaskGroups = useMemo(() => {
    let baseGroups = taskGroups;

    if (filterDate) {
      const targetStr = `${filterDate.getFullYear()} 年 ${filterDate.getMonth() + 1} 月 ${filterDate.getDate()} 日`;
      baseGroups = baseGroups.filter(g => g.date === targetStr || g.date === '置顶待办');
    }

    if (!globalSearchQuery.trim()) return baseGroups;
    const q = globalSearchQuery.toLowerCase();
    const result: TaskGroup[] = [];
    for (const group of baseGroups) {
      const matchedTasks = group.tasks.filter(t => t.text.toLowerCase().includes(q));
      if (matchedTasks.length > 0) {
        result.push({ date: group.date, tasks: matchedTasks });
      }
    }
    return result;
  }, [taskGroups, globalSearchQuery, filterDate]);

  return (
    <div className="flex-1 flex w-full h-full relative">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-12 pt-8 pb-12 flex flex-col min-h-full">
          {/* Input Area */}
          <div className="relative mb-8" ref={inputContainerRef}>
            <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 px-5 py-3 focus-within:bg-white focus-within:border-gray-300 focus-within:shadow-sm transition-all rounded">
              <Plus className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="需要做些什么？ (输入 / 使用快捷指令)"
                className="flex-1 text-[14px] bg-transparent focus:outline-none placeholder:text-gray-400 text-gray-900"
                value={newTaskText}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>
            
            {/* Command Suggestions Dropdown */}
            {showCommands && visibleCommands.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                {visibleCommands.map((cmd, index) => (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      setNewTaskText(cmd.name + ' ');
                      setShowCommands(false);
                      if (inputContainerRef.current) {
                        const input = inputContainerRef.current.querySelector('input');
                        input?.focus();
                      }
                    }}
                    className={`px-4 py-3 cursor-pointer flex flex-col gap-1 transition-colors ${
                      index === selectedCommandIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-gray-900">{cmd.name}</span>
                      <span className="text-[12px] text-gray-400">快捷指令</span>
                    </div>
                    {cmd.description && (
                      <span className="text-[12px] text-gray-500">{cmd.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="flex-1 space-y-8">
            {filterDate && (
              <div className="flex flex-col gap-1 mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-bold text-gray-900">
                    {filterDate.getFullYear()} 年 {filterDate.getMonth() + 1} 月 {filterDate.getDate()} 日 的待办
                  </h2>
                  <button 
                    onClick={() => setFilterDate(null)}
                    className="text-[12px] text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    显示全部
                  </button>
                </div>
              </div>
            )}

            {globalSearchQuery && displayedTaskGroups.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-[13px]">
                未找到与 &quot;{globalSearchQuery}&quot; 相关的任务
              </div>
            )}
            {displayedTaskGroups.map((group: TaskGroup, groupIdx: number) => (
              <div 
                key={group.date}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleGroupDrop(e, group.date)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCollapsedGroups(prev => {
                          const next = new Set(prev);
                          if (next.has(group.date)) {
                            next.delete(group.date);
                          } else {
                            next.add(group.date);
                          }
                          return next;
                        });
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 -ml-1"
                    >
                      <svg 
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsedGroups.has(group.date) ? '-rotate-90' : 'rotate-0'}`}
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    <h3 className={`text-[11px] font-bold tracking-widest uppercase ${group.date === '置顶待办' ? 'text-orange-500' : 'text-gray-400'}`}>
                      {group.date === '置顶待办' ? '📌 置顶待办' : group.date}
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-300 tracking-wider">
                    {group.tasks.length} 个任务
                  </span>
                </div>
                
                {!collapsedGroups.has(group.date) && (
                <div className="space-y-0.5">
                  {group.tasks.map((task: Task, taskIdx: number) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, group.date, task.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevent group container's onDragOver from overriding position
                        handleDragOver(e, group.date, taskIdx);
                      }}
                      onDragEnd={handleDragEnd}
                      onContextMenu={(e) => handleContextMenu(e, groupIdx, task.id)}
                      className={`flex items-center justify-between group cursor-grab active:cursor-grabbing py-2 px-3 -mx-3 hover:bg-gray-50/80 transition-colors ${
                        draggedItem?.groupDate === group.date && draggedItem?.taskId === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div 
                          onClick={() => toggleTask(groupIdx, task.id)}
                          className={`w-[18px] h-[18px] shrink-0 flex items-center justify-center border transition-all cursor-pointer ${
                            task.completed 
                              ? 'bg-gray-900 border-gray-900 text-white' 
                              : 'border-gray-300 bg-white group-hover:border-gray-400'
                          }`}
                        >
                          {task.completed && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        
                        {task.tag_text && !editingTaskId && (
                          <span 
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm whitespace-nowrap" 
                            style={{ backgroundColor: `${task.tag_color || '#e5e7eb'}80`, color: task.tag_color ? '#111827' : '#4b5563', border: `1px solid ${task.tag_color || '#e5e7eb'}` }}
                          >
                            {task.tag_text}
                          </span>
                        )}

                        {editingTaskId === task.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editTaskText}
                            onChange={(e) => setEditTaskText(e.target.value)}
                            onBlur={() => saveEdit(groupIdx, task.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(groupIdx, task.id);
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                            className="flex-1 text-[14px] bg-white border border-gray-200 px-2 py-1 focus:outline-none focus:border-gray-400"
                          />
                        ) : (
                          <span
                            onClick={() => toggleTask(groupIdx, task.id)}
                            className={`text-[14px] transition-colors cursor-pointer flex-1 ${
                              task.completed
                                ? 'text-gray-400'
                                : 'text-gray-700 group-hover:text-gray-900'
                            }`}
                          >
                            <span className="relative">
                              {task.text}
                              <span 
                                className={`absolute left-0 top-1/2 -translate-y-1/2 h-[1px] bg-current transition-all duration-300 ease-out ${
                                  task.completed ? 'w-full' : 'w-0'
                                }`} 
                              />
                            </span>
                          </span>
                        )}
                        {group.date !== '置顶待办' && task.is_pinned && (
                            <svg className="w-3 h-3 text-orange-500 shrink-0 ml-1 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M16 11.206L14.793 10H14v-5.5a.5.5 0 00-.5-.5h-3a.5.5 0 00-.5.5V10h-.793L8 11.206V14h3.5v6.5a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5V14H16v-2.794z" />
                            </svg>
                        )}
                      </div>
                      <div className={`flex items-center justify-end min-w-[124px] transition-opacity ml-4 pl-4 gap-2 ${task.reminder_time && task.reminder_type && task.reminder_type !== 'none' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {task.reminder_time && task.reminder_type && task.reminder_type !== 'none' && (
                          <div className="flex items-center gap-1.5 text-blue-500">
                            {task.reminder_type === 'robot' ? (
                              <span title="机器人消息推送"><BotIcon className="w-3.5 h-3.5" /></span>
                            ) : (
                              <span title="弹窗提醒"><Monitor className="w-3.5 h-3.5" /></span>
                            )}
                            <span className="text-[11px] font-medium whitespace-nowrap hidden sm:inline-block">
                              {new Date(task.reminder_time).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                              {' '}
                              {new Date(task.reminder_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => setActiveReminderTask({ groupIdx, taskId: task.id })}
                          className={`p-1 hover:bg-gray-200 transition-colors rounded ${task.reminder_type && task.reminder_type !== 'none' ? 'text-blue-500' : 'text-gray-400'}`}
                          title={task.reminder_time ? `提醒时间: ${new Date(task.reminder_time).toLocaleString()}` : "设置提醒"}
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <RightSidebar 
        onSearch={setGlobalSearchQuery} 
        selectedDate={filterDate}
        onSelectDate={setFilterDate}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-100 shadow-lg py-1 w-40 z-50 rounded"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const task = taskGroups[contextMenu.groupIdx].tasks.find(t => t.id === contextMenu.taskId);
              if (task) togglePin(contextMenu.groupIdx, task.id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className={`flex items-center gap-2 text-[13px] ${taskGroups[contextMenu.groupIdx]?.tasks.find(t => t.id === contextMenu.taskId)?.is_pinned ? 'text-orange-600' : 'text-gray-700'}`}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={taskGroups[contextMenu.groupIdx]?.tasks.find(t => t.id === contextMenu.taskId)?.is_pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M16 11.206L14.793 10H14v-5.5a.5.5 0 00-.5-.5h-3a.5.5 0 00-.5.5V10h-.793L8 11.206V14h3.5v6.5a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5V14H16v-2.794z" />
              </svg>
              {taskGroups[contextMenu.groupIdx]?.tasks.find(t => t.id === contextMenu.taskId)?.is_pinned ? '取消置顶' : '置顶待办'}
            </div>
          </button>
          
          <button
            onClick={() => {
              const task = taskGroups[contextMenu.groupIdx].tasks.find(t => t.id === contextMenu.taskId);
              if (task) {
                setActiveTagTask({ groupIdx: contextMenu.groupIdx, taskId: task.id, text: task.tag_text || '', color: task.tag_color || '#e2e8f0' });
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            更改标签
          </button>

          <div className="h-px bg-gray-100 my-1 mx-2"></div>
          
          <button
            onClick={() => {
              const task = taskGroups[contextMenu.groupIdx].tasks.find(t => t.id === contextMenu.taskId);
              if (task) startEditing(contextMenu.groupIdx, task.id, task.text);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            修改文字
          </button>
          <button
            onClick={() => {
              handleDeleteTask(contextMenu.groupIdx, contextMenu.taskId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除待办
          </button>
        </div>
      )}

      {/* Reminder Modal */}
      {activeReminderTask && (
        <ReminderModal
          isOpen={true}
          onClose={() => setActiveReminderTask(null)}
          initialData={taskGroups[activeReminderTask.groupIdx].tasks.find(t => t.id === activeReminderTask.taskId)}
          onSave={(data) => handleSaveReminder(activeReminderTask.groupIdx, activeReminderTask.taskId, data)}
        />
      )}

      {/* Tag Edit Modal */}
      {activeTagTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 shadow-xl w-full max-w-sm flex flex-col rounded overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-[14px] font-bold text-gray-900">设置标签</h2>
              <button onClick={() => setActiveTagTask(null)} className="text-gray-400 hover:text-gray-900">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">标签文字 (留空则清除标签)</label>
                <input 
                  type="text" 
                  value={activeTagTask.text} 
                  onChange={(e) => setActiveTagTask({...activeTagTask, text: e.target.value})}
                  className="w-full text-[13px] bg-white border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-gray-400"
                  placeholder="例如：提测、开发、紧急..."
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-2">选择标签颜色</label>
                <div className="flex flex-wrap gap-2">
                  {['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setActiveTagTask({...activeTagTask, color})}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${activeTagTask.color === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105 shadow-sm'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button 
                onClick={() => setActiveTagTask(null)} 
                className="px-4 py-1.5 text-[12px] text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded"
              >取消</button>
              <button 
                onClick={() => handleSaveTag(activeTagTask.groupIdx, activeTagTask.taskId, activeTagTask.text, activeTagTask.color)} 
                className="px-4 py-1.5 text-[12px] text-white bg-gray-900 hover:bg-gray-800 rounded"
              >保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
