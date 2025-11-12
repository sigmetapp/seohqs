-- Миграция для таблицы link_projects в SQLite

CREATE TABLE IF NOT EXISTS link_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_link_projects_domain ON link_projects(domain);
CREATE INDEX IF NOT EXISTS idx_link_projects_name ON link_projects(name);
