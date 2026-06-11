'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (data.success) {
        localStorage.setItem('wayfarer_token', data.token)
        localStorage.setItem('wayfarer_user', JSON.stringify(data.user))
        router.push('/')
      } else {
        setError(data.error || (isRegister ? '注册失败' : '登录失败'))
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        {/* 头部 */}
        <div className="glass-card rounded-2xl p-8 mb-6 animate-fade-in-up text-center">
          <span className="text-5xl">{isRegister ? '📝' : '🔐'}</span>
          <h1 className="text-3xl font-bold gradient-text mt-4 mb-2">
            {isRegister ? '注册账号' : '登录'}
          </h1>
          <p className="text-gray-600">
            {isRegister ? '创建新账号，开始使用旅行计划助手' : '登录后可使用旅行计划助手'}
          </p>
        </div>

        {/* 表单 */}
        <div className="glass-card rounded-2xl p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-3 bg-white/80 border border-white/50 rounded-xl 
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                           transition-all outline-none placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isRegister ? '至少6个字符' : '请输入密码'}
                className="w-full px-4 py-3 bg-white/80 border border-white/50 rounded-xl 
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent 
                           transition-all outline-none placeholder:text-gray-400"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50/80 text-red-700 rounded-xl text-sm border border-red-200/50">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-gradient text-white rounded-xl font-bold
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-300"
            >
              {loading 
                ? (isRegister ? '注册中...' : '登录中...') 
                : (isRegister ? '📝 注册' : '🔐 登录')
              }
            </button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError('') }}
                className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
              <div>
                <a href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  ← 返回首页
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
