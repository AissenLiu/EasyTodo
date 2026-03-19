import PomodoroPanel from '@/components/PomodoroPanel';

export default function PomodoroPage() {
  return (
    <div className="flex-1 flex w-full h-full bg-white relative">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="w-full max-w-6xl mx-auto px-8 pt-10 pb-10">
          <div className="mb-7">
            <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase mb-2">专注计时</h1>
            <p className="text-[13px] text-gray-400">
              使用番茄工作法安排专注与休息，保持稳定节奏。
            </p>
          </div>
          <PomodoroPanel />
        </div>
      </div>
    </div>
  );
}
