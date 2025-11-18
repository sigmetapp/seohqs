-- Миграция для добавления функционала команды и обновления профиля
-- PostgreSQL версия

-- Добавляем поля для профиля пользователя
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Создаем таблицу team_members для участников команды
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  first_login BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_owner_email UNIQUE (owner_id, email),
  CONSTRAINT unique_username UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_team_members_owner_id ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_username ON team_members(username);

-- Добавляем комментарии
COMMENT ON TABLE team_members IS 'Участники команды пользователя (до 3 человек)';
COMMENT ON COLUMN team_members.owner_id IS 'ID владельца аккаунта';
COMMENT ON COLUMN team_members.first_login IS 'Флаг первого входа (для смены пароля)';
COMMENT ON COLUMN users.deleted_at IS 'Дата удаления аккаунта (для 14-дневного периода восстановления)';
COMMENT ON COLUMN users.owner_id IS 'ID владельца (для участников команды)';
