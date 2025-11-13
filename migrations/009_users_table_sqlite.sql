-- Миграция для таблицы users (пользователи)
-- SQLite версия

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  google_id TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Добавляем user_id в таблицу sites
-- SQLite не поддерживает ALTER TABLE ADD COLUMN IF NOT EXISTS напрямую
-- Используем проверку через PRAGMA table_info
-- Для SQLite нужно выполнять это вручную или через скрипт миграции

-- В SQLite нужно проверять существование колонки перед добавлением
-- Это делается через проверку схемы таблицы

-- Для sites
-- ALTER TABLE sites ADD COLUMN user_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);

-- Для link_projects
-- ALTER TABLE link_projects ADD COLUMN user_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_link_projects_user_id ON link_projects(user_id);

-- Для project_links (если существует)
-- ALTER TABLE project_links ADD COLUMN user_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_project_links_user_id ON project_links(user_id);

-- Для integrations
-- ALTER TABLE integrations ADD COLUMN user_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);

-- Для google_accounts
-- ALTER TABLE google_accounts ADD COLUMN user_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_google_accounts_user_id ON google_accounts(user_id);
-- Удаляем уникальность email
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_google_accounts_user_email ON google_accounts(user_id, email);

-- Для google_search_console_data (если существует)
-- ALTER TABLE google_search_console_data ADD COLUMN user_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_google_search_console_data_user_id ON google_search_console_data(user_id);
