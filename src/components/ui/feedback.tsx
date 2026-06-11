'use client'

import { useState, useEffect } from 'react'

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card rounded-2xl p-6 animate-pulse ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-200/60" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200/60 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200/60 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200/60 rounded w-full" />
        <div className="h-3 bg-gray-200/60 rounded w-5/6" />
        <div className="h-3 bg-gray-200/60 rounded w-4/6" />
      </div>
    </div>
  )
}

export function SkeletonPlanView() {
  return (
    <div className="mt-8 space-y-6">
      <div className="glass-card rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gray-200/60" />
          <div className="h-8 bg-gray-200/60 rounded w-48" />
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="weather-card p-5 rounded-xl text-center">
              <div className="h-3 bg-gray-200/60 rounded w-1/2 mx-auto mb-2" />
              <div className="h-8 bg-gray-200/60 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>

        {/* 行程内容 */}
        {[1, 2, 3].map(day => (
          <div key={day} className="mb-6">
            <div className="h-6 bg-gray-200/60 rounded w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2].map(item => (
                <div key={item} className="poi-card p-4 rounded-xl">
                  <div className="h-5 bg-gray-200/60 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200/60 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200/60 rounded w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="glass-card rounded-2xl p-8 animate-pulse">
      <div className="space-y-6">
        <div>
          <div className="h-4 bg-gray-200/60 rounded w-24 mb-2" />
          <div className="h-12 bg-gray-200/60 rounded-xl w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200/60 rounded w-24 mb-2" />
          <div className="h-12 bg-gray-200/60 rounded-xl w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200/60 rounded w-full mb-2" />
          <div className="h-6 bg-gray-200/60 rounded w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200/60 rounded w-full mb-2" />
          <div className="h-6 bg-gray-200/60 rounded w-full" />
        </div>
        <div className="h-14 bg-gray-200/60 rounded-xl w-full" />
      </div>
    </div>
  )
}

export function LoadingOverlay({ message = '加载中...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-purple-200 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  )
}

export function FullPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <div className="text-gray-600 animate-pulse">正在加载...</div>
      </div>
    </div>
  )
}

export function ErrorFallback({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset?: () => void 
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          出错了
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || '页面遇到了一些问题'}
        </p>
        
        {showDetails && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl text-left overflow-auto max-h-48">
            <pre className="text-xs text-red-700 whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            {showDetails ? '隐藏详情' : '查看详情'}
          </button>
          {reset && (
            <button
              onClick={reset}
              className="px-4 py-2 btn-gradient text-white rounded-xl text-sm font-medium transition-all"
            >
              重试
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-sm font-medium transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ 
  icon = '🔍', 
  title = '暂无数据', 
  description = '还没有相关内容',
  action
}: { 
  icon?: string; 
  title?: string; 
  description?: string;
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 btn-gradient text-white rounded-xl text-sm font-medium transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
