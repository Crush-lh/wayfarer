-- Supabase 数据库 Schema - 增强版
-- 项目: wldwxqzmvxbyteqexxaf
-- URL: https://wldwxqzmvxbyteqexxaf.supabase.co/rest/v1/

-- 景点表（增强版）
CREATE TABLE IF NOT EXISTS attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  rating NUMERIC DEFAULT 4.0,
  cost INTEGER DEFAULT 0,
  time_needed TEXT DEFAULT '2-3小时',
  keywords TEXT[],
  -- 新增字段
  description TEXT,               -- 景点详细介绍
  tips TEXT[],                  -- 游玩建议
  food_nearby TEXT[],            -- 附近美食推荐
  best_time TEXT,                -- 最佳游玩时间
  must_do TEXT[],               -- 必做事项
  photo_spots TEXT[],           -- 拍照打卡点
  avoid TEXT[],                 -- 避坑指南
  ticket_price TEXT,            -- 票价信息
  open_time TEXT,               -- 开放时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, city)
);

-- 旅行计划表（增强版）
CREATE TABLE IF NOT EXISTS travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  days INTEGER NOT NULL,
  budget INTEGER NOT NULL,
  preferences TEXT[],
  weather_data JSONB,
  tips TEXT[],
  -- 新增字段
  theme TEXT,                   -- 行程主题（如"海岛风情"）
  highlights TEXT[],            -- 行程亮点
  food_budget INTEGER,          -- 餐饮预算建议
  transport_tips TEXT[],        -- 交通建议
  packing_list TEXT[],          -- 行李清单
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 计划详情表（关联景点）
CREATE TABLE IF NOT EXISTS plan_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
  attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  time_slot TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 景点内容缓存表（AI生成内容）
CREATE TABLE IF NOT EXISTS attraction_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE,
  description TEXT,             -- 详细介绍
  tips TEXT[],                  -- 游玩建议
  food_nearby TEXT[],           -- 附近美食
  must_do TEXT[],              -- 必做事项
  photo_spots TEXT[],          -- 拍照打卡点
  avoid TEXT[],                -- 避坑指南
  ai_generated BOOLEAN DEFAULT false,  -- 是否AI生成
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attraction_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_attractions_city ON attractions(city);
CREATE INDEX IF NOT EXISTS idx_attractions_type ON attractions(type);
CREATE INDEX IF NOT EXISTS idx_attractions_keywords ON attractions USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_plan_attractions_plan ON plan_attractions(plan_id);
CREATE INDEX IF NOT EXISTS idx_attraction_content_attraction ON attraction_content(attraction_id);