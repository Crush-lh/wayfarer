'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TravelForm from "@/components/TravelForm";
import AuthStatus from "@/components/AuthStatus";
import { FullPageLoading, SkeletonForm } from "@/components/ui/feedback";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('wayfarer_token')
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <FullPageLoading />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 text-center animate-fade-in-up">
            <span className="text-5xl">🔐</span>
            <h1 className="text-3xl font-bold gradient-text mt-4 mb-3">
              需要登录
            </h1>
            <p className="text-gray-600 mb-6">
              请登录后使用旅行计划助手
            </p>
            <div className="space-y-3">
              <a
                href="/login"
                className="block w-full py-3 btn-gradient text-white rounded-xl font-bold transition-all"
              >
                🔐 前往登录
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航栏 */}
        <div className="flex justify-end mb-4">
          <AuthStatus />
        </div>

        {/* 头部 - 玻璃拟态效果 */}
        <div className="glass-card rounded-2xl p-8 mb-8 animate-fade-in-up">
          <div className="text-center">
            <div className="inline-block mb-4">
              <span className="text-5xl">🌍</span>
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-3">
              旅行计划助手
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              智能旅行规划助手，为你定制完美旅程
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-xl">🌤</span>
                <span className="text-gray-700">实时天气</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-xl">📍</span>
                <span className="text-gray-700">智能推荐</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full">
                <span className="text-xl">🗺</span>
                <span className="text-gray-700">路线优化</span>
              </div>
            </div>
          </div>
        </div>

        {/* 表单 */}
        <ErrorBoundary>
          <TravelForm />
        </ErrorBoundary>
      </div>
    </div>
  );
}
