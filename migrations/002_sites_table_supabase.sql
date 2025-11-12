-- Миграция для таблицы sites в Supabase
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sites (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  google_search_console_url TEXT,
  ahrefs_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);

-- Включаем RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Allow public read access" ON sites;
DROP POLICY IF EXISTS "Allow public insert access" ON sites;
DROP POLICY IF EXISTS "Allow public update access" ON sites;
DROP POLICY IF EXISTS "Allow public delete access" ON sites;

-- Политика для чтения (все могут читать)
CREATE POLICY "Allow public read access" ON sites
  FOR SELECT USING (true);

-- Политика для вставки (все могут вставлять)
CREATE POLICY "Allow public insert access" ON sites
  FOR INSERT WITH CHECK (true);

-- Политика для обновления (все могут обновлять)
CREATE POLICY "Allow public update access" ON sites
  FOR UPDATE USING (true);

-- Политика для удаления (все могут удалять)
CREATE POLICY "Allow public delete access" ON sites
  FOR DELETE USING (true);
