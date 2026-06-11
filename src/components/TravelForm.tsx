'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TravelPlan, POI, DailyPlan } from '@/lib/planner'
import { useToast } from '@/components/Toast'
import { SkeletonPlanView } from '@/components/ui/feedback'
import MapView from '@/components/MapView'

export default function TravelForm() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<TravelPlan | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<TravelPlan[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const [destination, setDestination] = useState('')
  const [days, setDays] = useState(3)
  const [budget, setBudget] = useState(2000)
  const [preferences, setPreferences] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)
  const [recentDestinations, setRecentDestinations] = useState<string[]>([])

  const preferenceOptions = [
    '自然风光',
    '人文历史',
    '美食',
    '购物',
    '亲子',
    '休闲',
  ]

  const hotCities = [
    '北京', '上海', '杭州', '成都', '西安', '重庆', '厦门', '广州',
    '深圳', '南京', '苏州', '青岛', '丽江', '大理', '桂林', '三亚'
  ]

  const cityMap: Record<string, string[]> = {
    '华北': ['北京', '天津', '石家庄', '太原', '呼和浩特'],
    '华东': ['上海', '杭州', '南京', '苏州', '合肥', '济南', '青岛', '厦门'],
    '华南': ['广州', '深圳', '珠海', '桂林', '三亚', '海口'],
    '华中': ['武汉', '长沙', '郑州', '南昌'],
    '西南': ['成都', '重庆', '昆明', '贵阳', '拉萨', '丽江', '大理'],
    '西北': ['西安', '兰州', '西宁', '银川', '乌鲁木齐'],
    '东北': ['哈尔滨', '长春', '沈阳', '大连'],
  }

  const allCities = Object.values(cityMap).flat()

  const [showCityPicker, setShowCityPicker] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const [activeRegion, setActiveRegion] = useState('热门')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 表单验证
    if (!destination.trim()) {
      addToast('请选择目的地', 'warning')
      return
    }
    
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
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '生成失败')
      }

      const data = await res.json()
      setPlan(data)
      addToast('旅行计划生成成功！', 'success')
      
      // 保存城市到最近搜索
      saveToRecent(destination)
      
      // 保存到历史
      const saved = localStorage.getItem('travelHistory')
      const history = saved ? JSON.parse(saved) : []
      history.unshift(data)
      localStorage.setItem('travelHistory', JSON.stringify(history.slice(0, 10)))
      setHistory(history.slice(0, 10))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '生成失败'
      setError(errorMsg)
      addToast(errorMsg, 'error')
      console.error('生成计划失败:', err)
    } finally {
      setLoading(false)
    }
  }, [destination, days, budget, preferences, addToast])

  // 加载最近搜索的城市
  useEffect(() => {
    const saved = localStorage.getItem('recentDestinations')
    if (saved) {
      setRecentDestinations(JSON.parse(saved))
    }
  }, [])

  // 保存城市到最近搜索
  const saveToRecent = (city: string) => {
    if (!city) return
    const updated = [city, ...recentDestinations.filter(c => c !== city)].slice(0, 5)
    setRecentDestinations(updated)
    localStorage.setItem('recentDestinations', JSON.stringify(updated))
  }

  // 城市输入联想
  const handleCityInput = (value: string) => {
    setDestination(value)
    setCitySearch(value)
    if (value.length >= 1) {
      const filtered = allCities.filter(city =>
        city.includes(value) ||
        getPinyinFirst(value).some(p => city.startsWith(p))
      ).slice(0, 8)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }

  // 拼音首字母匹配（简化版）
  const getPinyinFirst = (input: string): string[] => {
    const pinyinMap: Record<string, string[]> = {
      'b': ['北'], 's': ['上', '深', '沈'], 'h': ['杭', '哈', '合'],
      'c': ['成', '重', '长'], 'x': ['西', '厦'], 'g': ['广', '桂'],
      'n': ['南', '宁'], 'q': ['青'], 'l': ['兰', '丽', '拉'],
      'w': ['武'], 'z': ['郑'], 'k': ['昆'], 'y': ['银'],
      'd': ['大'], 'j': ['济'], 'e': ['鄂'], 'f': ['福'],
    }
    return pinyinMap[input.toLowerCase()] || []
  }

  // 选择城市
  const selectCity = (city: string) => {
    setDestination(city)
    setCitySearch(city)
    setSuggestions([])
    setShowCityPicker(false)
    saveToRecent(city)
  }

  // 日期工具函数
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const getWeekday = (dateStr: string) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[new Date(dateStr).getDay()]
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const selectDate = (dateStr: string) => {
    setStartDate(dateStr)
    setShowDatePicker(false)
  }

  const selectQuickDate = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    selectDate(formatDate(date))
  }

  const navigateMonth = (delta: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + delta)
    setCurrentMonth(newMonth)
  }

  const isToday = (dateStr: string) => {
    return dateStr === formatDate(new Date())
  }

  const isSelected = (dateStr: string) => {
    return dateStr === startDate
  }

  const isPastDate = (dateStr: string) => {
    return new Date(dateStr) < new Date(formatDate(new Date()))
  }

  const getDaysToWeekend = () => {
    const day = new Date().getDay()
    return day === 0 ? 0 : day === 6 ? 0 : 6 - day
  }

  // 点击外部关闭日期选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 点击外部关闭 picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowCityPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 获取当前定位
  const getLocation = () => {
    if (!navigator.geolocation) {
      addToast('浏览器不支持定位功能', 'error')
      return
    }

    addToast('正在获取定位...', 'info')
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `/api/location?lng=${position.coords.longitude}&lat=${position.coords.latitude}`
          )
          const data = await res.json()
          
          if (data.success && data.city) {
            selectCity(data.city)
            addToast(`已定位到：${data.city}`, 'success')
          } else {
            addToast(data.error || '无法获取城市信息', 'warning')
          }
        } catch (e) {
          console.error('定位请求失败:', e)
          addToast('定位服务异常，请手动选择城市', 'error')
        }
      },
      (error) => {
        let msg = '获取定位失败'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = '定位权限被拒绝，请允许浏览器获取位置'
            break
          case error.POSITION_UNAVAILABLE:
            msg = '位置信息不可用'
            break
          case error.TIMEOUT:
            msg = '定位超时'
            break
        }
        addToast(msg, 'error')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
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
    addToast('历史记录已清空', 'success')
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
          className="text-sm text-white/80 hover:text-white underline transition-colors"
        >
          📋 历史记录
        </button>
        {showHistory && (
          <button
            onClick={() => setShowHistory(false)}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            关闭
          </button>
        )}
      </div>

      {/* 历史记录面板 */}
      {showHistory && (
        <div className="glass-card rounded-2xl p-6 mb-6 animate-fade-in-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800 text-lg">历史记录</h3>
            <button
              onClick={clearHistory}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
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
                  className="p-4 bg-white/60 rounded-xl cursor-pointer hover:bg-white/80 transition-all hover-lift"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-800">{item.destination}</span>
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

      {/* 表单 */}
      <div className="glass-card rounded-2xl p-8 animate-fade-in-up">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 目的地 - 城市选择器 */}
          <div className="relative" ref={pickerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目的地 🎯
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={destination}
                onChange={e => handleCityInput(e.target.value)}
                onFocus={() => setShowCityPicker(true)}
                placeholder="输入或选择城市"
                className="flex-1 px-4 py-3 bg-white/80 border border-white/50 rounded-xl 
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                           transition-all outline-none placeholder:text-gray-400"
                required
              />
              <button
                type="button"
                onClick={getLocation}
                className="px-4 py-3 bg-white/60 border border-white/50 rounded-xl
                           hover:bg-white/80 transition-all text-lg"
                title="获取当前位置"
              >
                📍
              </button>
            </div>

            {/* 联想下拉 */}
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white/95 backdrop-blur-md 
                              rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                {suggestions.map((city, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors
                               flex items-center gap-2"
                  >
                    <span className="text-gray-400">📍</span>
                    <span>{city}</span>
                    {hotCities.includes(city) && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                        热门
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 城市选择面板 */}
            {showCityPicker && !suggestions.length && (
              <div className="absolute z-20 w-full mt-2 bg-white/95 backdrop-blur-md 
                              rounded-xl border border-gray-200 shadow-lg p-4 max-h-96 overflow-y-auto">
                
                {/* 最近搜索 */}
                {recentDestinations.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-2">最近搜索</div>
                    <div className="flex flex-wrap gap-2">
                      {recentDestinations.map((city, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectCity(city)}
                          className="px-3 py-1 bg-gray-100 hover:bg-purple-100 
                                     rounded-full text-sm transition-colors"
                        >
                          🕐 {city}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 区域标签 */}
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  {['热门', ...Object.keys(cityMap)].map(region => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setActiveRegion(region)}
                      className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors
                        ${activeRegion === region
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>

                {/* 城市网格 */}
                <div className="grid grid-cols-4 gap-2">
                  {(activeRegion === '热门' ? hotCities : cityMap[activeRegion] || []).map((city, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectCity(city)}
                      className={`py-2 rounded-lg text-sm transition-all
                        ${destination === city
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-50 hover:bg-purple-50 text-gray-700'
                        }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 出行日期 - 美化日期选择器 */}
          <div className="relative" ref={datePickerRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出行日期 📅（可选）
            </label>
            
            {/* 日期显示按钮 */}
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`w-full px-4 py-3 bg-white/80 border rounded-xl 
                         transition-all outline-none text-left flex items-center justify-between
                         ${startDate ? 'border-purple-300 ring-2 ring-purple-100' : 'border-white/50'}
                         ${showDatePicker ? 'ring-2 ring-purple-400' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{startDate ? '📆' : '📅'}</span>
                <div>
                  {startDate ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">
                        {new Date(startDate).getMonth() + 1}月{new Date(startDate).getDate()}日
                      </span>
                      <span className="text-sm text-purple-600 font-medium">
                        {getWeekday(startDate)}
                      </span>
                      {isToday(startDate) && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                          今天
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">选择出行日期</span>
                  )}
                </div>
              </div>
              <span className="text-gray-400">{showDatePicker ? '▲' : '▼'}</span>
            </button>

            {/* 快捷选择 */}
            {!showDatePicker && (
              <div className="flex gap-2 mt-2">
                {[
                  { label: '今天', days: 0 },
                  { label: '明天', days: 1 },
                  { label: '后天', days: 2 },
                  { label: '周末', days: getDaysToWeekend() },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => selectQuickDate(item.days)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all
                      ${startDate === formatDate(new Date(Date.now() + item.days * 86400000))
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'bg-white/50 hover:bg-white/80 text-gray-600'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* 日历选择器 */}
            {showDatePicker && (
              <div className="absolute z-20 w-full mt-2 bg-white/95 backdrop-blur-md 
                              rounded-xl border border-gray-200 shadow-lg p-4"
              >
                {/* 月份导航 */}
                <div className="flex justify-between items-center mb-4">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ◀
                  </button>
                  <div className="font-medium text-gray-800">
                    {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ▶
                  </button>
                </div>

                {/* 星期标题 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                    <div key={day} className="text-center text-xs text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentMonth.getFullYear()
                    const month = currentMonth.getMonth()
                    const daysInMonth = getDaysInMonth(year, month)
                    const firstDay = getFirstDayOfMonth(year, month)
                    const today = formatDate(new Date())
                    
                    const days = []
                    // 空白填充
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<div key={`empty-${i}`} />)
                    }
                    
                    // 日期
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const selected = isSelected(dateStr)
                      const today = isToday(dateStr)
                      const past = isPastDate(dateStr)
                      
                      days.push(
                        <button
                          key={day}
                          type="button"
                          disabled={past}
                          onClick={() => selectDate(dateStr)}
                          className={`
                            py-2 rounded-lg text-sm transition-all relative
                            ${selected
                              ? 'bg-purple-500 text-white shadow-md font-medium'
                              : today
                                ? 'bg-purple-100 text-purple-700 font-medium'
                                : past
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'hover:bg-purple-50 text-gray-700'
                            }
                          `}
                        >
                          {day}
                          {today && !selected && (
                            <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 
                                            w-1 h-1 bg-purple-400 rounded-full" />
                          )}
                        </button>
                      )
                    }
                    return days
                  })()}
                </div>

                {/* 底部操作 */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => selectDate('')}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                  >
                    完成
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 天数 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                旅行天数 ⏱️
              </label>
              <span className="text-2xl font-bold gradient-text">{days} 天</span>
            </div>
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
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                预算 💰
              </label>
              <span className="text-2xl font-bold gradient-text">{budget} 元</span>
            </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              旅行偏好 🎨（多选）
            </label>
            <div className="flex flex-wrap gap-3">
              {preferenceOptions.map(pref => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => togglePreference(pref)}
                  className={`pref-tag px-5 py-2 rounded-full text-sm font-medium
                    ${preferences.includes(pref)
                      ? 'active'
                      : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200'
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
            disabled={loading || !destination.trim()}
            className="w-full py-4 btn-gradient text-white rounded-xl font-bold text-lg
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="loading-spinner h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="animate-pulse">正在规划最优路线...</span>
              </span>
            ) : (
              '✨ 生成旅行计划'
            )}
          </button>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-50/80 text-red-700 rounded-xl border border-red-200/50 flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                <p className="text-sm mt-1 text-red-600/70">
                  请检查网络连接后重试，或选择其他城市
                </p>
              </div>
              <button 
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 加载骨架屏 */}
      {loading && !plan && <SkeletonPlanView />}

      {/* 结果展示 */}
      {plan && <TravelPlanView plan={plan} onUpdate={updatedPlan => { setPlan(updatedPlan); addToast('行程已更新', 'success') }} />}
    </div>
  )
}

function TravelPlanView({ plan, onUpdate }: { plan: TravelPlan; onUpdate?: (plan: TravelPlan) => void }) {
  const [editMode, setEditMode] = useState(false)
  const [editingPlan, setEditingPlan] = useState(plan)
  const [draggedItem, setDraggedItem] = useState<{dayIndex: number; slot: string; poiIndex: number} | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTarget, setAddTarget] = useState<{dayIndex: number; slot: string} | null>(null)
  const [mapModeDay, setMapModeDay] = useState<number | null>(null)
  const { addToast } = useToast()

  // 当外部 plan 变化时更新
  useEffect(() => {
    setEditingPlan(plan)
  }, [plan])

  // 切换编辑模式
  const toggleEditMode = () => {
    if (editMode) {
      // 退出编辑模式，保存
      if (onUpdate) {
        onUpdate(editingPlan)
      }
      addToast('行程已保存', 'success')
    }
    setEditMode(!editMode)
  }

  // 删除景点
  const removePOI = (dayIndex: number, slot: 'morning' | 'afternoon' | 'evening', poiIndex: number) => {
    const newPlan = { ...editingPlan }
    const newDaily = [...newPlan.dailyPlans]
    const day = { ...newDaily[dayIndex] }
    const slotItems = [...day[slot]]
    
    slotItems.splice(poiIndex, 1)
    day[slot] = slotItems
    newDaily[dayIndex] = day
    newPlan.dailyPlans = newDaily
    
    setEditingPlan(newPlan)
    addToast('景点已删除', 'success')
  }

  // 拖拽开始
  const handleDragStart = (dayIndex: number, slot: string, poiIndex: number) => {
    setDraggedItem({ dayIndex, slot, poiIndex })
  }

  // 拖拽结束
  const handleDragOver = (e: React.DragEvent, dayIndex: number, slot: string, poiIndex: number) => {
    e.preventDefault()
  }

  // 放置
  const handleDrop = (e: React.DragEvent, targetDayIndex: number, targetSlot: string, targetPoiIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return

    const { dayIndex: srcDayIndex, slot: srcSlot, poiIndex: srcPoiIndex } = draggedItem
    
    if (srcDayIndex === targetDayIndex && srcSlot === targetSlot && srcPoiIndex === targetPoiIndex) {
      setDraggedItem(null)
      return
    }

    const newPlan = { ...editingPlan }
    const newDaily = [...newPlan.dailyPlans]
    
    // 获取源数据
    const srcDay = { ...newDaily[srcDayIndex] }
    const srcSlotItems = [...srcDay[srcSlot as keyof DailyPlan] as POI[]]
    const [movedPOI] = srcSlotItems.splice(srcPoiIndex, 1)
    srcDay[srcSlot as keyof DailyPlan] = srcSlotItems as any
    newDaily[srcDayIndex] = srcDay

    // 插入目标位置
    const targetDay = { ...newDaily[targetDayIndex] }
    const targetSlotItems = [...targetDay[targetSlot as keyof DailyPlan] as POI[]]
    targetSlotItems.splice(targetPoiIndex, 0, movedPOI)
    targetDay[targetSlot as keyof DailyPlan] = targetSlotItems as any
    newDaily[targetDayIndex] = targetDay

    newPlan.dailyPlans = newDaily
    setEditingPlan(newPlan)
    setDraggedItem(null)
    addToast('景点已调整', 'success')
  }

  // 添加自定义景点
  const addCustomPOI = (dayIndex: number, slot: 'morning' | 'afternoon' | 'evening', poiName: string) => {
    const newPOI: POI = {
      name: poiName,
      address: '自定义景点',
      location: '0,0',
      type: '自定义',
      rating: '5.0',
      cost: 0,
      timeNeeded: '1-2小时',
      description: '用户自定义添加的景点',
    }

    const newPlan = { ...editingPlan }
    const newDaily = [...newPlan.dailyPlans]
    const day = { ...newDaily[dayIndex] }
    const slotItems = [...day[slot]]
    
    slotItems.push(newPOI)
    day[slot] = slotItems
    newDaily[dayIndex] = day
    newPlan.dailyPlans = newDaily
    
    setEditingPlan(newPlan)
    setShowAddModal(false)
    setAddTarget(null)
    addToast(`已添加景点：${poiName}`, 'success')
  }

  const displayPlan = editMode ? editingPlan : plan

  return (
    <div className="mt-8 space-y-6 animate-fade-in-up">
      <div className="glass-card rounded-2xl p-8">
        {/* 头部 + 编辑按钮 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
            <h2 className="text-2xl font-bold gradient-text">
              {displayPlan.destination} 旅行计划
            </h2>
          </div>
          <button
            onClick={toggleEditMode}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              editMode
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            {editMode ? '✅ 保存行程' : '✏️ 调整行程'}
          </button>
        </div>

        {editMode && (
          <div className="mb-6 p-4 bg-blue-50/80 rounded-xl border border-blue-200/50">
            <div className="text-sm text-blue-700 flex items-center gap-2">
              <span>💡</span>
              <span>拖拽景点可调整顺序，点击 🗑️ 删除，点击 ➕ 添加新景点</span>
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="weather-card p-5 rounded-xl text-center">
            <div className="text-sm text-gray-600 mb-1">天数</div>
            <div className="text-3xl font-bold gradient-text">{displayPlan.days} 天</div>
          </div>
          <div className="weather-card p-5 rounded-xl text-center">
            <div className="text-sm text-gray-600 mb-1">总预算</div>
            <div className="text-3xl font-bold gradient-text">{displayPlan.budget} 元</div>
          </div>
          <div className="weather-card p-5 rounded-xl text-center">
            <div className="text-sm text-gray-600 mb-1">偏好</div>
            <div className="text-sm font-medium text-gray-700">
              {displayPlan.preferences.join('、') || '未选择'}
            </div>
          </div>
        </div>

        {/* 预算明细 */}
        {displayPlan.budgetBreakdown && (
          <div className="mb-6 bg-white/60 rounded-xl p-5 border border-gray-100/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">💰</span> 预算分配
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: '往返交通', value: displayPlan.budgetBreakdown.transport, icon: '🚄', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: '住宿', value: displayPlan.budgetBreakdown.accommodation, icon: '🏨', color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: '餐饮', value: displayPlan.budgetBreakdown.food, icon: '🍜', color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: '景点门票', value: displayPlan.budgetBreakdown.tickets, icon: '🎫', color: 'text-green-600', bg: 'bg-green-50' },
                { label: '其他/应急', value: displayPlan.budgetBreakdown.other, icon: '🛍️', color: 'text-gray-600', bg: 'bg-gray-50' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} rounded-xl p-3 text-center`}>
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className={`font-bold ${item.color}`}>{item.value} 元</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              共 {displayPlan.budgetBreakdown.total} 元 · 已分配 {displayPlan.budgetBreakdown.transport + displayPlan.budgetBreakdown.accommodation + displayPlan.budgetBreakdown.food + displayPlan.budgetBreakdown.tickets + displayPlan.budgetBreakdown.other} 元
            </div>
          </div>
        )}

        {/* 天气 */}
        {displayPlan.weather?.forecasts?.[0]?.casts && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🌤</span> 天气预报
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {displayPlan.weather.forecasts[0].casts.slice(0, 3).map((cast: any, i: number) => (
                <div key={i} className="weather-card p-4 rounded-xl text-center">
                  <div className="text-sm text-gray-500 mb-2">第 {i + 1} 天</div>
                  <div className="text-2xl mb-1">{getWeatherEmoji(cast.dayweather)}</div>
                  <div className="text-lg font-medium">{cast.dayweather}</div>
                  <div className="text-sm text-gray-600">{cast.daytemp}°C</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 酒店推荐 */}
        {displayPlan.hotel && (
          <div className="mb-6 bg-white/60 rounded-xl p-5 border border-gray-100/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🏨</span> 住宿推荐
            </h3>
            <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-gray-100/50">
              <div className="text-4xl">🏨</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-800">{displayPlan.hotel.name}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{displayPlan.hotel.type}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⭐ {displayPlan.hotel.rating}</span>
                </div>
                <div className="text-sm text-gray-500">{displayPlan.hotel.address}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {displayPlan.hotel.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 餐厅推荐 */}
        {displayPlan.restaurants && displayPlan.restaurants.length > 0 && (
          <div className="mb-6 bg-white/60 rounded-xl p-5 border border-gray-100/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🍜</span> 美食推荐
            </h3>
            <div className="space-y-3">
              {displayPlan.restaurants.map((restaurant, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-gray-100/50">
                  <div className="text-3xl">🍽️</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{restaurant.name}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">⭐ {restaurant.rating}</span>
                    </div>
                    <div className="text-sm text-gray-500">{restaurant.address}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {restaurant.tags.map((tag, j) => (
                        <span key={j} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 每日行程 - 可编辑 */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-2xl">📅</span> 每日行程
          </h3>
          {displayPlan.dailyPlans.map((daily, dayIndex) => (
            <div key={daily.day} className="day-card rounded-xl p-6 hover-lift">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-lg gradient-text">
                  Day {daily.day}：{getDayTheme(daily.day, displayPlan.days)}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMapModeDay(mapModeDay === daily.day ? null : daily.day)}
                    className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full transition-colors"
                  >
                    {mapModeDay === daily.day ? '✕ 关闭地图' : '🗺️ 地图模式'}
                  </button>
                  <span className="text-sm text-gray-500 bg-white/60 px-3 py-1 rounded-full">
                    预计花费：{daily.costs.total} 元
                  </span>
                </div>
              </div>

              {/* 地图模式 */}
              {mapModeDay === daily.day && (
                <div className="mb-4 animate-fade-in-up">
                  <MapView
                    pois={[
                      ...daily.morning.map((p, i) => ({ ...p, timeSlot: '上午', index: i })),
                      ...daily.afternoon.map((p, i) => ({ ...p, timeSlot: '下午', index: i + daily.morning.length })),
                      ...daily.evening.map((p, i) => ({ ...p, timeSlot: '晚上', index: i + daily.morning.length + daily.afternoon.length })),
                    ]}
                    city={displayPlan.destination}
                  />
                </div>
              )}

              {/* 天气联动提示 */}
              {daily.weather?.type === 'rain' && (
                <div className="mb-4 bg-blue-50/80 border border-blue-200/50 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-xl">🌧️</span>
                  <span className="text-sm text-blue-700">
                    今天{daily.weather.text}，已优先安排室内景点，记得带伞！
                  </span>
                </div>
              )}

              <div className="space-y-5">
                {editMode ? (
                  <>
                    <EditableTimeSlotSection
                      title="上午 ☀️"
                      pois={daily.morning}
                      dayIndex={dayIndex}
                      slot="morning"
                      editMode={editMode}
                      onRemove={removePOI}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onAdd={() => { setAddTarget({ dayIndex, slot: 'morning' }); setShowAddModal(true) }}
                    />
                    <EditableTimeSlotSection
                      title="下午 🌤️"
                      pois={daily.afternoon}
                      dayIndex={dayIndex}
                      slot="afternoon"
                      editMode={editMode}
                      onRemove={removePOI}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onAdd={() => { setAddTarget({ dayIndex, slot: 'afternoon' }); setShowAddModal(true) }}
                    />
                    <EditableTimeSlotSection
                      title="晚上 🌙"
                      pois={daily.evening}
                      dayIndex={dayIndex}
                      slot="evening"
                      editMode={editMode}
                      onRemove={removePOI}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onAdd={() => { setAddTarget({ dayIndex, slot: 'evening' }); setShowAddModal(true) }}
                    />
                  </>
                ) : (
                  <>
                    {daily.morning.length > 0 && (
                      <TimeSlotSection title="上午 ☀️" pois={daily.morning} />
                    )}
                    {daily.afternoon.length > 0 && (
                      <TimeSlotSection title="下午 🌤️" pois={daily.afternoon} />
                    )}
                    {daily.evening.length > 0 && (
                      <TimeSlotSection title="晚上 🌙" pois={daily.evening} />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 旅行建议 */}
        {displayPlan.tips.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-yellow-50/80 to-orange-50/80 p-6 rounded-xl border border-yellow-200/30">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span> 旅行建议
            </h3>
            <ul className="space-y-2">
              {displayPlan.tips.map((tip, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start">
                  <span className="mr-2 text-yellow-500">✦</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 添加自定义景点弹窗 */}
      {showAddModal && addTarget && (
        <AddCustomPOIModal
          onAdd={(name) => addCustomPOI(addTarget.dayIndex, addTarget.slot as 'morning' | 'afternoon' | 'evening', name)}
          onClose={() => { setShowAddModal(false); setAddTarget(null) }}
        />
      )}
    </div>
  )
}

function AddCustomPOIModal({ onAdd, onClose }: { onAdd: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-6 w-full max-w-md animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>➕</span> 添加自定义景点
        </h3>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="输入景点名称"
          className="w-full px-4 py-3 bg-white/80 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) {
              onAdd(name.trim())
            }
            if (e.key === 'Escape') {
              onClose()
            }
          }}
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => name.trim() && onAdd(name.trim())}
            disabled={!name.trim()}
            className="px-4 py-2 btn-gradient text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  )
}

function EditableTimeSlotSection({
  title,
  pois,
  dayIndex,
  slot,
  editMode,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onAdd
}: {
  title: string
  pois: POI[]
  dayIndex: number
  slot: string
  editMode: boolean
  onRemove: (dayIndex: number, slot: 'morning' | 'afternoon' | 'evening', poiIndex: number) => void
  onDragStart: (dayIndex: number, slot: string, poiIndex: number) => void
  onDragOver: (e: React.DragEvent, dayIndex: number, slot: string, poiIndex: number) => void
  onDrop: (e: React.DragEvent, dayIndex: number, slot: string, poiIndex: number) => void
  onAdd: () => void
}) {
  if (!editMode && pois.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        {editMode && (
          <button
            onClick={onAdd}
            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-full transition-colors"
          >
            ➕ 添加
          </button>
        )}
      </div>
      <div className="space-y-3">
        {pois.map((poi, i) => (
          <div
            key={`${dayIndex}-${slot}-${i}-${poi.name}`}
            draggable={editMode}
            onDragStart={() => onDragStart(dayIndex, slot, i)}
            onDragOver={(e) => onDragOver(e, dayIndex, slot, i)}
            onDrop={(e) => onDrop(e, dayIndex, slot, i)}
            className={`poi-card p-4 rounded-xl border border-gray-100/50 ${
              editMode ? 'cursor-move hover:shadow-lg transition-all' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {editMode && (
                <div className="text-gray-400 mt-1 cursor-grab active:cursor-grabbing">
                  ⋮⋮
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-800 text-lg">{poi.name}</div>
                  {editMode && (
                    <button
                      onClick={() => onRemove(dayIndex, slot as 'morning' | 'afternoon' | 'evening', i)}
                      className="text-red-400 hover:text-red-600 transition-colors text-sm"
                      title="删除"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                
                {poi.description && (
                  <div className="text-sm text-gray-600 mt-2 leading-relaxed">{poi.description}</div>
                )}
                <div className="text-sm text-gray-500 mt-2">{poi.address}</div>
                <div className="flex items-center gap-3 mt-3 text-sm">
                  <span className="flex items-center gap-1 text-orange-500">
                    <span>⭐</span>
                    <span className="font-medium">{poi.rating}</span>
                  </span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <span>⏱</span>
                    <span>{poi.timeNeeded}</span>
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <span>💰</span>
                    <span className="font-medium">{poi.cost} 元</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {editMode && pois.length === 0 && (
          <div className="p-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-center">
            <span className="text-sm text-gray-400">暂无景点，点击「添加」按钮</span>
          </div>
        )}
      </div>
    </div>
  )
}

function getDayTheme(day: number, totalDays: number): string {
  const themes: Record<number, string[]> = {
    1: ['初识城市', '轻松开场', '城市探索'],
    2: ['深度游玩', '核心景点', '文化体验'],
    3: ['自然风光', '户外探险', '休闲度假'],
  }
  return themes[day]?.[0] || '精彩继续'
}

function TimeSlotSection({ title, pois }: { title: string; pois: any[] }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-600 mb-2">{title}</div>
      <div className="space-y-3">
        {pois.map((poi, i) => (
          <POICard key={i} poi={poi} />
        ))}
      </div>
    </div>
  )
}

function POICard({ poi }: { poi: any }) {
  return (
    <div className="poi-card p-4 rounded-xl hover-lift border border-gray-100/50">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-bold text-gray-800 text-lg">{poi.name}</div>
          
          {/* AI 描述 */}
          {poi.description && (
            <div className="text-sm text-gray-600 mt-2 leading-relaxed">
              {poi.description}
            </div>
          )}
          
          <div className="text-sm text-gray-500 mt-2">{poi.address}</div>
          
          {/* 标签 */}
          <div className="flex items-center gap-3 mt-3 text-sm">
            <span className="flex items-center gap-1 text-orange-500">
              <span>⭐</span>
              <span className="font-medium">{poi.rating}</span>
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              <span>⏱</span>
              <span>{poi.timeNeeded}</span>
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <span>💰</span>
              <span className="font-medium">{poi.cost} 元</span>
            </span>
          </div>
          
          {/* AI 增强内容 */}
          {poi.mustDo && poi.mustDo.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-medium text-purple-600 mb-1">✨ 必做</div>
              <div className="flex flex-wrap gap-1">
                {poi.mustDo.map((item: string, i: number) => (
                  <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {poi.photoSpots && poi.photoSpots.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-blue-600 mb-1">📸 拍照</div>
              <div className="flex flex-wrap gap-1">
                {poi.photoSpots.map((item: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {poi.avoid && poi.avoid.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-red-600 mb-1">⚠️ 避坑</div>
              <div className="flex flex-wrap gap-1">
                {poi.avoid.map((item: string, i: number) => (
                  <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {poi.foodNearby && poi.foodNearby.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-green-600 mb-1">🍜 美食</div>
              <div className="flex flex-wrap gap-1">
                {poi.foodNearby.map((item: string, i: number) => (
                  <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getWeatherEmoji(weather: string): string {
  const map: Record<string, string> = {
    '晴': '☀️',
    '多云': '⛅',
    '阴': '☁️',
    '小雨': '🌦️',
    '中雨': '🌧️',
    '大雨': '⛈️',
    '雪': '❄️',
    '雾': '🌫️',
  }
  return map[weather] || '🌤️'
}