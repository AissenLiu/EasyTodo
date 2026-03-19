import { useState, useEffect } from 'react';

export interface ShortcutCommand {
  id: string;
  name: string;
  description: string;
  tasks: string[];
}

function normalizeCommands(input: unknown): ShortcutCommand[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const command = item as Record<string, unknown>;
      return {
        id: typeof command.id === 'string' ? command.id : '',
        name: typeof command.name === 'string' ? command.name : '',
        description: typeof command.description === 'string' ? command.description : '',
        tasks: Array.isArray(command.tasks)
          ? command.tasks.filter((task): task is string => typeof task === 'string')
          : [],
      };
    })
    .filter((item): item is ShortcutCommand => Boolean(item?.id && item.name));
}

export function useCommands() {
  const [commands, setCommandsState] = useState<ShortcutCommand[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/commands')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load commands');
        }
        setCommandsState(normalizeCommands(data));
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load commands:', err);
        setCommandsState([]);
        setIsLoaded(true);
      });
  }, []);

  const addCommand = async (command: Omit<ShortcutCommand, 'id'>) => {
    const tempId = Date.now().toString();
    const newCommand = { ...command, id: tempId };
    
    // Optimistic update
    setCommandsState(prev => [...prev, newCommand]);

    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCommand),
      });
      if (!res.ok) throw new Error('Failed to create');
    } catch (err) {
      console.error(err);
      // Revert on error
      setCommandsState(prev => prev.filter(c => c.id !== tempId));
    }
  };

  const updateCommand = async (id: string, updatedCommand: Omit<ShortcutCommand, 'id'>) => {
    // Optimistic update
    setCommandsState(prev => prev.map(cmd => cmd.id === id ? { ...updatedCommand, id } : cmd));

    try {
      const res = await fetch(`/api/commands/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCommand),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (err) {
      console.error(err);
      // Could implement full revert strategy here if needed
    }
  };

  const deleteCommand = async (id: string) => {
    // Optimistic update
    setCommandsState(prev => prev.filter(cmd => cmd.id !== id));

    try {
      const res = await fetch(`/api/commands/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
    } catch (err) {
      console.error(err);
      // Could implement full revert strategy here if needed
    }
  };

  return {
    commands,
    isLoaded,
    addCommand,
    updateCommand,
    deleteCommand,
  };
}
