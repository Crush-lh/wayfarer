'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  username: string
  role: string
}

export default function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('wayfarer_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch (e) {
        console.error('解析用户数据失败:', e)
      }
    }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('wayfarer_token')
    localStorage.removeItem('wayfarer_user')
    setUser(null)
    router.refresh()
  }

  if (!mounted) return null

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50">
        <span className="text-sm text-gray-700">
          👤 {user.username} ({user.role})
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          退出
        </button>
      </div>
    )
  }

  return (
    <a
      href="/login"
      className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 text-sm text-gray-700 hover:bg-white/80 transition-colors"
    >
      🔐 登录
    </a>
  )
}
