-- Исправление RLS политик для таблицы embed_script_logs
-- Убеждаемся, что все могут читать данные (для статистики)

-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can insert logs" ON embed_script_logs;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON embed_script_logs;
DROP POLICY IF EXISTS "Anyone can view logs" ON embed_script_logs;

-- Создаем политики: все могут вставлять и читать логи
CREATE POLICY "Anyone can insert logs" ON embed_script_logs
  FOR INSERT WITH CHECK (true);

-- Политика для чтения: все могут читать (для статистики через API)
CREATE POLICY "Anyone can view logs" ON embed_script_logs
  FOR SELECT USING (true);

-- Проверяем, что RLS включен
ALTER TABLE embed_script_logs ENABLE ROW LEVEL SECURITY;
