-- Миграция для добавления сообщений к задачам и дополнительных функций управления проектами
-- Supabase версия

-- Добавляем дополнительные поля в site_tasks
ALTER TABLE site_tasks 
  ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[], -- массив тегов
  ADD COLUMN IF NOT EXISTS estimated_time INTEGER, -- оценка времени в минутах
  ADD COLUMN IF NOT EXISTS actual_time INTEGER, -- фактическое время в минутах
  ADD COLUMN IF NOT EXISTS parent_task_id INTEGER REFERENCES site_tasks(id) ON DELETE CASCADE; -- для подзадач

CREATE INDEX IF NOT EXISTS idx_site_tasks_assignee_id ON site_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_parent_task_id ON site_tasks(parent_task_id);

-- Создаем таблицу для сообщений задач
CREATE TABLE IF NOT EXISTS task_messages (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_user_id ON task_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created_at ON task_messages(created_at);

-- Создаем таблицу для истории изменений задач (activity log)
CREATE TABLE IF NOT EXISTS task_activities (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned', etc.
  field_name VARCHAR(50), -- название измененного поля
  old_value TEXT, -- старое значение
  new_value TEXT, -- новое значение
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at);

-- RLS политики для task_messages
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON task_messages;
DROP POLICY IF EXISTS "Allow public insert access" ON task_messages;
DROP POLICY IF EXISTS "Allow public update access" ON task_messages;
DROP POLICY IF EXISTS "Allow public delete access" ON task_messages;

CREATE POLICY "Allow public read access" ON task_messages
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON task_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON task_messages
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON task_messages
  FOR DELETE USING (true);

-- RLS политики для task_activities
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON task_activities;
DROP POLICY IF EXISTS "Allow public insert access" ON task_activities;

CREATE POLICY "Allow public read access" ON task_activities
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON task_activities
  FOR INSERT WITH CHECK (true);
