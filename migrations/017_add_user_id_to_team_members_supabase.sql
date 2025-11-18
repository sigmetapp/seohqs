-- Миграция для добавления user_id в team_members для изоляции профилей
-- Supabase версия

-- Добавляем user_id в team_members для связи с users таблицей
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
