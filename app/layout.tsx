import type {Metadata} from 'next';
import './globals.css'; // Global styles
import Sidebar from '@/components/Sidebar';
import ClipboardWatcher from '@/components/ClipboardWatcher';

const themeInitScript = `
  (function () {
    try {
      var stored = localStorage.getItem('focusflow-theme');
      var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var theme = stored === 'dark' || stored === 'light' ? stored : system;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
    }
  })();
`;

export const metadata: Metadata = {
  title: '极简待办 (Minimalist Todo)',
  description: 'A minimalist todo application with task management, calendar view, and AI settings.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="theme-shell font-sans flex h-screen overflow-hidden antialiased" suppressHydrationWarning>
        <ClipboardWatcher />
        <Sidebar />
        <main className="flex-1 flex min-h-0 overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
