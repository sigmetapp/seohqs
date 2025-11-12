-- Миграция для таблицы link_projects (проекты ссылочного профиля)
-- PostgreSQL версия

CREATE TABLE IF NOT EXISTS link_projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_link_projects_domain ON link_projects(domain);
CREATE INDEX IF NOT EXISTS idx_link_projects_name ON link_projects(name);
