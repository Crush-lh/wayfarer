/**
 * 高德地图 API 封装
 */

const AMAP_KEY = process.env.AMAP_API_KEY

// 天气查询
export async function getWeather(city: string) {
  const res = await fetch(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${AMAP_KEY}&city=${city}&extensions=all`
  )
  return res.json()
}

// 地理编码（地址转坐标）
export async function geocode(address: string) {
  const res = await fetch(
    `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}`
  )
  return res.json()
}

// 搜索景点（周边搜索）
export async function searchPOI(keyword: string, city: string) {
  const res = await fetch(
    `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&city=${city}&offset=20&page=1&extensions=all`
  )
  return res.json()
}

// 周边搜索
export async function searchAroundPOI(location: string, keywords: string, radius: number = 50000) {
  const res = await fetch(
    `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${location}&keywords=${encodeURIComponent(keywords)}&radius=${radius}&offset=20&page=1&extensions=all`
  )
  return res.json()
}

// 路线规划（步行）
export async function planWalkingRoute(origin: string, destination: string) {
  const res = await fetch(
    `https://restapi.amap.com/v3/direction/walking?key=${AMAP_KEY}&origin=${origin}&destination=${destination}`
  )
  return res.json()
}

// 路线规划（驾车）
export async function planDrivingRoute(origin: string, destination: string) {
  const res = await fetch(
    `https://restapi.amap.com/v3/direction/driving?key=${AMAP_KEY}&origin=${origin}&destination=${destination}&extensions=all`
  )
  return res.json()
}

// 距离矩阵
export async function distanceMatrix(origins: string[], destinations: string[]) {
  const res = await fetch(
    `https://restapi.amap.com/v3/distance?key=${AMAP_KEY}&origins=${origins.join('|')}&destination=${destinations.join('|')}&type=1`
  )
  return res.json()
}
