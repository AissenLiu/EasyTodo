'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Calendar as CalendarIcon, Sparkles, Copy, Check, Settings, Save, X, Edit2, Eye, Trash2, ChevronLeft } from 'lucide-react';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
};

type TaskGroup = {
  date: string;
  tasks: Task[];
};

type Report = {
  id: string;
  content: string;
  report_type: 'daily' | 'weekly';
  report_date: string; 
  created_at: string;
};

function parseChinaDateStr(str: string): Date | null {
  const match = str.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const getWeekRange = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(d.setDate(start.getDate() + 6));
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatDateKey = (date: Date, type: 'daily' | 'weekly') => {
  if (type === 'daily') return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const { start } = getWeekRange(date);
  return `W-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
};

export default function SummaryPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const [allTaskGroups, setAllTaskGroups] = useState<TaskGroup[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Prompt Settings
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [prompts, setPrompts] = useState({
    daily: '请根据以下任务列表，生成一份专业的工作日报。包含已完成工作、未完成工作以及明日计划。',
    weekly: '请根据以下任务列表，生成一份专业的工作周报。包含本周已完成工作、未完成工作以及下周重点计划。'
  });
  const [tempPrompts, setTempPrompts] = useState(prompts);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(setAllTaskGroups)
      .catch(console.error);

    const localPrompts = localStorage.getItem('focusflow_prompts');
    if (localPrompts) {
      try {
        const parsed = JSON.parse(localPrompts);
        setPrompts(parsed);
        setTempPrompts(parsed);
      } catch {}
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports?type=${reportType}`);
      const data = await res.json();
      setReports(data);
    } catch (e) {
      console.error(e);
    }
  }, [reportType]);

  useEffect(() => {
    fetchReports();
    setSelectedReportId(null);
    setGeneratedReportText('');
    setIsEditing(false);
  }, [reportType, fetchReports]);

  const selectedReport = useMemo(() => reports.find(r => r.id === selectedReportId) || null, [reports, selectedReportId]);

  useEffect(() => {
    if (selectedReport && !isGenerating) {
      setGeneratedReportText(selectedReport.content);
    }
  }, [selectedReport, isGenerating]);

  // Compute tasks for "Today" or "This Week"
  const currentTasks = useMemo(() => {
    const flatTasks: (Task & { parsedDate: Date })[] = [];
    allTaskGroups.forEach(group => {
      const d = parseChinaDateStr(group.date);
      if (!d) return;
      group.tasks.forEach(t => flatTasks.push({ ...t, parsedDate: d }));
    });

    const now = new Date();
    if (reportType === 'daily') {
      return flatTasks.filter(t => t.parsedDate.toDateString() === now.toDateString());
    } else {
      const { start, end } = getWeekRange(now);
      return flatTasks.filter(t => t.parsedDate >= start && t.parsedDate <= end);
    }
  }, [reportType, allTaskGroups]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedReportText('');
    setGenerateError('');
    setSelectedReportId(null);
    setIsEditing(false);

    const now = new Date();
    const dateStr = reportType === 'daily'
      ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
      : (() => {
          const { start, end } = getWeekRange(now);
          return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
        })();
    const reportDateKey = formatDateKey(now, reportType);

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: currentTasks,
          reportType,
          dateStr,
          prompt: reportType === 'daily' ? prompts.daily : prompts.weekly,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json.error) throw new Error(json.error);
              if (json.content) {
                fullText += json.content;
                setGeneratedReportText(fullText);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                throw parseErr;
              }
            }
          }
        }
      }

      // Auto save
      const saveRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fullText,
          report_type: reportType,
          report_date: reportDateKey
        })
      });
      const savedReport = await saveRes.json();
      
      await fetchReports();
      setSelectedReportId(savedReport.id);

    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '生成时发生错误');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedReport) {
        // if updating a newly generated one that didn't automatically save? Should be saved already.
        // But let's handle if it was manually triggered or somehow missing id.
        return;
    }
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generatedReportText,
          report_type: selectedReport.report_type,
          report_date: selectedReport.report_date
        })
      });
      setIsEditing(false);
      setSaved(true);
      await fetchReports();
      setTimeout(() => setSaved(false), 2000);
    } catch(e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (selectedReportId === id) {
        setSelectedReportId(null);
        setGeneratedReportText('');
      }
      await fetchReports();
    } catch(e) {
      console.error(e);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePrompts = () => {
    setPrompts(tempPrompts);
    localStorage.setItem('focusflow_prompts', JSON.stringify(tempPrompts));
    setIsPromptModalOpen(false);
  };

  return (
    <div className="flex-1 flex w-full h-full bg-white relative">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-8 pt-8 pb-8 flex flex-col min-h-full">
          
          {/* Header */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-2">工作总结</h1>
              <p className="text-[13px] text-gray-400">基于您的每日和每周任务完成情况，利用大模型自动为您生成工作报告。</p>
            </div>
            <button 
              onClick={() => {
                setTempPrompts(prompts);
                setIsPromptModalOpen(true);
              }} 
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-white hover:text-gray-900 transition-colors shadow-sm"
            >
              <Settings className="w-4 h-4" />
              提示词设置
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex border border-gray-200 bg-gray-50 p-1 w-fit">
              <button 
                onClick={() => setReportType('daily')} 
                className={`flex items-center gap-2 px-6 py-2 text-[13px] font-medium transition-colors ${reportType === 'daily' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}
              >
                <FileText className="w-4 h-4" />
                日报记录
              </button>
              <button 
                onClick={() => setReportType('weekly')} 
                className={`flex items-center gap-2 px-6 py-2 text-[13px] font-medium transition-colors ${reportType === 'weekly' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 border border-transparent'}`}
              >
                <CalendarIcon className="w-4 h-4" />
                周报记录
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 bg-white border border-gray-200 shadow-sm min-h-[500px]">
            {(!selectedReportId && !isGenerating) ? (
              // LIST VIEW
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center shrink-0">
                  <h2 className="text-[14px] font-bold text-gray-900">
                    {reportType === 'daily' ? '历史日报' : '历史周报'}
                  </h2>
                  <button
                    onClick={handleGenerate}
                    disabled={currentTasks.length === 0}
                    className="flex items-center gap-2 bg-gray-900 text-white py-1.5 px-4 text-[13px] font-medium rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    生成{reportType === 'daily' ? '今日日报' : '本周周报'}
                  </button>
                </div>
                
                {currentTasks.length === 0 && (
                  <div className="px-4 py-3 bg-blue-50/50 border-b border-gray-100 text-[12px] text-blue-600 flex items-center justify-center">
                    当前周期内暂无待办任务，无法生成新的总结
                  </div>
                )}

                <div className="flex-1 overflow-y-auto w-full">
                  {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-12">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <div className="text-[13px]">暂无历史记录</div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {reports.map((report) => (
                        <div 
                          key={report.id}
                          onClick={() => {
                            setSelectedReportId(report.id);
                            setIsEditing(false);
                          }}
                          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex flex-col flex-1 pr-6 min-w-0">
                            <h3 className="text-[14px] font-bold text-gray-900 mb-1.5">
                              {report.report_date.startsWith('W-') ? '周报: ' + report.report_date.replace('W-', '') : '日报: ' + report.report_date}
                            </h3>
                            <p className="text-[13px] text-gray-500 line-clamp-1 break-all">
                              {report.content.substring(0, 150).replace(/\n/g, ' ')}...
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReportId(report.id);
                                setIsEditing(true);
                              }}
                              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 rounded shadow-sm transition-all"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, report.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-white border border-transparent hover:border-red-100 rounded shadow-sm transition-all"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // DETAIL VIEW (Either viewing an existing report or generating a new one)
              <div className="flex-1 flex flex-col relative bg-white min-w-0">
                <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        if (isEditing && generatedReportText !== selectedReport?.content) {
                          if (confirm('有未保存的修改，确定要返回吗？')) {
                            setSelectedReportId(null);
                            setGeneratedReportText('');
                          }
                        } else {
                          setSelectedReportId(null);
                          setGeneratedReportText('');
                        }
                      }}
                      disabled={isGenerating}
                      className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      返回列表
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <h3 className="text-[14px] font-bold text-gray-900">
                      {selectedReport ? (
                          selectedReport.report_date.startsWith('W-') ? '周报详情: ' + selectedReport.report_date.replace('W-', '') : '日报详情: ' + selectedReport.report_date
                      ) : isGenerating ? 'AI 正在生成总结...' : '记录详情'}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(generatedReportText || selectedReport) && !isGenerating && (
                      <>
                        <button 
                          onClick={() => setIsEditing(!isEditing)}
                          className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 border border-gray-200 shadow-sm hover:shadow rounded"
                        >
                          {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                          {isEditing ? '预览' : '编辑'}
                        </button>
                        {isEditing && (
                          <button 
                              onClick={handleSave}
                              className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 border border-gray-200 shadow-sm hover:shadow rounded"
                          >
                              {saved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                              {saved ? '保存成功' : '保存修改'}
                          </button>
                        )}
                        <button 
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 text-[12px] text-gray-600 hover:text-gray-900 transition-colors bg-white px-3 py-1.5 border border-gray-200 shadow-sm hover:shadow rounded"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? '已复制' : '复制内容'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 p-8 overflow-y-auto w-full relative">
                  {generateError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-100 text-[13px] text-red-600 rounded">
                      ⚠️ {generateError}
                      {generateError.includes('API') && (
                        <a href="/settings" className="ml-2 underline font-medium">去设置页面配置</a>
                      )}
                    </div>
                  )}
                  
                  {generatedReportText ? (
                    isEditing ? (
                      <textarea
                        value={generatedReportText}
                        onChange={(e) => setGeneratedReportText(e.target.value)}
                        className="w-full h-full min-h-[500px] bg-transparent resize-none focus:outline-none text-[14px] leading-relaxed text-gray-700 font-mono"
                        placeholder="输入内容..."
                      />
                    ) : (
                      <div className="prose prose-sm prose-gray max-w-none text-[14px] leading-relaxed text-gray-700">
                        <ReactMarkdown>{generatedReportText}</ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <div className="w-12 h-12 border-4 border-gray-100 border-t-gray-400 rounded-full animate-spin mb-4" />
                      <p className="text-[14px] font-medium text-gray-500">
                          AI 正在努力生成中，请不要离开页面...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Settings Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 shadow-xl w-full max-w-2xl flex flex-col rounded overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                提示词设置
              </h2>
              <button 
                onClick={() => setIsPromptModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">日报生成提示词</label>
                <p className="text-[12px] text-gray-500 mb-3">AI 将使用此提示词结合您当天的任务生成日报。</p>
                <textarea
                  value={tempPrompts.daily}
                  onChange={(e) => setTempPrompts(prev => ({ ...prev, daily: e.target.value }))}
                  className="w-full h-32 p-3 text-[13px] text-gray-700 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:border-gray-400 focus:outline-none resize-none transition-colors"
                  placeholder="输入日报提示词..."
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">周报生成提示词</label>
                <p className="text-[12px] text-gray-500 mb-3">AI 将使用此提示词结合您本周的任务生成周报。</p>
                <textarea
                  value={tempPrompts.weekly}
                  onChange={(e) => setTempPrompts(prev => ({ ...prev, weekly: e.target.value }))}
                  className="w-full h-32 p-3 text-[13px] text-gray-700 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:border-gray-400 focus:outline-none resize-none transition-colors"
                  placeholder="输入周报提示词..."
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSavePrompts}
                className="px-6 py-2 text-[13px] font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
