-- Миграция для таблицы project_links в Supabase
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_links (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES link_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  anchor_text TEXT,
  target_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'not_found', 'error')),
  last_checked TIMESTAMP WITH TIME ZONE,
  indexed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_status ON project_links(status);
CREATE INDEX IF NOT EXISTS idx_project_links_url ON project_links(url);

-- Включаем RLS
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
DROP POLICY IF EXISTS "Allow public read access" ON project_links;
DROP POLICY IF EXISTS "Allow public insert access" ON project_links;
DROP POLICY IF EXISTS "Allow public update access" ON project_links;
DROP POLICY IF EXISTS "Allow public delete access" ON project_links;

CREATE POLICY "Allow public read access" ON project_links
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON project_links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON project_links
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON project_links
  FOR DELETE USING (true);
