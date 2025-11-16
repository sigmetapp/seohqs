-- Миграция для добавления поля password_hash в таблицу users
-- Supabase версия (PostgreSQL с RLS)

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
