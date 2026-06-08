import TravelForm from "@/components/TravelForm";

export default function Home() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🌍 Wayfarer
          </h1>
          <p className="text-lg text-gray-600">
            输入目的地，自动生成旅行计划
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm text-gray-500">
            <span>🌤 天气查询</span>
            <span>📍 景点推荐</span>
            <span>🗺 路线规划</span>
          </div>
        </div>

        {/* 表单 */}
        <TravelForm />
      </div>
    </div>
  );
}
