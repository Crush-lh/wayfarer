import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: '用户名长度 3-20 个字符' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少 6 个字符' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 409 }
      )
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 插入用户
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        role: 'user',
      })
      .select()
      .single()

    if (error) {
      console.error('注册失败:', error)
      return NextResponse.json(
        { success: false, error: '注册失败，请重试' },
        { status: 500 }
      )
    }

    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      user: { username: data.username, role: data.role },
    })
  } catch (error) {
    console.error('注册异常:', error)
    return NextResponse.json(
      { success: false, error: '注册失败' },
      { status: 500 }
    )
  }
}
