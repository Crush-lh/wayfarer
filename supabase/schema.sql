-- Supabase 数据库 Schema
-- 景点表
CREATE TABLE IF NOT EXISTS attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  location TEXT NOT NULL, -- 经纬度 "lng,lat"
  type TEXT NOT NULL,
  rating NUMERIC DEFAULT 4.0,
  cost INTEGER DEFAULT 0,
  time_needed TEXT DEFAULT '2-3小时',
  keywords TEXT[], -- 标签 ["自然", "历史", "美食"]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 旅行计划表
CREATE TABLE IF NOT EXISTS travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  days INTEGER NOT NULL,
  budget INTEGER NOT NULL,
  preferences TEXT[],
  weather_data JSONB,
  tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 计划详情表（关联景点）
CREATE TABLE IF NOT EXISTS plan_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
  attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  time_slot TEXT NOT NULL, -- morning / afternoon / evening
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_attractions_city ON attractions(city);
CREATE INDEX IF NOT EXISTS idx_attractions_type ON attractions(type);
CREATE INDEX IF NOT EXISTS idx_attractions_keywords ON attractions USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_plan_attractions_plan ON plan_attractions(plan_id);
