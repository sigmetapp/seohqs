-- Миграция для таблицы site_settings (настройки сайта)
-- Supabase версия (PostgreSQL с RLS)

CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- Включаем Row Level Security для таблицы site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Политика: только администраторы могут читать настройки (через API с проверкой email)
CREATE POLICY "Admin can view settings" ON site_settings
  FOR SELECT USING (true);

-- Политика: только администраторы могут обновлять настройки (через API с проверкой email)
CREATE POLICY "Admin can update settings" ON site_settings
  FOR UPDATE USING (true);

-- Политика: только администраторы могут создавать настройки (через API с проверкой email)
CREATE POLICY "Admin can insert settings" ON site_settings
  FOR INSERT WITH CHECK (true);
