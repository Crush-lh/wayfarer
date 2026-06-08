/**
 * 旅行计划生成算法
 */

import { getWeather, geocode } from './amap'
import { getCachedAttractions, saveAttractions } from './supabase'

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

  // 2. 尝试从 Supabase 获取缓存景点
  let uniquePOIs = await getCachedAttractions(destination, preferences)

  // 3. 如果没有缓存，尝试从高德搜索
  if (!uniquePOIs) {
    uniquePOIs = await fetchFromAMap(destination, preferences)
    
    // 4. 保存到 Supabase
    if (uniquePOIs) {
      await saveAttractions(uniquePOIs.map(poi => ({
        name: poi.name,
        city: destination,
        address: poi.address,
        location: poi.location,
        type: poi.type,
        rating: parseFloat(poi.rating) || 4.0,
        cost: poi.cost,
        time_needed: poi.timeNeeded,
        keywords: preferences,
      })))
    }
  }

  // 5. 如果还没有，使用默认数据
  if (!uniquePOIs) {
    uniquePOIs = getDefaultAttractions(destination, preferences)
  }

  // 6. 分配到每日
  const dailyPlans = assignToDays(uniquePOIs as POI[], days, budget)

  // 7. 生成建议
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
 * 从高德地图获取景点
 */
async function fetchFromAMap(destination: string, preferences: string[]): Promise<POI[] | null> {
  try {
    const allPOIs: POI[] = []
    const keywords = getKeywordsByPreferences(preferences)

    for (const keyword of keywords) {
      const res = await fetch(
        `https://restapi.amap.com/v3/place/text?key=${process.env.AMAP_API_KEY}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(destination)}&offset=20&page=1&extensions=all`
      )
      
      if (!res.ok) continue
      
      const pois = await res.json()
      if (pois.pois && pois.status === '1') {
        allPOIs.push(...pois.pois.map((p: any) => ({
          name: p.name,
          address: p.address || '地址未知',
          location: p.location,
          type: p.type,
          rating: p.biz_ext?.rating || '4.0',
          cost: estimateCost(p.type),
          timeNeeded: estimateTime(p.type),
        })))
      }
    }

    if (allPOIs.length === 0) return null

    return deduplicateAndSort(allPOIs)
  } catch (error) {
    console.error('高德 API 调用失败:', error)
    return null
  }
}

/**
 * 默认景点数据（离线备选）
 */
function getDefaultAttractions(destination: string, preferences: string[]): POI[] {
  const defaultData: Record<string, POI[]> = {
    '北京': [
      { name: '故宫博物院', address: '东城区景山前街4号', location: '116.397026,39.918058', type: '人文历史', rating: '4.9', cost: 60, timeNeeded: '3-5小时' },
      { name: '天安门广场', address: '东城区东长安街', location: '116.397027,39.903183', type: '人文历史', rating: '4.8', cost: 0, timeNeeded: '1-2小时' },
      { name: '颐和园', address: '海淀区新建宫门路19号', location: '116.272376,39.992816', type: '自然风光', rating: '4.8', cost: 30, timeNeeded: '3-4小时' },
      { name: '八达岭长城', address: '延庆区G6京藏高速58号', location: '116.016901,40.353356', type: '自然风光', rating: '4.8', cost: 40, timeNeeded: '4-5小时' },
      { name: '天坛公园', address: '东城区天坛东里甲1号', location: '116.407265,39.883452', type: '人文历史', rating: '4.7', cost: 15, timeNeeded: '2-3小时' },
      { name: '南锣鼓巷', address: '东城区南锣鼓巷', location: '116.399312,39.932512', type: '美食', rating: '4.5', cost: 0, timeNeeded: '2-3小时' },
      { name: '王府井', address: '东城区王府井大街', location: '116.410227,39.910958', type: '购物', rating: '4.5', cost: 0, timeNeeded: '2-3小时' },
      { name: '798艺术区', address: '朝阳区酒仙桥路4号', location: '116.496816,39.985203', type: '人文历史', rating: '4.6', cost: 0, timeNeeded: '2-3小时' },
    ],
    '杭州': [
      { name: '西湖', address: '西湖区龙井路1号', location: '120.12783,30.239655', type: '自然风光', rating: '4.9', cost: 0, timeNeeded: '3-5小时' },
      { name: '灵隐寺', address: '西湖区灵隐路法云弄1号', location: '120.097856,30.240008', type: '人文历史', rating: '4.8', cost: 75, timeNeeded: '2-3小时' },
      { name: '宋城', address: '西湖区之江路148号', location: '120.107891,30.1885', type: '人文历史', rating: '4.6', cost: 320, timeNeeded: '4-5小时' },
      { name: '河坊街', address: '上城区河坊街', location: '120.168583,30.242056', type: '美食', rating: '4.5', cost: 0, timeNeeded: '2-3小时' },
      { name: '西溪湿地', address: '西湖区天目山路518号', location: '120.062,30.268', type: '自然风光', rating: '4.7', cost: 80, timeNeeded: '3-4小时' },
    ],
    '成都': [
      { name: '武侯祠', address: '武侯区武侯祠大街231号', location: '104.044894,30.641839', type: '人文历史', rating: '4.7', cost: 50, timeNeeded: '2-3小时' },
      { name: '宽窄巷子', address: '青羊区金河路口', location: '104.055,30.662', type: '美食', rating: '4.6', cost: 0, timeNeeded: '2-3小时' },
      { name: '大熊猫繁育基地', address: '成华区熊猫大道1375号', location: '104.146,30.733', type: '亲子', rating: '4.8', cost: 55, timeNeeded: '3-4小时' },
      { name: '锦里', address: '武侯区武侯祠大街231号', location: '104.044,30.641', type: '美食', rating: '4.5', cost: 0, timeNeeded: '2-3小时' },
      { name: '春熙路', address: '锦江区春熙路', location: '104.082,30.657', type: '购物', rating: '4.6', cost: 0, timeNeeded: '2-3小时' },
    ],
  }

  // 返回城市数据或通用数据
  const cityData = defaultData[destination] || [
    { name: `${destination}市中心`, address: '市中心', location: '0,0', type: '人文历史', rating: '4.0', cost: 0, timeNeeded: '2-3小时' },
    { name: `${destination}博物馆`, address: '市区', location: '0,0', type: '人文历史', rating: '4.5', cost: 0, timeNeeded: '2-3小时' },
    { name: `${destination}公园`, address: '市区', location: '0,0', type: '自然风光', rating: '4.0', cost: 0, timeNeeded: '2-3小时' },
    { name: `${destination}美食街`, address: '市区', location: '0,0', type: '美食', rating: '4.0', cost: 0, timeNeeded: '2-3小时' },
  ]

  // 根据偏好过滤
  if (preferences.length === 0) return cityData

  return cityData.filter(poi => 
    preferences.some(pref => {
      const keywordMap: Record<string, string[]> = {
        '自然风光': ['自然', '公园', '湖', '山', '湿地'],
        '人文历史': ['历史', '博物馆', '古', '寺', '街', '祠'],
        '美食': ['美食', '街', '吃'],
        '购物': ['购物', '街', '路'],
        '亲子': ['公园', '动物', '熊猫'],
        '休闲': ['公园', '艺术'],
      }
      return keywordMap[pref]?.some(k => poi.type.includes(k) || poi.name.includes(k))
    }) || true
  )
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
