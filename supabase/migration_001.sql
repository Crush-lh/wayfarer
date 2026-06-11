-- 第一步：增强景点表字段
ALTER TABLE attractions 
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS tips TEXT[],
  ADD COLUMN IF NOT EXISTS food_nearby TEXT[],
  ADD COLUMN IF NOT EXISTS best_time TEXT,
  ADD COLUMN IF NOT EXISTS must_do TEXT[],
  ADD COLUMN IF NOT EXISTS photo_spots TEXT[],
  ADD COLUMN IF NOT EXISTS avoid TEXT[],
  ADD COLUMN IF NOT EXISTS ticket_price TEXT,
  ADD COLUMN IF NOT EXISTS open_time TEXT;

-- 增强旅行计划表字段
ALTER TABLE travel_plans 
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS highlights TEXT[],
  ADD COLUMN IF NOT EXISTS food_budget INTEGER,
  ADD COLUMN IF NOT EXISTS transport_tips TEXT[],
  ADD COLUMN IF NOT EXISTS packing_list TEXT[];

-- 创建景点内容缓存表（AI生成内容）
CREATE TABLE IF NOT EXISTS attraction_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction_id UUID REFERENCES attractions(id) ON DELETE CASCADE,
  description TEXT,
  tips TEXT[],
  food_nearby TEXT[],
  must_do TEXT[],
  photo_spots TEXT[],
  avoid TEXT[],
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attraction_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_attraction_content_attraction ON attraction_content(attraction_id);