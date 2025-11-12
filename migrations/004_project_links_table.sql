-- Миграция для таблицы project_links (ссылки в проектах)
-- PostgreSQL версия

CREATE TABLE IF NOT EXISTS project_links (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES link_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  anchor_text TEXT,
  target_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'not_found', 'error')),
  last_checked TIMESTAMP,
  indexed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_status ON project_links(status);
CREATE INDEX IF NOT EXISTS idx_project_links_url ON project_links(url);
