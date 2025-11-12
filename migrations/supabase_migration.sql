-- Миграция для Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Создание таблицы affiliate_offers
CREATE TABLE IF NOT EXISTS affiliate_offers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  cr DECIMAL(10, 2) DEFAULT 0,
  ecpc DECIMAL(10, 2) DEFAULT 0,
  epc DECIMAL(10, 2) DEFAULT 0,
  source VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_name ON affiliate_offers(name);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_topic ON affiliate_offers(topic);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_country ON affiliate_offers(country);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_model ON affiliate_offers(model);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_source ON affiliate_offers(source);

-- Включаем RLS
ALTER TABLE affiliate_offers ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики, если они есть (для повторного запуска)
DROP POLICY IF EXISTS "Allow public read access" ON affiliate_offers;
DROP POLICY IF EXISTS "Allow public insert access" ON affiliate_offers;
DROP POLICY IF EXISTS "Allow public delete access" ON affiliate_offers;
DROP POLICY IF EXISTS "Allow public update access" ON affiliate_offers;

-- Политика для чтения (все могут читать)
CREATE POLICY "Allow public read access" ON affiliate_offers
  FOR SELECT USING (true);

-- Политика для вставки (все могут вставлять)
CREATE POLICY "Allow public insert access" ON affiliate_offers
  FOR INSERT WITH CHECK (true);

-- Политика для обновления (все могут обновлять)
CREATE POLICY "Allow public update access" ON affiliate_offers
  FOR UPDATE USING (true);

-- Политика для удаления (все могут удалять)
CREATE POLICY "Allow public delete access" ON affiliate_offers
  FOR DELETE USING (true);
