import { NextRequest, NextResponse } from 'next/server'

interface AIEnrichRequest {
  attractionName: string
  city: string
  type: string
  existingContent?: any
}

// 通用 AI API 配置（兼容 OpenAI 格式）
const API_KEY = process.env.OPENAI_API_KEY || ''
const API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'
const MODEL = process.env.OPENAI_MODEL || 'deepseek-chat'

export async function POST(req: NextRequest) {
  try {
    const { attractionName, city, type, existingContent } = await req.json()

    if (!attractionName || !city) {
      return NextResponse.json({ error: '缺少景点名称或城市' }, { status: 400 })
    }

    // 如果已有内容，直接返回
    if (existingContent) {
      return NextResponse.json({ content: existingContent, cached: true })
    }

    // 调用 AI 生成内容
    const content = await generateAIContent(attractionName, city, type)

    return NextResponse.json({ content, cached: false })
  } catch (error) {
    console.error('AI 内容生成失败:', error)
    return NextResponse.json({ error: 'AI 生成失败' }, { status: 500 })
  }
}

async function generateAIContent(name: string, city: string, type: string) {
  // 如果没有 API Key，使用模拟数据
  if (!API_KEY) {
    return generateMockContent(name, city, type)
  }

  try {
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
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

    if (!res.ok) {
      throw new Error('AI API 调用失败')
    }

    const data = await res.json()
    const content = data.choices[0]?.message?.content

    // 解析 JSON 响应
    try {
      // 尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('JSON 解析失败:', e)
    }

    return generateMockContent(name, city, type)
  } catch (e) {
    console.error('AI 调用失败:', e)
    return generateMockContent(name, city, type)
  }
}

// 模拟数据（无 API Key 时使用）
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
    '美食': {
      description: `${name}是${city}著名的美食街区/餐厅，汇聚了当地特色小吃。建议空腹前往，多尝试几种。`,
      tips: ['建议避开饭点高峰', '多尝试几家店', '带现金，有些老店不支持移动支付'],
      must_do: ['品尝招牌菜', '逛完整条街', '买伴手礼'],
      photo_spots: ['美食特写', '街道全景', '排队人群'],
      avoid: ['不要被拉客的店吸引', '注意卫生条件', '不要一次点太多'],
      food_nearby: ['本身就是美食区', '附近商圈'],
    },
  }

  return templates[type] || templates['自然风光']
}