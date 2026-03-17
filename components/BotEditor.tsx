import { useState, useRef, useEffect } from 'react';
import { Check, Edit2, Trash2, X } from 'lucide-react';

export type Bot = {
  id: string;
  name: string;
  webhook: string;
};

interface BotEditorProps {
  bot: Bot;
  initiallyEditing?: boolean;
  onSave: (bot: Bot) => void;
  onDelete: () => void;
  onCancel?: () => void;
}

export default function BotEditor({ bot, initiallyEditing = false, onSave, onDelete, onCancel }: BotEditorProps) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [name, setName] = useState(bot.name);
  const [webhook, setWebhook] = useState(bot.webhook);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initiallyEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [initiallyEditing]);

  const handleSave = () => {
    if (!name.trim() || !webhook.trim()) return;
    onSave({
      id: bot.id || Date.now().toString(),
      name: name.trim(),
      webhook: webhook.trim()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (initiallyEditing && onCancel) {
      onCancel();
    } else {
      setName(bot.name);
      setWebhook(bot.webhook);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="group flex flex-col items-start justify-between gap-4 p-4 border border-gray-100 rounded bg-white hover:border-gray-200 transition-colors">
        <div className="flex-1 w-full flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-[14px] font-bold text-gray-900 truncate">{bot.name}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors rounded hover:bg-gray-50 bg-white"
                title="编辑"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-gray-50 bg-white"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <span className="text-[12px] text-gray-400 truncate">{bot.webhook}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded p-4 bg-gray-50/50 flex flex-col gap-4">
      <div>
        <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase">机器人名称</label>
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：工作总结群机器人"
          className="w-full text-[14px] bg-white border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 transition-colors rounded"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-1.5 uppercase">Webhook 地址</label>
        <input
          type="text"
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          placeholder="例如：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
          className="w-full text-[14px] bg-white border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 transition-colors rounded"
        />
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button 
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 transition-colors rounded hover:bg-gray-100 bg-white border border-gray-200"
        >
          <X className="w-3.5 h-3.5" />
          取消
        </button>
        <button 
          onClick={handleSave}
          disabled={!name.trim() || !webhook.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5 text-white" />
          保存
        </button>
      </div>
    </div>
  );
}
