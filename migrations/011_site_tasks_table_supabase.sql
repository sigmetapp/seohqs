-- Миграция для таблицы site_tasks в Supabase
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_tasks (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_site_tasks_site_id ON site_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_status ON site_tasks(status);
CREATE INDEX IF NOT EXISTS idx_site_tasks_deadline ON site_tasks(deadline);

-- Включаем RLS
ALTER TABLE site_tasks ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Allow public read access" ON site_tasks;
DROP POLICY IF EXISTS "Allow public insert access" ON site_tasks;
DROP POLICY IF EXISTS "Allow public update access" ON site_tasks;
DROP POLICY IF EXISTS "Allow public delete access" ON site_tasks;

-- Политика для чтения (все могут читать)
CREATE POLICY "Allow public read access" ON site_tasks
  FOR SELECT USING (true);

-- Политика для вставки (все могут вставлять)
CREATE POLICY "Allow public insert access" ON site_tasks
  FOR INSERT WITH CHECK (true);

-- Политика для обновления (все могут обновлять)
CREATE POLICY "Allow public update access" ON site_tasks
  FOR UPDATE USING (true);

-- Политика для удаления (все могут удалять)
CREATE POLICY "Allow public delete access" ON site_tasks
  FOR DELETE USING (true);
