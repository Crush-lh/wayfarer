/**
 * 旅行计划生成算法
 */

import { getWeather, geocode } from './amap'
import { getCachedAttractions, saveAttractions } from './supabase'

export interface Hotel {
  name: string
  address: string
  rating: string
  price?: string
  type: '豪华' | '商务' | '舒适' | '经济'
  tags: string[]
}

export interface Restaurant {
  name: string
  address: string
  rating: string
  type: string
  tags: string[]
  cost: number
}

export interface TravelPlan {
  destination: string
  days: number
  budget: number
  preferences: string[]
  weather: any
  dailyPlans: DailyPlan[]
  budgetBreakdown: BudgetBreakdown
  tips: string[]
  hotel?: Hotel
  restaurants?: Restaurant[]
}

export interface DailyPlan {
  day: number
  morning: POI[]
  afternoon: POI[]
  evening: POI[]
  weather: any
  costs: DailyCost
}

export interface DailyCost {
  accommodation: number
  food: number
  tickets: number
  transport: number
  other: number
  total: number
}

export interface BudgetBreakdown {
  transport: number      // 往返交通
  accommodation: number  // 住宿
  food: number           // 餐饮
  tickets: number        // 景点门票
  other: number          // 其他/应急
  total: number
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
  // AI 增强内容
  description?: string
  mustDo?: string[]
  photoSpots?: string[]
  avoid?: string[]
  foodNearby?: string[]
}

/**
 * 根据每日住宿预算判断档次
 */
function getAccommodationTier(budgetPerNight: number): '豪华' | '商务' | '舒适' | '经济' {
  if (budgetPerNight >= 500) return '豪华'
  if (budgetPerNight >= 300) return '商务'
  if (budgetPerNight >= 150) return '舒适'
  return '经济'
}

/**
 * 根据每日餐饮预算判断档次
 */
function getFoodTier(budgetPerDay: number): '高档' | '中档' | '经济' {
  if (budgetPerDay >= 150) return '高档'
  if (budgetPerDay >= 80) return '中档'
  return '经济'
}

/**
 * 搜索酒店推荐
 */
async function fetchHotels(destination: string, budgetPerNight: number): Promise<Hotel[]> {
  const tier = getAccommodationTier(budgetPerNight)
  const keywords: Record<string, string[]> = {
    '豪华': ['五星酒店', '豪华酒店'],
    '商务': ['连锁酒店', '商务酒店'],
    '舒适': ['精品酒店', '主题酒店'],
    '经济': ['快捷酒店', '经济酒店'],
  }

  const allHotels: Hotel[] = []
  for (const keyword of keywords[tier]) {
    try {
      const res = await fetch(
        `https://restapi.amap.com/v3/place/text?key=${process.env.AMAP_API_KEY}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(destination)}&types=100000&offset=10&page=1&extensions=all`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.pois && data.status === '1') {
        for (const p of data.pois) {
          allHotels.push({
            name: p.name,
            address: p.address || '地址未知',
            rating: p.biz_ext?.rating || '4.0',
            type: tier,
            tags: [tier, ...(p.type?.split(';') || []).slice(0, 2)],
          })
        }
      }
    } catch (e) {
      console.error('搜索酒店失败:', keyword, e)
    }
  }

  // 去重并按评分排序，取前3个
  const seen = new Set<string>()
  return allHotels
    .filter(h => { if (seen.has(h.name)) return false; seen.add(h.name); return true; })
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, 3)
}

/**
 * 搜索餐厅推荐
 */
async function fetchRestaurants(destination: string, foodTier: '高档' | '中档' | '经济'): Promise<Restaurant[]> {
  const keywords: Record<string, string[]> = {
    '高档': ['高端餐厅', '特色餐厅', '私房菜'],
    '中档': ['网红餐厅', '人气餐厅', '推荐餐厅'],
    '经济': ['特色小吃', '美食街', '老字号'],
  }

  const allRestaurants: Restaurant[] = []
  for (const keyword of keywords[foodTier]) {
    try {
      const res = await fetch(
        `https://restapi.amap.com/v3/place/text?key=${process.env.AMAP_API_KEY}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(destination)}&types=050000&offset=10&page=1&extensions=all`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.pois && data.status === '1') {
        for (const p of data.pois) {
          allRestaurants.push({
            name: p.name,
            address: p.address || '地址未知',
            rating: p.biz_ext?.rating || '4.0',
            type: p.type || '餐饮',
            tags: [foodTier, ...(p.type?.split(';') || []).slice(0, 2)],
            cost: estimateRestaurantCost(foodTier),
          })
        }
      }
    } catch (e) {
      console.error('搜索餐厅失败:', keyword, e)
    }
  }

  // 去重并按评分排序，取前5个
  const seen = new Set<string>()
  return allRestaurants
    .filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; })
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, 5)
}

function estimateRestaurantCost(tier: '高档' | '中档' | '经济'): number {
  const map = { '高档': 200, '中档': 80, '经济': 30 }
  return map[tier]
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
    console.log('未找到缓存，从高德获取景点...')
    uniquePOIs = await fetchFromAMap(destination, preferences)
    console.log('高德返回景点数:', uniquePOIs?.length || 0)
    
    // 4. 保存到 Supabase
    if (uniquePOIs && uniquePOIs.length > 0) {
      console.log('准备保存到 Supabase...')
      try {
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
        console.log('保存成功!')
      } catch (e) {
        console.error('保存到 Supabase 失败:', e)
      }
    }
  }

  // 5. 如果还没有，使用默认数据
  if (!uniquePOIs) {
    uniquePOIs = getDefaultAttractions(destination, preferences)
  }

  // 6. 分配到每日（先分配，再增强实际使用的景点）
  const dailyPlans = assignToDays(uniquePOIs as POI[], days, budget, weather)

  // 7. 收集实际使用的景点（限制数量），只增强这些
  const usedPOIs = new Set<string>()
  dailyPlans.forEach(day => {
    [...day.morning, ...day.afternoon, ...day.evening].forEach(poi => {
      usedPOIs.add(poi.name)
    })
  })

  // 8. 只增强实际使用的景点（最多6个，避免超时）
  const usedPOIList = uniquePOIs.filter(poi => usedPOIs.has(poi.name)).slice(0, 6)
  
  // 并行增强
  const enrichedMap = new Map<string, POI>()
  const enrichedBatch = await Promise.all(
    usedPOIList.map(poi => enrichSinglePOI(poi, destination))
  )
  enrichedBatch.forEach((enriched) => {
    enrichedMap.set(enriched.name, enriched)
  })

  // 9. 将增强后的数据填充回 dailyPlans
  dailyPlans.forEach(day => {
    day.morning = day.morning.map(poi => enrichedMap.get(poi.name) || poi)
    day.afternoon = day.afternoon.map(poi => enrichedMap.get(poi.name) || poi)
    day.evening = day.evening.map(poi => enrichedMap.get(poi.name) || poi)
  })

  // 10. 生成费用明细
  const budgetBreakdown = calculateBudgetBreakdown(destination, days, budget, dailyPlans)

  // 11. 搜索酒店和餐厅推荐（并行）
  const accPerNight = days > 1 ? Math.round(budgetBreakdown.accommodation / (days - 1)) : budgetBreakdown.accommodation
  const foodPerDay = days > 0 ? Math.round(budgetBreakdown.food / days) : 0
  const foodTier = getFoodTier(foodPerDay)

  const [hotelList, restaurantList] = await Promise.all([
    fetchHotels(destination, accPerNight),
    fetchRestaurants(destination, foodTier),
  ])

  // 12. 生成建议
  const tips = generateTips(weather, preferences, budget, budgetBreakdown)

  return {
    destination,
    days,
    budget,
    preferences,
    weather,
    dailyPlans,
    budgetBreakdown,
    tips,
    hotel: hotelList[0] || undefined,
    restaurants: restaurantList.length > 0 ? restaurantList : undefined,
  }
}

/**
 * 增强单个景点
 */
async function enrichSinglePOI(poi: POI, destination: string): Promise<POI> {
  try {
    const content = await generateAIContentDirect(poi.name, destination, poi.type)
    return {
      ...poi,
      description: content.description,
      tips: content.tips,
      mustDo: content.must_do,
      photoSpots: content.photo_spots,
      avoid: content.avoid,
      foodNearby: content.food_nearby,
    }
  } catch (e) {
    console.error('AI 增强失败:', poi.name, e)
    return poi
  }
}

// 直接生成 AI 内容（服务端调用）
async function generateAIContentDirect(name: string, city: string, type: string) {
  // 通用 AI API 配置（兼容 OpenAI 格式）
  const apiKey = process.env.OPENAI_API_KEY
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || 'deepseek-chat'

  if (apiKey) {
    try {
      const res = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的旅行攻略作者，擅长为景点生成详细、实用的攻略内容。'
            },
            {
              role: 'user',
              content: `请为"${city}的${name}"生成旅行攻略内容，景点类型：${type}

请按以下格式返回 JSON：
{
  "description": "景点详细介绍（100-150字）",
  "tips": ["游玩建议1", "游玩建议2", "游玩建议3"],
  "must_do": ["必做事项1", "必做事项2"],
  "photo_spots": ["拍照打卡点1", "拍照打卡点2"],
  "avoid": ["避坑指南1", "避坑指南2"],
  "food_nearby": ["附近美食推荐1", "附近美食推荐2"]
}`
            }
          ],
          temperature: 0.7,
        }),
      })

      if (!res.ok) throw new Error('AI API 调用失败')

      const data = await res.json()
      const content = data.choices[0]?.message?.content

      // 解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('AI 调用失败:', e)
    }
  }

  // 使用模拟数据
  return generateMockContent(name, city, type)
}

// 模拟数据（无 DeepSeek Key 时使用）
function generateMockContent(name: string, city: string, type: string) {
  const templates: Record<string, any> = {
    '自然风光': {
      description: `${name}是${city}著名的自然风光景区，景色优美，适合四季游玩。建议预留充足时间，慢慢欣赏。`,
      tips: ['建议早上前往，避开人流高峰', '穿舒适的鞋子，需要步行较长距离', '带好防晒和防蚊用品'],
      must_do: ['登顶俯瞰全景', '拍照打卡日落', '沿湖/沿山徒步'],
      photo_spots: ['观景台全景', '日出/日落时分', '特色地标建筑'],
      avoid: ['周末节假日人很多', '不要正午时分暴晒时段游玩'],
      food_nearby: ['景区附近农家乐', '特色小吃街'],
    },
    '人文历史': {
      description: `${name}是${city}重要的历史文化景点，承载着丰富的历史底蕴。建议请导游或租借讲解器，深入了解。`,
      tips: ['建议提前了解历史背景', '穿得体服装，尊重文化场所', '预留至少2-3小时'],
      must_do: ['参观核心建筑/文物', '听讲解了解历史', '购买文创纪念品'],
      photo_spots: ['标志性建筑', '古建筑细节', '文创展示区'],
      avoid: ['不要触摸文物', '避开旅游团高峰时段', '不要大声喧哗'],
      food_nearby: ['老字号餐厅', '传统小吃店'],
    },
    '风景名胜': {
      description: `${name}是${city}著名的风景名胜，集自然景观与人文历史于一体。建议提前规划路线，穿舒适鞋子。`,
      tips: ['建议早上8点前到达', '穿运动鞋，需要步行', '带好相机和充电宝'],
      must_do: ['打卡标志性景点', '俯瞰全景', '体验特色活动'],
      photo_spots: ['最高点全景', '特色建筑', '自然奇观'],
      avoid: ['不要节假日去', '不要带太多行李', '注意防晒'],
      food_nearby: ['景区餐厅', '附近美食街'],
    },
    '美食': {
      description: `${name}是${city}著名的美食街区/餐厅，汇聚了当地特色小吃。建议空腹前往，多尝试几种。`,
      tips: ['建议避开饭点高峰', '多尝试几家店', '带现金，有些老店不支持移动支付'],
      must_do: ['品尝招牌菜', '逛完整条街', '买伴手礼'],
      photo_spots: ['美食特写', '街道全景', '排队人群'],
      avoid: ['不要被拉客的店吸引', '注意卫生条件', '不要一次点太多'],
      food_nearby: ['本身就是美食区', '附近商圈'],
    },
  }

  // 根据类型匹配模板
  for (const [key, template] of Object.entries(templates)) {
    if (type.includes(key)) return template
  }

  return templates['自然风光']
}

/**
 * 从高德地图获取景点
 */
async function fetchFromAMap(destination: string, preferences: string[]): Promise<POI[] | null> {
  try {
    const allPOIs: POI[] = []
    
    // 只取第一个关键词，减少请求
    const keyword = getKeywordsByPreferences(preferences)[0] || '景点'
    
    const res = await fetch(
      `https://restapi.amap.com/v3/place/text?key=${process.env.AMAP_API_KEY}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(destination)}&offset=20&page=1&extensions=all`,
      { signal: AbortSignal.timeout(5000) } // 5秒超时
    )
    
    if (!res.ok) return null
    
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
 * 判断天气类型
 */
function getWeatherType(weather: string): 'sunny' | 'rain' | 'extreme' {
  const rainKeywords = ['雨', '雷', '阵雨', '小雨', '中雨', '大雨', '暴雨', '雷雨']
  const extremeKeywords = ['雪', '雾', '霾', '沙尘', '台风', '冰雹']
  
  if (rainKeywords.some(k => weather.includes(k))) return 'rain'
  if (extremeKeywords.some(k => weather.includes(k))) return 'extreme'
  return 'sunny'
}

/**
 * 判断景点是否适合室内
 */
function isIndoorPOI(poi: POI): boolean {
  const indoorTypes = ['人文历史', '博物馆', '美食', '购物', '购物服务', '餐饮', '展览', '剧院', '影院']
  return indoorTypes.some(t => poi.type.includes(t) || poi.name.includes(t))
}

/**
 * 判断景点是否适合户外
 */
function isOutdoorPOI(poi: POI): boolean {
  const outdoorTypes = ['自然风光', '自然', '公园', '山', '湖', '森林', '景区', '风景名胜']
  return outdoorTypes.some(t => poi.type.includes(t) || poi.name.includes(t))
}

/**
 * 分配到每日（按地理位置聚类 + 天气联动）
 */
function assignToDays(
  pois: POI[], 
  days: number, 
  budget: number,
  weatherData?: any
): DailyPlan[] {
  const dailyPlans: DailyPlan[] = []
  const dailyBudget = budget / days
  const totalPOIs = pois.length
  const poisPerDay = Math.ceil(totalPOIs / days)

  // 获取每天天气（如果有）
  const dailyWeather: string[] = []
  if (weatherData?.forecasts?.[0]?.casts) {
    for (let i = 0; i < days; i++) {
      const cast = weatherData.forecasts[0].casts[i]
      dailyWeather.push(cast?.dayweather || '晴')
    }
  }

  // 按天气分类景点：室内优先 / 户外优先 / 通用
  const indoorPOIs = pois.filter(isIndoorPOI)
  const outdoorPOIs = pois.filter(isOutdoorPOI)
  const generalPOIs = pois.filter(p => !isIndoorPOI(p) && !isOutdoorPOI(p))

  // 按地理位置排序
  const sortedIndoor = sortByLocation(indoorPOIs)
  const sortedOutdoor = sortByLocation(outdoorPOIs)
  const sortedGeneral = sortByLocation(generalPOIs)
  
  for (let day = 0; day < days; day++) {
    const weather = dailyWeather[day] || '晴'
    const weatherType = getWeatherType(weather)
    
    let dayPOIs: POI[] = []
    
    if (weatherType === 'rain') {
      // 雨天优先室内景点，再补充通用景点
      const needed = poisPerDay
      const indoorCount = Math.min(needed, sortedIndoor.length)
      const generalCount = Math.min(needed - indoorCount, sortedGeneral.length)
      
      dayPOIs = [
        ...sortedIndoor.slice(0, indoorCount),
        ...sortedGeneral.slice(0, generalCount),
      ]
      
      // 如果还不够，从户外景点中补充（但放在最后/晚上时段）
      if (dayPOIs.length < needed) {
        const remaining = needed - dayPOIs.length
        dayPOIs.push(...sortedOutdoor.slice(0, remaining))
      }
      
      // 从原数组中移除已使用的
      sortedIndoor.splice(0, indoorCount)
      sortedGeneral.splice(0, generalCount)
      sortedOutdoor.splice(0, Math.max(0, needed - indoorCount - generalCount))
      
    } else if (weatherType === 'sunny') {
      // 晴天优先户外景点，再补充室内/通用
      const needed = poisPerDay
      const outdoorCount = Math.min(needed, sortedOutdoor.length)
      const generalCount = Math.min(needed - outdoorCount, sortedGeneral.length)
      
      dayPOIs = [
        ...sortedOutdoor.slice(0, outdoorCount),
        ...sortedGeneral.slice(0, generalCount),
      ]
      
      if (dayPOIs.length < needed) {
        const remaining = needed - dayPOIs.length
        dayPOIs.push(...sortedIndoor.slice(0, remaining))
      }
      
      sortedOutdoor.splice(0, outdoorCount)
      sortedGeneral.splice(0, generalCount)
      sortedIndoor.splice(0, Math.max(0, needed - outdoorCount - generalCount))
      
    } else {
      // 极端天气 / 多云：均衡分配
      const start = day * poisPerDay
      const end = Math.min(start + poisPerDay, totalPOIs)
      const allSorted = [...sortedIndoor, ...sortedOutdoor, ...sortedGeneral]
      dayPOIs = allSorted.slice(start, end)
    }
    
    // 按地理位置排序（确保路线顺畅）
    const route = optimizeRoute(dayPOIs)
    
    const morning = route.slice(0, 2)
    const afternoon = route.slice(2, 4)
    const evening = route.slice(4, 5)

    const dailyTickets = [...morning, ...afternoon, ...evening].reduce(
      (sum, poi) => sum + poi.cost, 0
    )

    dailyPlans.push({
      day: day + 1,
      morning,
      afternoon,
      evening,
      weather: weatherType === 'rain' ? { type: 'rain', text: weather } : null,
      costs: {
        accommodation: 0,
        food: 0,
        tickets: dailyTickets,
        transport: 0,
        other: 0,
        total: dailyTickets,
      },
    })
  }

  return dailyPlans
}

/**
 * 按地理位置排序（简化：按经度排序，同经度按纬度排序）
 */
function sortByLocation(pois: POI[]): POI[] {
  return pois.sort((a, b) => {
    const [lngA, latA] = a.location.split(',').map(Number)
    const [lngB, latB] = b.location.split(',').map(Number)
    
    if (Math.abs(lngA - lngB) > 0.01) {
      return lngA - lngB
    }
    return latA - latB
  })
}

/**
 * 优化路线（最近邻算法，减少总距离）
 */
function optimizeRoute(pois: POI[]): POI[] {
  if (pois.length <= 2) return pois
  
  const unvisited = [...pois]
  const route: POI[] = []
  
  // 从第一个点开始
  let current = unvisited.shift()!
  route.push(current)
  
  while (unvisited.length > 0) {
    let nearestIndex = 0
    let minDistance = Infinity
    
    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(current.location, unvisited[i].location)
      if (dist < minDistance) {
        minDistance = dist
        nearestIndex = i
      }
    }
    
    current = unvisited.splice(nearestIndex, 1)[0]
    route.push(current)
  }
  
  return route
}

/**
 * 计算两个经纬度点之间的距离（单位：米）
 */
function calculateDistance(loc1: string, loc2: string): number {
  const [lng1, lat1] = loc1.split(',').map(Number)
  const [lng2, lat2] = loc2.split(',').map(Number)
  
  // 简化版：欧氏距离（假设小范围内）
  const R = 6371000 // 地球半径（米）
  const x = (lng2 - lng1) * Math.cos((lat1 + lat2) / 2 * Math.PI / 180) * Math.PI / 180 * R
  const y = (lat2 - lat1) * Math.PI / 180 * R
  
  return Math.sqrt(x * x + y * y)
}

/**
 * 获取城市消费基准数据
 */
function getCityExpense(city: string) {
  const tiers: Record<string, { cities: string[]; accommodation: number; food: number; transport: number; localTransport: number }> = {
    tier1: {
      cities: ['北京', '上海', '广州', '深圳', '杭州'],
      accommodation: 400,
      food: 150,
      transport: 500,
      localTransport: 50,
    },
    newtier1: {
      cities: ['成都', '重庆', '西安', '南京', '苏州', '青岛', '厦门', '武汉', '长沙', '宁波'],
      accommodation: 280,
      food: 120,
      transport: 400,
      localTransport: 35,
    },
    tier2: {
      cities: ['天津', '郑州', '合肥', '济南', '石家庄', '太原', '南昌', '贵阳', '昆明', '兰州', '南宁', '福州', '无锡', '佛山', '东莞'],
      accommodation: 200,
      food: 80,
      transport: 350,
      localTransport: 25,
    },
    tier3: {
      cities: ['三亚', '丽江', '大理', '桂林', '拉萨', '海口', '珠海', '威海', '烟台', '泉州'],
      accommodation: 200,
      food: 80,
      transport: 500,
      localTransport: 25,
    },
  }

  for (const data of Object.values(tiers)) {
    if (data.cities.includes(city)) return data
  }

  // 默认按新一线处理
  return { ...tiers.newtier1 }
}

/**
 * 计算预算分配明细
 */
function calculateBudgetBreakdown(
  destination: string,
  days: number,
  budget: number,
  dailyPlans: DailyPlan[]
): BudgetBreakdown {
  const city = getCityExpense(destination)

  // 固定费用（不可压缩：往返交通 + 门票）
  const transportEstimate = city.transport
  const ticketsEstimate = dailyPlans.reduce(
    (sum, day) =>
      sum +
      day.morning.reduce((s, p) => s + p.cost, 0) +
      day.afternoon.reduce((s, p) => s + p.cost, 0) +
      day.evening.reduce((s, p) => s + p.cost, 0),
    0
  )

  // 可压缩基准费用（住宿按晚数算 = days-1）
  const accommodationEstimate = city.accommodation * Math.max(1, days - 1)
  const foodEstimate = city.food * days
  const localTransportEstimate = city.localTransport * days
  const compressibleEstimate = accommodationEstimate + foodEstimate + localTransportEstimate

  // 可用预算 = 总预算 - 固定费用（交通 + 门票）
  // 把可用预算按比例分配到可压缩项（住宿、餐饮、市内交通）
  let accommodation = 0
  let food = 0
  let localTransport = 0

  const available = budget - transportEstimate - ticketsEstimate

  if (compressibleEstimate > 0 && available > 0) {
    const ratio = available / compressibleEstimate
    accommodation = Math.round(accommodationEstimate * ratio)
    food = Math.round(foodEstimate * ratio)
    localTransport = Math.round(localTransportEstimate * ratio)
  }

  // 处理四舍五入导致的超预算：从 food 中扣除
  const total = transportEstimate + accommodation + food + localTransport + ticketsEstimate
  let other = budget - total

  if (other < 0) {
    food = Math.max(0, food + other)
    other = budget - (transportEstimate + accommodation + food + localTransport + ticketsEstimate)
    other = Math.max(0, other)
  }

  // 更新 dailyPlans（把费用均摊到每天）
  const accPerDay = days > 0 ? Math.round(accommodation / days) : 0
  const foodPerDay = days > 0 ? Math.round(food / days) : 0
  const localTransPerDay = days > 0 ? Math.round(localTransport / days) : 0
  const otherPerDay = days > 0 ? Math.round(other / days) : 0

  dailyPlans.forEach((day) => {
    const dayTickets =
      day.morning.reduce((s, p) => s + p.cost, 0) +
      day.afternoon.reduce((s, p) => s + p.cost, 0) +
      day.evening.reduce((s, p) => s + p.cost, 0)

    day.costs = {
      accommodation: accPerDay,
      food: foodPerDay,
      tickets: dayTickets,
      transport: localTransPerDay,
      other: otherPerDay,
      total: accPerDay + foodPerDay + dayTickets + localTransPerDay + otherPerDay,
    }
  })

  // 第一天包含往返交通
  if (dailyPlans.length > 0) {
    dailyPlans[0].costs.transport += Math.round(transportEstimate)
    dailyPlans[0].costs.total += Math.round(transportEstimate)
  }

  // 返回：transport 包含往返交通 + 市内交通
  const finalTransport = Math.round(transportEstimate) + localTransport
  const finalOther = other
  const finalTotal = finalTransport + accommodation + food + ticketsEstimate + finalOther

  return {
    transport: finalTransport,
    accommodation,
    food,
    tickets: ticketsEstimate,
    other: finalOther,
    total: finalTotal,
  }
}

/**
 * 生成建议
 */
function generateTips(weather: any, preferences: string[], budget: number, budgetBreakdown: BudgetBreakdown): string[] {
  const tips: string[] = []

  // 天气建议
  if (weather.forecasts) {
    const forecast = weather.forecasts[0]
    tips.push(`目的地${forecast.city}，未来天气${forecast.casts?.[0]?.dayweather}，温度${forecast.casts?.[0]?.daytemp}°C`)
  }

  // 预算建议
  const { transport, accommodation, food, tickets, other, total } = budgetBreakdown
  const usedPercent = Math.round(((transport + accommodation + food + tickets) / total) * 100)

  tips.push(`预算分配：交通${transport}元 · 住宿${accommodation}元 · 餐饮${food}元 · 门票${tickets}元 · 其他${other}元`)

  if (usedPercent > 90) {
    tips.push(`预算较紧张，已分配约${usedPercent}%，建议控制购物和额外支出`)
  } else if (usedPercent > 70) {
    tips.push(`预算适中，剩余${other}元可用于购物和应急`)
  } else {
    tips.push(`预算充足，剩余${other}元可安排更多体验`)
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
