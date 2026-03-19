import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CountdownManager from '@/components/CountdownManager';

export default function CountdownsPage() {
  return (
    <div className="flex-1 flex min-h-0 bg-white">
      <div className="w-full max-w-6xl mx-auto px-12 py-12 flex flex-col min-h-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 text-[13px] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-2">倒计时</h1>
          <p className="text-[13px] text-gray-400">管理里程碑和周期节点，持续跟踪下一次到期时间。</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <CountdownManager />
        </div>
      </div>
    </div>
  );
}
