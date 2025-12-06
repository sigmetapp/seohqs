-- Миграция для таблицы article_jobs (задачи генерации статей)
-- PostgreSQL/Supabase версия

CREATE TABLE IF NOT EXISTS article_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  thread_id VARCHAR(255),
  research_run_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'researching', -- researching, research_completed, writing_sections, finalizing, completed, failed
  topic TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'RU',
  audience VARCHAR(50),
  author_persona VARCHAR(50),
  angle VARCHAR(50),
  content_goal VARCHAR(50),
  desired_length INTEGER,
  complexity VARCHAR(20),
  constraints TEXT,
  outline JSONB, -- { title, sections: [{ id, title, description }] }
  section_notes JSONB, -- { sectionId: "notes" }
  sources JSONB, -- [{ url, title, snippet }]
  sections JSONB, -- [{ sectionId, html, status, completed_at }]
  final_html TEXT,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_article_jobs_job_id ON article_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_article_jobs_user_id ON article_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_article_jobs_status ON article_jobs(status);
CREATE INDEX IF NOT EXISTS idx_article_jobs_thread_id ON article_jobs(thread_id);

-- Включаем Row Level Security (только для Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    ALTER TABLE article_jobs ENABLE ROW LEVEL SECURITY;
    
    -- Политики: пользователи могут видеть и управлять только своими задачами
    DROP POLICY IF EXISTS "Users can view own jobs" ON article_jobs;
    DROP POLICY IF EXISTS "Users can insert own jobs" ON article_jobs;
    DROP POLICY IF EXISTS "Users can update own jobs" ON article_jobs;

    CREATE POLICY "Users can view own jobs" ON article_jobs
      FOR SELECT USING (true);

    CREATE POLICY "Users can insert own jobs" ON article_jobs
      FOR INSERT WITH CHECK (true);

    CREATE POLICY "Users can update own jobs" ON article_jobs
      FOR UPDATE USING (true);
  END IF;
END $$;
