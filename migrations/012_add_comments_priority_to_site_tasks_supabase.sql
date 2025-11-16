-- Миграция для добавления полей comments и priority в таблицу site_tasks в Supabase
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE site_tasks 
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER CHECK(priority >= 1 AND priority <= 10);

CREATE INDEX IF NOT EXISTS idx_site_tasks_priority ON site_tasks(priority);
