/**
 * 旅行计划生成算法
 */

import { getWeather, searchPOI, geocode, planDrivingRoute } from './amap'

export interface TravelPlan {
  destination: string
  days: number
  budget: number
  preferences: string[]
  weather: any
  dailyPlans: DailyPlan[]
  tips: string[]
}

export interface DailyPlan {
  day: number
  morning: POI[]
  afternoon: POI[]
  evening: POI[]
  weather: any
  totalCost: number
}

export interface POI {
  name: string
  address: string
  location: string
  type: string
  rating: string
  cost: number
  timeNeeded: string
  photo?: string
  distance?: string
  tips?: string
}

/**
 * 生成旅行计划
 */
export async function generateTravelPlan(
  destination: string,
  days: number,
  budget: number,
  preferences: string[]
): Promise<TravelPlan> {
  // 1. 获取天气
  const weather = await getWeather(destination)

  // 2. 获取地理编码
  const geo = await geocode(destination)
  const location = geo.geocodes?.[0]?.location

  // 3. 根据偏好搜索景点
  const allPOIs: POI[] = []
  const keywords = getKeywordsByPreferences(preferences)

  for (const keyword of keywords) {
    const pois = await searchPOI(keyword, destination)
    if (pois.pois) {
      allPOIs.push(...pois.pois.map((p: any) => ({
        name: p.name,
        address: p.address,
        location: p.location,
        type: p.type,
        rating: p.biz_ext?.rating || '4.0',
        cost: estimateCost(p.type),
        timeNeeded: estimateTime(p.type),
      })))
    }
  }

  // 4. 去重和排序
  const uniquePOIs = deduplicateAndSort(allPOIs)

  // 5. 分配到每日
  const dailyPlans = assignToDays(uniquePOIs, days, budget)

  // 6. 生成建议
  const tips = generateTips(weather, preferences, budget)

  return {
    destination,
    days,
    budget,
    preferences,
    weather,
    dailyPlans,
    tips,
  }
}

/**
 * 根据偏好获取关键词
 */
function getKeywordsByPreferences(preferences: string[]): string[] {
  const keywordMap: Record<string, string[]> = {
    '自然风光': ['自然', '公园', '山', '湖', '森林', '景区'],
    '人文历史': ['博物馆', '历史', '古迹', '寺庙', '古建筑'],
    '美食': ['美食', '小吃', '美食街', '餐厅'],
    '购物': ['购物', '商业街', '商场', '步行街'],
    '亲子': ['公园', '动物园', '游乐园', '科技馆'],
    '休闲': ['温泉', 'SPA', '咖啡馆', '茶室'],
  }

  const keywords: string[] = []
  for (const pref of preferences) {
    if (keywordMap[pref]) {
      keywords.push(...keywordMap[pref])
    }
  }

  // 默认关键词
  if (keywords.length === 0) {
    keywords.push('景点', '景区', '旅游')
  }

  return keywords
}

/**
 * 去重和排序
 */
function deduplicateAndSort(pois: POI[]): POI[] {
  const seen = new Set()
  const unique = pois.filter(poi => {
    if (seen.has(poi.name)) return false
    seen.add(poi.name)
    return true
  })

  return unique.sort((a, b) => {
    const ratingA = parseFloat(a.rating) || 0
    const ratingB = parseFloat(b.rating) || 0
    return ratingB - ratingA
  }).slice(0, 50) // 最多50个景点
}

/**
 * 估算费用
 */
function estimateCost(type: string): number {
  if (type.includes('博物馆')) return 0
  if (type.includes('公园')) return 20
  if (type.includes('自然') || type.includes('景区')) return 80
  if (type.includes('寺庙')) return 10
  if (type.includes('游乐园')) return 200
  return 50
}

/**
 * 估算时间
 */
function estimateTime(type: string): string {
  if (type.includes('博物馆')) return '2-3小时'
  if (type.includes('公园')) return '1-2小时'
  if (type.includes('自然') || type.includes('景区')) return '3-5小时'
  if (type.includes('寺庙')) return '1-2小时'
  if (type.includes('美食') || type.includes('购物')) return '1-2小时'
  return '2-3小时'
}

/**
 * 分配到每日
 */
function assignToDays(pois: POI[], days: number, budget: number): DailyPlan[] {
  const dailyBudget = budget / days
  const dailyPlans: DailyPlan[] = []

  // 按地理位置分组
  const groups: POI[][] = []
  const groupSize = Math.ceil(pois.length / days)
  
  for (let i = 0; i < days; i++) {
    const start = i * groupSize
    const end = start + groupSize
    groups.push(pois.slice(start, end))
  }

  for (let day = 0; day < days; day++) {
    const dayPOIs = groups[day] || []
    const morning = dayPOIs.slice(0, 2)
    const afternoon = dayPOIs.slice(2, 4)
    const evening = dayPOIs.slice(4, 5)

    const totalCost = [...morning, ...afternoon, ...evening].reduce(
      (sum, poi) => sum + poi.cost, 0
    )

    dailyPlans.push({
      day: day + 1,
      morning,
      afternoon,
      evening,
      weather: null,
      totalCost,
    })
  }

  return dailyPlans
}

/**
 * 生成建议
 */
function generateTips(weather: any, preferences: string[], budget: number): string[] {
  const tips: string[] = []

  // 天气建议
  if (weather.forecasts) {
    const forecast = weather.forecasts[0]
    tips.push(`目的地${forecast.city}，未来天气${forecast.casts?.[0]?.dayweather}，温度${forecast.casts?.[0]?.daytemp}°C`)
  }

  // 预算建议
  if (budget < 1000) {
    tips.push('预算较紧张，建议选择免费景点，控制餐饮费用')
  } else if (budget < 3000) {
    tips.push('预算适中，可以适当安排一些特色体验')
  } else {
    tips.push('预算充足，可以安排高端体验')
  }

  // 偏好建议
  if (preferences.includes('美食')) {
    tips.push('推荐尝试当地特色小吃，但要注意饮食卫生')
  }
  if (preferences.includes('自然风光')) {
    tips.push('建议穿舒适的运动鞋，带好防晒和防蚊用品')
  }

  return tips
}
