-- Миграция для добавления сообщений к задачам и дополнительных функций управления проектами
-- SQLite версия

-- Добавляем дополнительные поля в site_tasks
-- SQLite не поддерживает массивы напрямую, используем TEXT с разделителями
ALTER TABLE site_tasks ADD COLUMN assignee_id INTEGER REFERENCES users(id);
ALTER TABLE site_tasks ADD COLUMN tags TEXT; -- храним как JSON массив или разделенные запятыми
ALTER TABLE site_tasks ADD COLUMN estimated_time INTEGER; -- оценка времени в минутах
ALTER TABLE site_tasks ADD COLUMN actual_time INTEGER; -- фактическое время в минутах
ALTER TABLE site_tasks ADD COLUMN parent_task_id INTEGER REFERENCES site_tasks(id);

CREATE INDEX IF NOT EXISTS idx_site_tasks_assignee_id ON site_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_site_tasks_parent_task_id ON site_tasks(parent_task_id);

-- Создаем таблицу для сообщений задач
CREATE TABLE IF NOT EXISTS task_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_user_id ON task_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created_at ON task_messages(created_at);

-- Создаем таблицу для истории изменений задач (activity log)
CREATE TABLE IF NOT EXISTS task_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES site_tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned', etc.
  field_name TEXT, -- название измененного поля
  old_value TEXT, -- старое значение
  new_value TEXT, -- новое значение
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at);
