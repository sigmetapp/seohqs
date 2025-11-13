-- Миграция для таблицы users (пользователи)
-- PostgreSQL версия

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  picture TEXT,
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Добавляем user_id в таблицу sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);

-- Добавляем user_id в таблицу link_projects
ALTER TABLE link_projects ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_link_projects_user_id ON link_projects(user_id);

-- Добавляем user_id в таблицу project_links (если она существует)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_links') THEN
    ALTER TABLE project_links ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_project_links_user_id ON project_links(user_id);
  END IF;
END $$;

-- Добавляем user_id в таблицу integrations (изменяем структуру, чтобы каждый пользователь имел свои настройки)
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS single_row;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
-- Удаляем старую запись с id=1, если она есть без user_id
DELETE FROM integrations WHERE id = 1 AND user_id IS NULL;

-- Добавляем user_id в таблицу google_accounts
ALTER TABLE google_accounts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_google_accounts_user_id ON google_accounts(user_id);
-- Удаляем уникальность email, так как теперь email может повторяться для разных пользователей
ALTER TABLE google_accounts DROP CONSTRAINT IF EXISTS google_accounts_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_accounts_user_email ON google_accounts(user_id, email);

-- Добавляем user_id в таблицу google_search_console_data (если она существует)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_search_console_data') THEN
    ALTER TABLE google_search_console_data ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_google_search_console_data_user_id ON google_search_console_data(user_id);
  END IF;
END $$;
