-- Миграция для добавления полей OAuth токенов в таблицу integrations
-- Supabase версия
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE integrations 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TEXT;
