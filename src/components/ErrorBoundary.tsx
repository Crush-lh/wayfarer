'use client'

import { useState, useEffect, Component, type ReactNode } from 'react'
import { ErrorFallback } from './ui/feedback'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    // 可以在这里发送错误日志到监控服务
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return <ErrorFallback error={this.state.error} reset={this.reset} />
    }

    return this.props.children
  }
}

// 局部错误边界（用于特定组件）
export function SectionErrorBoundary({ 
  children, 
  sectionName = '内容' 
}: { 
  children: ReactNode; 
  sectionName?: string 
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 bg-red-50/80 rounded-xl border border-red-200/50 text-center"
>
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm text-red-700">
            {sectionName}加载失败，请刷新页面重试
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// 网络请求重试 Hook
export function useRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number; onError?: (error: Error) => void } = {}
) {
  const { retries = 3, delay = 1000, onError } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = async () => {
    setLoading(true)
    setError(null)
    
    for (let i = 0; i < retries; i++) {
      try {
        const result = await fn()
        setData(result)
        setLoading(false)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        
        if (i === retries - 1) {
          setError(error)
          setLoading(false)
          onError?.(error)
          throw error
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
  }

  return { execute, loading, error, data }
}

// 防抖 Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// 节流 Hook
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))

    return () => clearTimeout(timer)
  }, [value, limit])

  return throttledValue
}

import { useRef } from 'react'

// 图片懒加载组件
export function LazyImage({ 
  src, 
  alt, 
  className = '',
  placeholder = '/placeholder.jpg'
}: { 
  src: string; 
  alt: string; 
  className?: string;
  placeholder?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [src])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400">
          <span className="text-2xl">🖼️</span>
        </div>
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        data-src={src}
      />
    </div>
  )
}

// 网络状态检测
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// 网络状态提示
export function NetworkStatus() {
  const isOnline = useNetworkStatus()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
    } else {
      const timer = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  if (!show) return null

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`}>
      {isOnline ? '✅ 网络已恢复' : '❌ 网络已断开，请检查连接'}
    </div>
  )
}
