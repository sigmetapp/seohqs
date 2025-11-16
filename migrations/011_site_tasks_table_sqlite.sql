-- Миграция для таблицы site_tasks в SQLite
-- Создает таблицу для хранения задач по сайтам

CREATE TABLE IF NOT EXISTS site_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_site_tasks_site_id ON site_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_status ON site_tasks(status);
CREATE INDEX IF NOT EXISTS idx_site_tasks_deadline ON site_tasks(deadline);
