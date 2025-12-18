-- Миграция для таблицы blog_posts (посты из Telegram канала)
-- Supabase версия (PostgreSQL с RLS)

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  telegram_message_id BIGINT NOT NULL UNIQUE,
  telegram_channel_username VARCHAR(255) NOT NULL DEFAULT 'seohqs',
  title TEXT,
  content TEXT NOT NULL,
  html_content TEXT,
  images JSONB DEFAULT '[]'::jsonb, -- [{ url, caption }]
  published_at TIMESTAMP NOT NULL,
  slug VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_telegram_message_id ON blog_posts(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_channel_username ON blog_posts(telegram_channel_username);

-- Включаем Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Политики: все могут читать посты (публичный блог)
DROP POLICY IF EXISTS "Anyone can view blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Service can insert blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Service can update blog posts" ON blog_posts;

CREATE POLICY "Anyone can view blog posts" ON blog_posts
  FOR SELECT USING (true);

CREATE POLICY "Service can insert blog posts" ON blog_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update blog posts" ON blog_posts
  FOR UPDATE USING (true);
