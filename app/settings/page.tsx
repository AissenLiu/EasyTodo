'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ArrowLeft, Plus, Check, Save } from 'lucide-react';
import Link from 'next/link';
import { useCommands } from '@/hooks/useCommands';
import CommandEditor from '@/components/CommandEditor';
import BotEditor, { Bot } from '@/components/BotEditor';

const POPULAR_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'deepseek-chat',
  'deepseek-reasoner',
  'qwen-plus',
  'glm-4',
];

export default function SettingsPage() {
  const { commands, isLoaded, addCommand, updateCommand, deleteCommand } = useCommands();
  const [isAdding, setIsAdding] = useState(false);

  // Model settings state
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [modelSaved, setModelSaved] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Bot state
  const [bots, setBots] = useState<Bot[]>([]);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [isLoadedBots, setIsLoadedBots] = useState(false);

  // Load settings from API
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setApiBase(data.apiBase || 'https://api.openai.com/v1');
        setApiKey(data.apiKey || '');
        const loadedModel = data.model || 'gpt-4o';
        if (POPULAR_MODELS.includes(loadedModel)) {
          setModel(loadedModel);
          setIsCustomModel(false);
        } else {
          setModel('custom');
          setCustomModel(loadedModel);
          setIsCustomModel(true);
        }
        setIsLoadingSettings(false);
      })
      .catch(() => {
        setApiBase('https://api.openai.com/v1');
        setModel('gpt-4o');
        setIsLoadingSettings(false);
      });

    // Load bots from API
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        setBots(data);
        setIsLoadedBots(true);
      })
      .catch((e) => {
        console.error(e);
        setIsLoadedBots(true);
      });
  }, []);

  const handleSaveModelSettings = async () => {
    setIsSavingModel(true);
    const effectiveModel = isCustomModel ? customModel : model;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiBase, apiKey, model: effectiveModel }),
      });
      setModelSaved(true);
      setTimeout(() => setModelSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingModel(false);
    }
  };

  const addBot = async (b: Bot) => {
    try {
      await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      });
      setBots([...bots, b]);
    } catch(e) {}
  };

  const updateBot = async (id: string, b: Bot) => {
    try {
      await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      });
      setBots(bots.map(x => x.id === id ? b : x));
    } catch(e) {}
  };

  const deleteBot = async (id: string) => {
    try {
      await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      setBots(bots.filter(x => x.id !== id));
    } catch(e) {}
  };

  return (
    <div className="flex-1 flex min-h-0 flex-col overflow-y-auto bg-white">
      <div className="w-full max-w-3xl mx-auto px-12 py-16 flex flex-col min-h-full">
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 text-[13px] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">设置</h1>
          <p className="text-gray-400 text-[15px]">配置您的工作区和 AI 偏好。</p>
        </div>

        <div className="space-y-16">
          {/* Model Settings Section */}
          <div id="model-settings" className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-[13px] font-bold text-gray-500 tracking-widest">大模型设置</h2>
            </div>

            {isLoadingSettings ? (
              <div className="text-sm text-gray-400 animate-pulse">加载中...</div>
            ) : (
              <div className="space-y-10">
                <div>
                  <label className="block text-[13px] font-medium text-gray-400 mb-3">接口地址</label>
                  <input
                    type="text"
                    value={apiBase}
                    onChange={e => setApiBase(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full text-[15px] bg-transparent focus:outline-none placeholder:text-gray-200 text-gray-900 border-b border-gray-200 pb-2 focus:border-gray-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-400 mt-2">兼容 OpenAI API 格式的接口地址</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-400 mb-3">API 密钥</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full text-[15px] bg-transparent focus:outline-none placeholder:text-gray-200 text-gray-900 border-b border-gray-200 pb-2 focus:border-gray-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-400 mt-2">密钥仅存储在本地数据库中，不会上传到任何服务器</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-400 mb-3">模型</label>
                  <div className="relative mb-3">
                    <select
                      value={isCustomModel ? 'custom' : model}
                      onChange={e => {
                        if (e.target.value === 'custom') {
                          setIsCustomModel(true);
                          setModel('custom');
                        } else {
                          setIsCustomModel(false);
                          setModel(e.target.value);
                        }
                      }}
                      className="w-full text-[15px] bg-transparent focus:outline-none appearance-none cursor-pointer text-gray-900 border-b border-gray-200 pb-2 focus:border-gray-500 transition-colors"
                    >
                      {POPULAR_MODELS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="custom">自定义模型...</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                  {isCustomModel && (
                    <input
                      type="text"
                      value={customModel}
                      onChange={e => setCustomModel(e.target.value)}
                      placeholder="输入自定义模型名称，如 moonshot-v1-8k"
                      className="w-full text-[14px] bg-gray-50 border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors rounded mt-2"
                    />
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveModelSettings}
                    disabled={isSavingModel}
                    className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded disabled:opacity-50"
                  >
                    {modelSaved ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        保存成功
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        保存大模型设置
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bot Settings Section */}
          <div id="bot-settings" className="space-y-8">
            <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-gray-500 tracking-widest">机器人设置</h2>
              <button
                onClick={() => setIsAddingBot(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded transition-colors border border-gray-200"
              >
                <Plus className="w-3.5 h-3.5" />
                新增机器人
              </button>
            </div>

            <div className="space-y-4">
              {isAddingBot && (
                <BotEditor
                  bot={{ id: '', name: '', webhook: '' }}
                  initiallyEditing={true}
                  onSave={(b) => {
                    addBot(b);
                    setIsAddingBot(false);
                  }}
                  onCancel={() => setIsAddingBot(false)}
                  onDelete={() => setIsAddingBot(false)}
                />
              )}

              {isLoadedBots && bots.map(bot => (
                <BotEditor
                  key={bot.id}
                  bot={bot}
                  onSave={(updated) => updateBot(bot.id, updated)}
                  onDelete={() => deleteBot(bot.id)}
                />
              ))}

              {!isLoadedBots && <div className="text-sm text-gray-400 py-4 animate-pulse">加载中...</div>}
              
              {isLoadedBots && bots.length === 0 && !isAddingBot && (
                <div className="py-8 text-center text-gray-400 text-[13px]">
                  暂无机器人配置，点击上方「新增机器人」创建
                </div>
              )}
            </div>
          </div>

          {/* Command Settings Section */}
          <div id="command-settings" className="space-y-8">
            <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-gray-500 tracking-widest">命令设置</h2>
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded transition-colors border border-gray-200"
              >
                <Plus className="w-3.5 h-3.5" />
                新增快捷指令
              </button>
            </div>

            <div className="space-y-8">
              {isAdding && (
                <CommandEditor
                  command={{
                    id: '',
                    name: '/',
                    description: '',
                    tasks: [''],
                  }}
                  initiallyEditing={true}
                  onSave={(cmd) => {
                    addCommand(cmd);
                    setIsAdding(false);
                  }}
                  onCancel={() => setIsAdding(false)}
                  onDelete={() => setIsAdding(false)}
                />
              )}

              {isLoaded && commands.map((cmd) => (
                <CommandEditor
                  key={cmd.id}
                  command={cmd}
                  onSave={(updated) => updateCommand(cmd.id, updated)}
                  onDelete={() => deleteCommand(cmd.id)}
                />
              ))}

              {!isLoaded && <div className="text-sm text-gray-400 py-4 animate-pulse">加载中...</div>}

              {isLoaded && commands.length === 0 && !isAdding && (
                <div className="py-8 text-center text-gray-400 text-[13px]">
                  暂无快捷指令，点击上方「新增快捷指令」创建
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
