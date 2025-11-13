-- Миграция для таблицы users (пользователи)
-- Supabase версия (PostgreSQL с RLS)

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

-- Добавляем user_id в таблицу integrations
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

-- Включаем Row Level Security для таблицы users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои данные
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Политика: пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Политика: любой может создавать нового пользователя (через API)
CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT WITH CHECK (true);

-- Включаем RLS для других таблиц и создаем политики
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sites" ON sites
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own sites" ON sites
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own sites" ON sites
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own sites" ON sites
  FOR DELETE USING (auth.uid()::text = user_id::text);

ALTER TABLE link_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own link_projects" ON link_projects
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own link_projects" ON link_projects
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own link_projects" ON link_projects
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own link_projects" ON link_projects
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Примечание: для Supabase может потребоваться дополнительная настройка
-- в зависимости от того, используете ли вы встроенную аутентификацию Supabase
-- или собственную систему сессий
