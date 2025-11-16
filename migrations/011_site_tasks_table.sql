-- Миграция для таблицы site_tasks
-- Создает таблицу для хранения задач по сайтам

-- PostgreSQL версия
CREATE TABLE IF NOT EXISTS site_tasks (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_site_tasks_site_id ON site_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_status ON site_tasks(status);
CREATE INDEX IF NOT EXISTS idx_site_tasks_deadline ON site_tasks(deadline);
