-- Миграция для таблицы настроек интеграций
-- SQLite версия

CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,
  google_service_account_email TEXT,
  google_private_key TEXT,
  ahrefs_api_key TEXT,
  google_search_console_url TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1)
);

-- Вставляем начальную запись, если её нет
INSERT OR IGNORE INTO integrations (id, updated_at)
VALUES (1, CURRENT_TIMESTAMP);
