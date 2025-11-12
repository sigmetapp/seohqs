-- Миграция для таблицы link_projects в Supabase
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS link_projects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_link_projects_domain ON link_projects(domain);
CREATE INDEX IF NOT EXISTS idx_link_projects_name ON link_projects(name);

-- Включаем RLS
ALTER TABLE link_projects ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
DROP POLICY IF EXISTS "Allow public read access" ON link_projects;
DROP POLICY IF EXISTS "Allow public insert access" ON link_projects;
DROP POLICY IF EXISTS "Allow public update access" ON link_projects;
DROP POLICY IF EXISTS "Allow public delete access" ON link_projects;

CREATE POLICY "Allow public read access" ON link_projects
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON link_projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON link_projects
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON link_projects
  FOR DELETE USING (true);
