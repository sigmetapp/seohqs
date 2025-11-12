-- Миграция для таблицы настроек интеграций
-- Supabase версия
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS integrations (
  id BIGINT PRIMARY KEY DEFAULT 1,
  google_service_account_email TEXT,
  google_private_key TEXT,
  ahrefs_api_key TEXT,
  google_search_console_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Вставляем начальную запись, если её нет
INSERT INTO integrations (id, updated_at)
SELECT 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM integrations WHERE id = 1);

-- Включаем RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Политики для integrations
DROP POLICY IF EXISTS "Allow public read access" ON integrations;
DROP POLICY IF EXISTS "Allow public insert access" ON integrations;
DROP POLICY IF EXISTS "Allow public update access" ON integrations;
DROP POLICY IF EXISTS "Allow public delete access" ON integrations;

CREATE POLICY "Allow public read access" ON integrations
  FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON integrations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON integrations
  FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON integrations
  FOR DELETE USING (true);
