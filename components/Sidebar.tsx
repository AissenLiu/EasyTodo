'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutList,
  PieChart,
  BookOpen,
  Settings,
  Bot,
  Terminal,
  Brain,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Sidebar() {
  const pathname = usePathname();
  const isSettings = pathname.startsWith('/settings');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainLinks = [
    { href: '/', label: '我的任务', icon: LayoutList },
    { href: '/stats', label: '统计看板', icon: PieChart },
    { href: '/summary', label: '工作总结', icon: BookOpen },
  ];

  const settingsLinks = [
    { href: '/settings#model-settings', label: '大模型设置', icon: Brain },
    { href: '/settings#bot-settings', label: '机器人设置', icon: Bot },
    { href: '/settings#command-settings', label: '命令设置', icon: Terminal },
  ];

  const links = isSettings ? settingsLinks : mainLinks;

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 border-r border-gray-100 flex flex-col h-screen bg-white sticky top-0`}>
      <div className={`pt-10 pb-6 flex flex-col ${isCollapsed ? 'items-center px-0' : 'items-start px-8'} mb-2 h-28 justify-center overflow-hidden shrink-0`}>
        {!isCollapsed ? (
          <>
            <span className="text-xl font-black tracking-wider text-gray-900 uppercase">Focusflow</span>
            <span className="text-[11px] text-gray-400 mt-1.5 tracking-widest">生产力套件</span>
          </>
        ) : (
          <span className="text-xl font-black tracking-wider text-gray-900 uppercase">F</span>
        )}
      </div>

      <nav className="flex-1 py-2 space-y-1.5 overflow-hidden">
        {links.map((link) => {
          const Icon = link.icon;

          // Simplified active logic
          const isActive = isSettings
            ? link.href === '/settings#model-settings' // Default to first link active in settings
            : pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.label : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center mx-3 px-0' : 'mx-4 px-4'} py-3 transition-colors ${isActive
                ? 'bg-gray-50/80 text-gray-900 font-bold'
                : 'text-gray-400 hover:bg-gray-50/50 hover:text-gray-900 font-medium'
                }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-gray-900' : ''}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!isCollapsed && <span className="text-[14px] ml-4 whitespace-nowrap">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 pt-2 shrink-0 space-y-2">
        <ThemeToggle collapsed={isCollapsed} />
        <Link
          href="/settings"
          title={isCollapsed ? "设置" : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center mx-0 px-0' : 'mx-0 px-4'} py-3 transition-colors ${isSettings
            ? 'bg-gray-50/80 text-gray-900 font-bold'
            : 'text-gray-400 hover:bg-gray-50/50 hover:text-gray-900 font-medium'
            }`}
        >
          <Settings className={`w-[18px] h-[18px] shrink-0 ${isSettings ? 'text-gray-900' : ''}`} strokeWidth={isSettings ? 2.5 : 2} />
          {!isCollapsed && <span className="text-[14px] ml-4 whitespace-nowrap">设置</span>}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center mx-0 px-0' : 'mx-0 px-4'} py-3 transition-colors text-gray-400 hover:bg-gray-50/50 hover:text-gray-900 font-medium`}
          title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
          )}
          {!isCollapsed && <span className="text-[14px] ml-4 whitespace-nowrap">收起侧边栏</span>}
        </button>
        <div className={`pt-3 text-[11px] text-gray-300 ${isCollapsed ? 'text-center' : 'px-4'}`}>
          {isCollapsed ? '©' : '© Designed by LiuChen 2026'}
        </div>
      </div>
    </aside>
  );
}
