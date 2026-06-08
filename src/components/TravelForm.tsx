'use client'

import { useState, useEffect } from 'react'
import { TravelPlan } from '@/lib/planner'

export default function TravelForm() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<TravelPlan[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const [destination, setDestination] = useState('')
  const [days, setDays] = useState(3)
  const [budget, setBudget] = useState(2000)
  const [preferences, setPreferences] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')

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
      
      // 保存到历史
      const saved = localStorage.getItem('travelHistory')
      const history = saved ? JSON.parse(saved) : []
      history.unshift(data)
      localStorage.setItem('travelHistory', JSON.stringify(history.slice(0, 10)))
      setHistory(history.slice(0, 10))
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

  const loadHistory = () => {
    const saved = localStorage.getItem('travelHistory')
    if (saved) {
      setHistory(JSON.parse(saved))
      setShowHistory(true)
    }
  }

  const clearHistory = () => {
    localStorage.removeItem('travelHistory')
    setHistory([])
  }

  const loadPlan = (plan: TravelPlan) => {
    setPlan(plan)
    setDestination(plan.destination)
    setDays(plan.days)
    setBudget(plan.budget)
    setPreferences(plan.preferences)
    setShowHistory(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 历史记录按钮 */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={loadHistory}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          📋 历史记录
        </button>
        {showHistory && (
          <button
            onClick={() => setShowHistory(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            关闭
          </button>
        )}
      </div>

      {/* 历史记录面板 */}
      {showHistory && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800">历史记录</h3>
            <button
              onClick={clearHistory}
              className="text-sm text-red-500 hover:text-red-700"
            >
              清空
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无历史记录</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  onClick={() => loadPlan(item)}
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{item.destination}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {item.days}天 · {item.budget}元
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {item.preferences.join('、')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* 出行日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            出行日期（可选，用于天气查询）
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1天</span>
            <span>7天</span>
          </div>
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
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>500元</span>
            <span>10000元</span>
          </div>
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
                className={`px-4 py-2 rounded-full border transition-all duration-200 ${
                  preferences.includes(pref)
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
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
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              正在规划最优路线...
            </span>
          ) : (
            '生成旅行计划'
          )}
        </button>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
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
