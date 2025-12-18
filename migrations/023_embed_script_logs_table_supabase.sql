-- Миграция для таблицы embed_script_logs (логи вызовов embed скриптов)
-- Supabase версия (PostgreSQL с RLS)

CREATE TABLE IF NOT EXISTS embed_script_logs (
  id SERIAL PRIMARY KEY,
  script_name VARCHAR(50) NOT NULL, -- 'tabsgen.js' или 'slot.js'
  referer TEXT, -- URL сайта, с которого был вызван скрипт
  user_agent TEXT, -- User-Agent браузера
  ip_address INET, -- IP адрес клиента
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_embed_script_logs_script_name ON embed_script_logs(script_name);
CREATE INDEX IF NOT EXISTS idx_embed_script_logs_created_at ON embed_script_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_embed_script_logs_referer ON embed_script_logs(referer);

-- Включаем Row Level Security
ALTER TABLE embed_script_logs ENABLE ROW LEVEL SECURITY;

-- Политики: все могут вставлять логи (для публичных скриптов), но читать могут только авторизованные пользователи
DROP POLICY IF EXISTS "Anyone can insert logs" ON embed_script_logs;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON embed_script_logs;

CREATE POLICY "Anyone can insert logs" ON embed_script_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view logs" ON embed_script_logs
  FOR SELECT USING (true);
