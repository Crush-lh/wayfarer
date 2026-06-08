'use client'

import { useState } from 'react'
import { TravelPlan } from '@/lib/planner'

export default function TravelForm() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [error, setError] = useState('')

  const [destination, setDestination] = useState('')
  const [days, setDays] = useState(3)
  const [budget, setBudget] = useState(2000)
  const [preferences, setPreferences] = useState<string[]>([])

  const preferenceOptions = [
    '自然风光',
    '人文历史',
    '美食',
    '购物',
    '亲子',
    '休闲',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPlan(null)

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          days,
          budget,
          preferences,
        }),
      })

      if (!res.ok) {
        throw new Error('生成失败')
      }

      const data = await res.json()
      setPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const togglePreference = (pref: string) => {
    setPreferences(prev =>
      prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 目的地 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            目的地
          </label>
          <input
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="输入城市名称，如：北京、杭州、成都"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* 天数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            旅行天数：{days} 天
          </label>
          <input
            type="range"
            min={1}
            max={7}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 预算 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预算：{budget} 元
          </label>
          <input
            type="range"
            min={500}
            max={10000}
            step={500}
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 偏好 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            旅行偏好（多选）
          </label>
          <div className="flex flex-wrap gap-2">
            {preferenceOptions.map(pref => (
              <button
                key={pref}
                type="button"
                onClick={() => togglePreference(pref)}
                className={`px-4 py-2 rounded-full border transition-colors ${
                  preferences.includes(pref)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          {loading ? '正在生成旅行计划...' : '生成旅行计划'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </form>

      {/* 结果展示 */}
      {plan && <TravelPlanView plan={plan} />}
    </div>
  )
}

function TravelPlanView({ plan }: { plan: TravelPlan }) {
  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          {plan.destination} 旅行计划
        </h2>

        {/* 基本信息 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">天数</div>
            <div className="text-xl font-bold text-blue-600">{plan.days} 天</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">预算</div>
            <div className="text-xl font-bold text-green-600">{plan.budget} 元</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">偏好</div>
            <div className="text-sm font-medium text-purple-600">
              {plan.preferences.join('、') || '未选择'}
            </div>
          </div>
        </div>

        {/* 天气 */}
        {plan.weather?.forecasts?.[0]?.casts && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">天气预报</h3>
            <div className="grid grid-cols-3 gap-3">
              {plan.weather.forecasts[0].casts.slice(0, 3).map((cast: any, i: number) => (
                <div key={i} className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-gray-500">第 {i + 1} 天</div>
                  <div className="text-lg">{cast.dayweather}</div>
                  <div className="text-sm">{cast.daytemp}°C</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 每日计划 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">每日行程</h3>
          {plan.dailyPlans.map((daily) => (
            <div key={daily.day} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-lg">第 {daily.day} 天</h4>
                <span className="text-sm text-gray-500">
                  预计花费：{daily.totalCost} 元
                </span>
              </div>

              <div className="space-y-3">
                {/* 上午 */}
                {daily.morning.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">上午</div>
                    <div className="space-y-2">
                      {daily.morning.map((poi, i) => (
                        <POICard key={i} poi={poi} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 下午 */}
                {daily.afternoon.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">下午</div>
                    <div className="space-y-2">
                      {daily.afternoon.map((poi, i) => (
                        <POICard key={i} poi={poi} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 晚上 */}
                {daily.evening.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">晚上</div>
                    <div className="space-y-2">
                      {daily.evening.map((poi, i) => (
                        <POICard key={i} poi={poi} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 建议 */}
        {plan.tips.length > 0 && (
          <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">旅行建议</h3>
            <ul className="space-y-1">
              {plan.tips.map((tip, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start">
                  <span className="mr-2">💡</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function POICard({ poi }: { poi: any }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{poi.name}</div>
          <div className="text-sm text-gray-500 mt-1">{poi.address}</div>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="text-orange-500">⭐ {poi.rating}</span>
            <span className="text-gray-600">⏱ {poi.timeNeeded}</span>
            <span className="text-green-600">💰 {poi.cost} 元</span>
          </div>
        </div>
      </div>
    </div>
  )
}
