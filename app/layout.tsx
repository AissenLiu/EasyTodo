import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles
import Sidebar from '@/components/Sidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '极简待办 (Minimalist Todo)',
  description: 'A minimalist todo application with task management, calendar view, and AI settings.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans flex min-h-screen bg-white text-gray-900 antialiased" suppressHydrationWarning>
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
