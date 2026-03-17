import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Bot as BotType } from './BotEditor';

export type ReminderType = 'popup' | 'robot' | 'none';

export interface TaskReminderData {
  reminder_time?: string | null;
  reminder_type?: ReminderType | null;
  bot_id?: string | null;
  bot_mentions?: string | null;
  bot_mention_all?: boolean;
  bot_custom_message?: string | null;
}

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskReminderData) => void;
  initialData?: TaskReminderData;
}

export default function ReminderModal({ isOpen, onClose, onSave, initialData }: ReminderModalProps) {
  const [reminderType, setReminderType] = useState<ReminderType>(initialData?.reminder_type || 'none');
  const [reminderTime, setReminderTime] = useState(
    initialData?.reminder_time 
      ? new Date(initialData.reminder_time).toISOString().slice(0, 16) 
      : ''
  );
  const [botId, setBotId] = useState(initialData?.bot_id || '');
  const [botMentions, setBotMentions] = useState(initialData?.bot_mentions || '');
  const [botMentionAll, setBotMentionAll] = useState(initialData?.bot_mention_all || false);
  const [botCustomMessage, setBotCustomMessage] = useState(initialData?.bot_custom_message || '');
  const [bots, setBots] = useState<BotType[]>([]);

  useEffect(() => {
    // Try to load initial values without direct sync setState in effect body when possible
    let timeoutId: NodeJS.Timeout;
    if (isOpen && initialData) {
      timeoutId = setTimeout(() => {
        setReminderType(initialData.reminder_type || 'none');
        setReminderTime(initialData.reminder_time 
          ? new Date(initialData.reminder_time).toISOString().slice(0, 16) 
          : '');
        setBotId(initialData.bot_id || '');
        setBotMentions(initialData.bot_mentions || '');
        setBotMentionAll(initialData.bot_mention_all || false);
        setBotCustomMessage(initialData.bot_custom_message || '');
      }, 0);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen) {
      // Load bots if needed
      fetch('/api/bots')
        .then(res => res.json())
        .then(data => {
          setBots(data);
          if (data.length > 0 && (!initialData || !initialData.bot_id)) {
            setBotId(data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (reminderType !== 'none' && !reminderTime) {
      alert('请选择提醒时间');
      return;
    }
    
    onSave({
      reminder_type: reminderType === 'none' ? null : reminderType,
      reminder_time: reminderType === 'none' ? null : new Date(reminderTime).toISOString(),
      bot_id: reminderType === 'robot' ? botId : null,
      bot_mentions: reminderType === 'robot' ? botMentions.trim() : null,
      bot_mention_all: reminderType === 'robot' ? botMentionAll : false,
      bot_custom_message: reminderType === 'robot' ? botCustomMessage.trim() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-sm flex flex-col rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-[14px] font-bold text-gray-900">设置提醒</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-gray-500 mb-2">提醒类型</label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value as ReminderType)}
              className="w-full text-[13px] bg-white border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-gray-400"
            >
              <option value="none">无提醒</option>
              <option value="popup">弹窗提醒</option>
              <option value="robot">机器人消息推送</option>
            </select>
          </div>

          {reminderType !== 'none' && (
            <div>
              <label className="block text-[12px] font-bold text-gray-500 mb-2">提醒时间</label>
              <input
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full text-[13px] bg-white border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-gray-400"
              />
            </div>
          )}

          {reminderType === 'robot' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-2">选择机器人</label>
                <select
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  className="w-full text-[13px] bg-white border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-gray-400"
                >
                  {bots.length === 0 && <option value="" disabled>当前无机器人，请至设置中添加</option>}
                  {bots.map(bot => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-2">@ 提醒人 (可选)</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mentionAll"
                      checked={botMentionAll}
                      onChange={(e) => setBotMentionAll(e.target.checked)}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <label htmlFor="mentionAll" className="text-[13px] text-gray-700">@所有人</label>
                  </div>
                  
                  {!botMentionAll && (
                    <input
                      type="text"
                      placeholder="输入人员姓名，多个可用逗号分隔"
                      value={botMentions}
                      onChange={(e) => setBotMentions(e.target.value)}
                      className="w-full text-[13px] bg-white border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-2">自定义消息内容 (可选)</label>
                <textarea
                  value={botCustomMessage}
                  onChange={(e) => setBotCustomMessage(e.target.value)}
                  placeholder="【任务提醒】&#13;&#10;您有任务到期啦！"
                  className="w-full text-[13px] bg-white border border-gray-200 px-3 py-2 rounded focus:outline-none focus:border-gray-400 placeholder:text-gray-400 min-h-[60px] resize-y"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-end gap-3 mt-auto">
          <button
            onClick={onClose}
            className="text-[13px] text-gray-500 hover:text-gray-900 font-medium px-4 py-2"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
