-- Первая миграция: создание таблицы affiliate_offers
-- Дата создания: 2024-11-12

CREATE TABLE IF NOT EXISTS affiliate_offers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  cr DECIMAL(10, 2) DEFAULT 0,
  ecpc DECIMAL(10, 2) DEFAULT 0,
  epc DECIMAL(10, 2) DEFAULT 0,
  source VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_name ON affiliate_offers(name);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_topic ON affiliate_offers(topic);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_country ON affiliate_offers(country);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_model ON affiliate_offers(model);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_source ON affiliate_offers(source);

-- Таблица для отслеживания выполненных миграций
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
