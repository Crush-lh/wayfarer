import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const start = Date.now()
    
    // 测试高德 API
    const amapRes = await fetch(
      `https://restapi.amap.com/v3/weather/weatherInfo?key=${process.env.AMAP_API_KEY}&city=成都&extensions=all`,
      { signal: AbortSignal.timeout(5000) }
    )
    const amapData = await amapRes.json()
    const amapTime = Date.now() - start
    
    // 测试 Supabase
    const supabaseStart = Date.now()
    const supabaseRes = await fetch(
      `https://wldwxqzmvxbyteqexxaf.supabase.co/rest/v1/attractions?select=count&city=eq.成都`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(5000)
      }
    )
    const supabaseData = await supabaseRes.json()
    const supabaseTime = Date.now() - supabaseStart
    
    return NextResponse.json({
      amap: {
        status: amapData.status,
        time: amapTime,
      },
      supabase: {
        status: supabaseRes.status,
        count: supabaseData,
        time: supabaseTime,
      },
      totalTime: Date.now() - start,
      env: {
        hasAmapKey: !!process.env.AMAP_API_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}