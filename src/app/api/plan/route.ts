import { NextRequest, NextResponse } from 'next/server'
import { generateTravelPlan } from '@/lib/planner'

export async function POST(req: NextRequest) {
  try {
    const { destination, days, budget, preferences } = await req.json()

    if (!destination || !days || !budget) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const plan = await generateTravelPlan(
      destination,
      Number(days),
      Number(budget),
      preferences || []
    )

    return NextResponse.json(plan)
  } catch (error) {
    console.error('生成旅行计划失败:', error)
    return NextResponse.json(
      { error: '生成失败，请稍后重试' },
      { status: 500 }
    )
  }
}
