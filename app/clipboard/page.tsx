import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClipboardHistory from '@/components/ClipboardHistory';

export default function ClipboardPage() {
  return (
    <div className="flex-1 flex min-h-0 bg-white">
      <div className="w-full max-w-5xl mx-auto px-12 py-12 flex flex-col min-h-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 text-[13px] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-2">剪切板</h1>
          <p className="text-[13px] text-gray-400">自动记录复制历史，支持搜索、回填复制、删除和清空。</p>
        </div>

        <ClipboardHistory />
      </div>
    </div>
  );
}
