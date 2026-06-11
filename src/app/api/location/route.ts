import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lng = searchParams.get('lng')
  const lat = searchParams.get('lat')

  if (!lng || !lat) {
    return NextResponse.json({ error: '缺少经纬度参数' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?key=${process.env.AMAP_API_KEY}&location=${lng},${lat}`
    )
    const data = await res.json()

    if (data.status === '1' && data.regeocode) {
      const address = data.regeocode.addressComponent
      const city = address.city || address.province || address.district
      
      return NextResponse.json({
        success: true,
        city: city?.replace(/市$/, '') || '未知',
        province: address.province,
        district: address.district,
        address: data.regeocode.formatted_address,
      })
    }

    return NextResponse.json({ error: '无法解析地址' }, { status: 500 })
  } catch (error) {
    console.error('定位服务错误:', error)
    return NextResponse.json({ error: '定位服务异常' }, { status: 500 })
  }
}
