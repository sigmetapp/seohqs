-- Миграция для добавления user_id в team_members для изоляции профилей
-- SQLite версия

-- Добавляем user_id в team_members для связи с users таблицей
ALTER TABLE team_members ADD COLUMN user_id INTEGER REFERENCES users(id);

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
