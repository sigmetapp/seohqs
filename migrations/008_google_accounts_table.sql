-- Миграция для таблицы Google аккаунтов
-- PostgreSQL версия

CREATE TABLE IF NOT EXISTS google_accounts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_google_accounts_email ON google_accounts(email);
