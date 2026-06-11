-- 用户表 RLS 策略
-- 先确保 RLS 已开启
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户（注册）插入新用户
CREATE POLICY "允许注册新用户" ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 允许已认证用户查看自己的信息
CREATE POLICY "允许用户查看自己" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 允许匿名用户查询用户名是否存在（用于注册检查）
CREATE POLICY "允许匿名查询用户名" ON users
  FOR SELECT
  TO anon
  USING (true);
