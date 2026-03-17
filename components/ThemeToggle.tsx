'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'focusflow-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(currentTheme);
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  const handleToggle = () => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {}
  };

  return (
    <button
      onClick={handleToggle}
      title={collapsed ? `切换为${nextTheme === 'dark' ? '深色' : '浅色'}模式` : undefined}
      className={`w-full flex items-center ${collapsed ? 'justify-center mx-0 px-0' : 'mx-0 px-4'} py-3 transition-colors text-gray-400 hover:bg-gray-50/50 hover:text-gray-900 font-medium`}
      aria-label={`切换为${nextTheme === 'dark' ? '深色' : '浅色'}模式`}
    >
      {theme === 'dark' ? (
        <Sun className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
      ) : (
        <Moon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
      )}
      {!collapsed && (
        <span className="ml-4 flex flex-col items-start whitespace-nowrap">
          <span className="text-[14px] leading-none">主题</span>
          <span className="mt-1 text-[11px] text-gray-400">{theme === 'dark' ? '深色模式' : '浅色模式'}</span>
        </span>
      )}
    </button>
  );
}
