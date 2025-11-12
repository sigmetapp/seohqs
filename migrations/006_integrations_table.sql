-- Миграция для таблицы настроек интеграций
-- PostgreSQL версия

CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,
  google_service_account_email TEXT,
  google_private_key TEXT,
  ahrefs_api_key TEXT,
  google_search_console_url TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Вставляем начальную запись, если её нет
INSERT INTO integrations (id, updated_at)
SELECT 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM integrations WHERE id = 1)
ON CONFLICT (id) DO NOTHING;
