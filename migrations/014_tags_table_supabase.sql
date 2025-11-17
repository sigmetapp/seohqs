-- Миграция для таблиц tags и site_tags в Supabase
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tags (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  user_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS site_tags (
  site_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (site_id, tag_id),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_site_tags_site_id ON site_tags(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tags_tag_id ON site_tags(tag_id);

-- Включаем RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_tags ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Allow public read access" ON tags;
DROP POLICY IF EXISTS "Allow public insert access" ON tags;
DROP POLICY IF EXISTS "Allow public update access" ON tags;
DROP POLICY IF EXISTS "Allow public delete access" ON tags;

DROP POLICY IF EXISTS "Allow public read access" ON site_tags;
DROP POLICY IF EXISTS "Allow public insert access" ON site_tags;
DROP POLICY IF EXISTS "Allow public delete access" ON site_tags;

-- Политики для tags
CREATE POLICY "Allow public read access" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON tags
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON tags
  FOR DELETE USING (true);

-- Политики для site_tags
CREATE POLICY "Allow public read access" ON site_tags
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON site_tags
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete access" ON site_tags
  FOR DELETE USING (true);
