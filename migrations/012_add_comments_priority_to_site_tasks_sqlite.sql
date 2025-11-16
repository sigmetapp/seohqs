-- Миграция для добавления полей comments и priority в таблицу site_tasks в SQLite

ALTER TABLE site_tasks 
ADD COLUMN comments TEXT,
ADD COLUMN priority INTEGER CHECK(priority >= 1 AND priority <= 10);

CREATE INDEX IF NOT EXISTS idx_site_tasks_priority ON site_tasks(priority);
