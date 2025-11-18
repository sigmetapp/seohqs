-- Миграция для таблицы site_statuses
-- Создает таблицу для хранения глобальных статусов сайтов

-- PostgreSQL версия
CREATE TABLE IF NOT EXISTS site_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем поле status_id в таблицу sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES site_statuses(id) ON DELETE SET NULL;

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_sites_status_id ON sites(status_id);
CREATE INDEX IF NOT EXISTS idx_site_statuses_sort_order ON site_statuses(sort_order);

-- Вставляем базовые статусы
INSERT INTO site_statuses (name, color, sort_order) VALUES
  ('Сетап', '#f59e0b', 1),
  ('Сетап+', '#f97316', 2),
  ('Рандж', '#3b82f6', 3),
  ('Топ3', '#10b981', 4)
ON CONFLICT (name) DO NOTHING;
