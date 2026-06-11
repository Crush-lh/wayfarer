'use client'

import { useEffect, useRef, useState } from 'react'

interface MapPOI {
  name: string
  location: string
  address: string
  timeSlot: string
  index: number
}

interface MapViewProps {
  pois: MapPOI[]
  city: string
}

export default function MapView({ pois, city }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amapKey, setAmapKey] = useState('')
  const scriptLoaded = useRef(false)

  // 获取高德地图 Key
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.amapKey) {
          setAmapKey(data.amapKey)
        } else {
          setError('未配置地图 API Key')
          setLoading(false)
        }
      })
      .catch(() => {
        setError('获取配置失败')
        setLoading(false)
      })
  }, [])

  // 加载地图
  useEffect(() => {
    if (!amapKey || !mapRef.current || scriptLoaded.current) return

    scriptLoaded.current = true

    // 检查是否已加载
    if (window.AMap) {
      initMap()
      return
    }

    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${amapKey}`
    script.onload = () => {
      initMap()
    }
    script.onerror = () => {
      setError('地图加载失败，请检查网络')
      setLoading(false)
    }
    document.head.appendChild(script)

    return () => {
      if (mapInstance) {
        mapInstance.destroy()
      }
    }
  }, [amapKey])

  const initMap = () => {
    if (!mapRef.current || !window.AMap) return

    try {
      const validPOIs = pois.filter(p => p.location && p.location !== '0,0' && p.location !== ',')
      
      if (validPOIs.length === 0) {
        setError('暂无位置信息')
        setLoading(false)
        return
      }

      const center = getCenter(validPOIs)
      const map = new window.AMap.Map(mapRef.current, {
        zoom: 13,
        center: center,
      })

      const markers: any[] = []
      const path: any[] = []
      const bounds = new window.AMap.Bounds()

      validPOIs.forEach((poi, index) => {
        const [lng, lat] = poi.location.split(',').map(Number)
        if (!lng || !lat) return

        const position = [lng, lat]
        path.push(position)
        bounds.extend(position)

        // 自定义标记图标
        const markerContent = `
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            cursor: pointer;
          ">${index + 1}</div>
        `

        const marker = new window.AMap.Marker({
          position: position,
          content: markerContent,
          offset: new window.AMap.Pixel(-14, -28),
          title: poi.name,
        })

        marker.setMap(map)
        markers.push(marker)

        // 信息窗口
        const infoContent = `
          <div style="padding: 10px; min-width: 150px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: #333;">${poi.name}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📍 ${poi.address}</div>
            <div style="font-size: 12px; color: #667eea;">⏰ ${poi.timeSlot}</div>
          </div>
        `

        const infoWindow = new window.AMap.InfoWindow({
          content: infoContent,
          offset: new window.AMap.Pixel(0, -30),
        })

        marker.on('click', () => {
          infoWindow.open(map, position)
        })
      })

      // 画连线
      if (path.length > 1) {
        const polyline = new window.AMap.Polyline({
          path: path,
          strokeColor: '#667eea',
          strokeWeight: 4,
          strokeOpacity: 0.7,
          strokeStyle: 'solid',
          lineJoin: 'round',
          lineCap: 'round',
        })
        polyline.setMap(map)

        // 添加箭头
        const arrow = new window.AMap.Polyline({
          path: path,
          strokeColor: '#667eea',
          strokeWeight: 4,
          strokeOpacity: 0.7,
          strokeStyle: 'solid',
          showDir: true,
        })
        arrow.setMap(map)
      }

      // 自适应视野
      if (markers.length > 0) {
        map.setFitView(markers, false, [60, 60, 60, 60])
      }

      setMapInstance(map)
      setLoading(false)
    } catch (e) {
      console.error('地图初始化失败:', e)
      setError('地图初始化失败')
      setLoading(false)
    }
  }

  const getCenter = (pois: MapPOI[]): number[] => {
    const lats = pois.map(p => Number(p.location.split(',')[1])).filter(n => !isNaN(n))
    const lngs = pois.map(p => Number(p.location.split(',')[0])).filter(n => !isNaN(n))
    
    if (lats.length === 0 || lngs.length === 0) {
      return [116.397428, 39.90923] // 默认北京天安门
    }
    
    return [
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
      lats.reduce((a, b) => a + b, 0) / lats.length,
    ]
  }

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 rounded-full border-t-purple-500 animate-spin mx-auto mb-2" />
          <span className="text-gray-500 text-sm">地图加载中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-72 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
        <div className="text-center">
          <span className="text-3xl mb-2 block">🗺️</span>
          <p className="text-gray-500 text-sm">{error}</p>
          <p className="text-xs text-gray-400 mt-1">请确保已配置高德地图 API Key</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full h-72 rounded-xl overflow-hidden border border-gray-200"
        style={{ background: '#f5f5f5' }}
      />
      {/* 图例 */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-700"></span>
          <span>按数字顺序游览</span>
        </div>
      </div>
    </div>
  )
}
