-- Миграция для таблицы sites
-- Создает таблицу для хранения сайтов с привязкой к категории

-- PostgreSQL версия
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  google_search_console_url TEXT,
  ahrefs_api_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_category ON sites(category);
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);
