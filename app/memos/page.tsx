import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MemoWorkspace from '@/components/MemoWorkspace';

export default function MemosPage() {
  return (
    <div className="flex-1 flex min-h-0 bg-white">
      <div className="w-full max-w-7xl mx-auto px-10 py-10 flex flex-col min-h-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 text-[13px] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-2">备忘录</h1>
          <p className="text-[13px] text-gray-400">记录临时想法、会议纪要和长期备忘，统一集中管理。</p>
        </div>

        <div className="flex-1 min-h-0">
          <MemoWorkspace />
        </div>
      </div>
    </div>
  );
}
