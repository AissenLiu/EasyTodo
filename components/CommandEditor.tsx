import { useState } from 'react';
import { ShortcutCommand } from '@/hooks/useCommands';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface CommandEditorProps {
  command: ShortcutCommand;
  onSave: (command: ShortcutCommand) => void;
  onDelete: (id: string) => void;
  onCancel?: () => void;
  initiallyEditing?: boolean;
}

export default function CommandEditor({ command, onSave, onDelete, onCancel, initiallyEditing = false }: CommandEditorProps) {
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [editState, setEditState] = useState<ShortcutCommand>(command);

  const handleSave = () => {
    onSave(editState);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditState(command);
    setIsEditing(false);
    if (onCancel) onCancel();
  };

  const addTask = () => {
    setEditState({ ...editState, tasks: [...editState.tasks, ''] });
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...editState.tasks];
    newTasks[index] = value;
    setEditState({ ...editState, tasks: newTasks });
  };

  const removeTask = (index: number) => {
    const newTasks = [...editState.tasks];
    newTasks.splice(index, 1);
    setEditState({ ...editState, tasks: newTasks });
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-400 mb-2">命令名称</label>
            <input
              type="text"
              value={editState.name}
              onChange={(e) => setEditState({ ...editState, name: e.target.value })}
              placeholder="例如: /bb"
              className="w-full text-[15px] bg-transparent focus:outline-none placeholder:text-gray-200 text-gray-900 border-b border-gray-100 pb-2 focus:border-gray-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-400 mb-2">命令描述</label>
            <input
              type="text"
              value={editState.description}
              onChange={(e) => setEditState({ ...editState, description: e.target.value })}
              placeholder="功能描述"
              className="w-full text-[15px] bg-transparent focus:outline-none placeholder:text-gray-200 text-gray-900 border-b border-gray-100 pb-2 focus:border-gray-400 transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[13px] font-medium text-gray-400">创建的任务</label>
            <span className="text-[12px] text-gray-400">使用 {`{arg}`} 作为文本占位符</span>
          </div>
          <div className="space-y-3">
            {editState.tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={task}
                  onChange={(e) => updateTask(index, e.target.value)}
                  placeholder="新任务... (可包含 {arg})"
                  className="flex-1 text-[14px] bg-gray-50/50 border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
                />
                <button
                  onClick={() => removeTask(index)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除任务"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addTask}
            className="mt-3 flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加任务模板
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors rounded"
          >
            <X className="w-3.5 h-3.5" />
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded"
          >
            <Check className="w-3.5 h-3.5" />
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group border-b border-gray-50 pb-6 last:border-0 flex items-start justify-between gap-8">
      <div className="flex-1">
        <h3 className="text-[15px] font-bold mb-2 text-gray-900">
          {command.name}
        </h3>
        <p className="text-gray-400 text-[13px] mb-4">{command.description}</p>
        
        {command.tasks.length > 0 && (
          <div className="space-y-1.5">
            {command.tasks.map((task, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[12px] text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                <span className="flex-1">{task}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
          title="编辑"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(command.id)}
          className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition-colors"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
