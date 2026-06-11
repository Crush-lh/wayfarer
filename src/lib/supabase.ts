import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 从 Supabase 获取景点（缓存）
 */
export async function getCachedAttractions(city: string, preferences: string[]) {
  let query = supabase
    .from('attractions')
    .select('*')
    .eq('city', city)

  if (preferences.length > 0) {
    // 用 keywords 过滤
    query = query.overlaps('keywords', preferences)
  }

  const { data, error } = await query
    .order('rating', { ascending: false })
    .limit(50)

  if (error) {
    console.error('获取缓存景点失败:', error)
    return null
  }

  return data && data.length > 0 ? data : null
}

/**
 * 保存景点到 Supabase（缓存）
 */
export async function saveAttractions(attractions: any[]) {
  // 先检查每个景点是否已存在
  for (const attraction of attractions) {
    const { data: existing } = await supabase
      .from('attractions')
      .select('id')
      .eq('name', attraction.name)
      .eq('city', attraction.city)
      .single()
    
    if (!existing) {
      // 不存在则插入
      const { error } = await supabase
        .from('attractions')
        .insert(attraction)
      
      if (error) {
        console.error(`保存景点 ${attraction.name} 失败:`, error)
      }
    }
  }
}

/**
 * 保存旅行计划
 */
export async function saveTravelPlan(plan: any) {
  const { data, error } = await supabase
    .from('travel_plans')
    .insert(plan)
    .select()
    .single()

  if (error) {
    console.error('保存计划失败:', error)
    return null
  }

  return data
}

/**
 * 获取旅行计划历史
 */
export async function getTravelPlans() {
  const { data, error } = await supabase
    .from('travel_plans')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取计划失败:', error)
    return []
  }

  return data || []
}
