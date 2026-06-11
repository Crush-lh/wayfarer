import TravelForm from "@/components/TravelForm";

export default function Home() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 - 玻璃拟态效果 */}
        <div className="glass-card rounded-2xl p-8 mb-8 animate-fade-in-up">
          <div className="text-center">
            <div className="inline-block mb-4">
              <span className="text-5xl">🌍</span>
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-3">
              旅行计划助手
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              智能旅行规划助手，为你定制完美旅程
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-xl">🌤</span>
                <span className="text-gray-700">实时天气</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-xl">📍</span>
                <span className="text-gray-700">智能推荐</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-xl">🗺</span>
                <span className="text-gray-700">路线优化</span>
              </div>
            </div>
          </div>
        </div>

        {/* 表单 */}
        <TravelForm />
      </div>
    </div>
  );
}
