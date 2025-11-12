-- Первая миграция для SQLite: создание таблицы affiliate_offers
-- Дата создания: 2024-11-12

CREATE TABLE IF NOT EXISTS affiliate_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  country TEXT NOT NULL,
  model TEXT NOT NULL,
  cr REAL DEFAULT 0,
  ecpc REAL DEFAULT 0,
  epc REAL DEFAULT 0,
  source TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_name ON affiliate_offers(name);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_topic ON affiliate_offers(topic);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_country ON affiliate_offers(country);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_model ON affiliate_offers(model);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_source ON affiliate_offers(source);

-- Таблица для отслеживания выполненных миграций
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
