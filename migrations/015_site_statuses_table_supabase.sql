-- Миграция для таблицы site_statuses в Supabase
-- Выполните этот SQL в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS site_statuses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем поле status_id в таблицу sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status_id BIGINT REFERENCES site_statuses(id) ON DELETE SET NULL;

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_sites_status_id ON sites(status_id);
CREATE INDEX IF NOT EXISTS idx_site_statuses_sort_order ON site_statuses(sort_order);

-- Включаем RLS
ALTER TABLE site_statuses ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Allow public read access" ON site_statuses;
DROP POLICY IF EXISTS "Allow public insert access" ON site_statuses;
DROP POLICY IF EXISTS "Allow public update access" ON site_statuses;
DROP POLICY IF EXISTS "Allow public delete access" ON site_statuses;

-- Политики для site_statuses
CREATE POLICY "Allow public read access" ON site_statuses
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON site_statuses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON site_statuses
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON site_statuses
  FOR DELETE USING (true);

-- Вставляем базовые статусы
INSERT INTO site_statuses (name, color, sort_order) VALUES
  ('Сетап', '#f59e0b', 1),
  ('Сетап+', '#f97316', 2),
  ('Рандж', '#3b82f6', 3),
  ('Топ3', '#10b981', 4)
ON CONFLICT (name) DO NOTHING;
