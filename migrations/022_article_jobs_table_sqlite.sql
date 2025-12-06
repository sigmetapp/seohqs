-- Миграция для таблицы article_jobs (задачи генерации статей)
-- SQLite версия

CREATE TABLE IF NOT EXISTS article_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  thread_id TEXT,
  research_run_id TEXT,
  status TEXT NOT NULL DEFAULT 'researching', -- researching, research_completed, writing_sections, finalizing, completed, failed
  topic TEXT NOT NULL,
  language TEXT DEFAULT 'RU',
  audience TEXT,
  author_persona TEXT,
  angle TEXT,
  content_goal TEXT,
  desired_length INTEGER,
  complexity TEXT,
  constraints TEXT,
  outline TEXT, -- JSON string
  section_notes TEXT, -- JSON string
  sources TEXT, -- JSON string
  sections TEXT, -- JSON string
  final_html TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_jobs_job_id ON article_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_article_jobs_user_id ON article_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_article_jobs_status ON article_jobs(status);
CREATE INDEX IF NOT EXISTS idx_article_jobs_thread_id ON article_jobs(thread_id);
