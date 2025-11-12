-- Миграция для таблиц данных сайтов в Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Таблица данных Google Search Console
CREATE TABLE IF NOT EXISTS google_search_console_data (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(10, 4) DEFAULT 0,
  position DECIMAL(10, 2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, date)
);

-- Таблица данных Ahrefs
CREATE TABLE IF NOT EXISTS ahrefs_data (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain_rating INTEGER DEFAULT 0,
  backlinks INTEGER DEFAULT 0,
  referring_domains INTEGER DEFAULT 0,
  organic_keywords INTEGER DEFAULT 0,
  organic_traffic INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, date)
);

-- Таблица постбеков
CREATE TABLE IF NOT EXISTS postbacks (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  network VARCHAR(100) NOT NULL,
  event VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  data JSONB,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_google_data_site_id ON google_search_console_data(site_id);
CREATE INDEX IF NOT EXISTS idx_google_data_date ON google_search_console_data(date);
CREATE INDEX IF NOT EXISTS idx_ahrefs_data_site_id ON ahrefs_data(site_id);
CREATE INDEX IF NOT EXISTS idx_ahrefs_data_date ON ahrefs_data(date);
CREATE INDEX IF NOT EXISTS idx_postbacks_site_id ON postbacks(site_id);
CREATE INDEX IF NOT EXISTS idx_postbacks_date ON postbacks(date);
CREATE INDEX IF NOT EXISTS idx_postbacks_network ON postbacks(network);

-- Включаем RLS для всех таблиц
ALTER TABLE google_search_console_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ahrefs_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE postbacks ENABLE ROW LEVEL SECURITY;

-- Политики для google_search_console_data
DROP POLICY IF EXISTS "Allow public read access" ON google_search_console_data;
DROP POLICY IF EXISTS "Allow public insert access" ON google_search_console_data;
DROP POLICY IF EXISTS "Allow public update access" ON google_search_console_data;
DROP POLICY IF EXISTS "Allow public delete access" ON google_search_console_data;

CREATE POLICY "Allow public read access" ON google_search_console_data
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON google_search_console_data
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON google_search_console_data
  FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON google_search_console_data
  FOR DELETE USING (true);

-- Политики для ahrefs_data
DROP POLICY IF EXISTS "Allow public read access" ON ahrefs_data;
DROP POLICY IF EXISTS "Allow public insert access" ON ahrefs_data;
DROP POLICY IF EXISTS "Allow public update access" ON ahrefs_data;
DROP POLICY IF EXISTS "Allow public delete access" ON ahrefs_data;

CREATE POLICY "Allow public read access" ON ahrefs_data
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON ahrefs_data
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON ahrefs_data
  FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON ahrefs_data
  FOR DELETE USING (true);

-- Политики для postbacks
DROP POLICY IF EXISTS "Allow public read access" ON postbacks;
DROP POLICY IF EXISTS "Allow public insert access" ON postbacks;
DROP POLICY IF EXISTS "Allow public update access" ON postbacks;
DROP POLICY IF EXISTS "Allow public delete access" ON postbacks;

CREATE POLICY "Allow public read access" ON postbacks
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON postbacks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON postbacks
  FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON postbacks
  FOR DELETE USING (true);
