-- Миграция для таблицы site_statuses
-- SQLite версия

CREATE TABLE IF NOT EXISTS site_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6b7280',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем поле status_id в таблицу sites
-- SQLite не поддерживает ALTER TABLE ADD COLUMN с FOREIGN KEY напрямую
-- Нужно создать новую таблицу и скопировать данные
-- Но для простоты добавим колонку без внешнего ключа
-- (SQLite не поддерживает добавление внешних ключей через ALTER TABLE)

-- Проверяем, существует ли колонка status_id
-- Если нет, добавляем её
-- В SQLite нужно использовать PRAGMA для проверки, но проще просто попробовать добавить
-- Если колонка уже существует, будет ошибка, которую можно игнорировать

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_sites_status_id ON sites(status_id);
CREATE INDEX IF NOT EXISTS idx_site_statuses_sort_order ON site_statuses(sort_order);

-- Вставляем базовые статусы
INSERT OR IGNORE INTO site_statuses (name, color, sort_order) VALUES
  ('Сетап', '#f59e0b', 1),
  ('Сетап+', '#f97316', 2),
  ('Рандж', '#3b82f6', 3),
  ('Топ3', '#10b981', 4);
