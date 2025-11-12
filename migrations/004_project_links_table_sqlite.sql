-- Миграция для таблицы project_links в SQLite

CREATE TABLE IF NOT EXISTS project_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES link_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  anchor_text TEXT,
  target_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'not_found', 'error')),
  last_checked DATETIME,
  indexed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_project_links_status ON project_links(status);
CREATE INDEX IF NOT EXISTS idx_project_links_url ON project_links(url);
