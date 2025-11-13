-- Миграция для таблицы Google аккаунтов
-- Supabase версия

CREATE TABLE IF NOT EXISTS google_accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_google_accounts_email ON google_accounts(email);
