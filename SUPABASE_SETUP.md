# Настройка Supabase

## Шаги для создания таблицы в Supabase:

1. Откройте ваш проект в Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Выполните следующий SQL:

```sql
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
```

4. **Важно:** Настройте Row Level Security (RLS) политики:

```sql
-- Включаем RLS
ALTER TABLE affiliate_offers ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут читать)
CREATE POLICY "Allow public read access" ON affiliate_offers
  FOR SELECT USING (true);

-- Политика для вставки (все могут вставлять)
CREATE POLICY "Allow public insert access" ON affiliate_offers
  FOR INSERT WITH CHECK (true);

-- Политика для удаления (все могут удалять)
CREATE POLICY "Allow public delete access" ON affiliate_offers
  FOR DELETE USING (true);
```

## Переменные окружения в Vercel:

Убедитесь, что установлены:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (опционально, но рекомендуется)

## Проверка:

После деплоя:
1. Откройте сайт
2. Откройте консоль браузера (F12)
3. Нажмите "Загрузить тестовые данные"
4. Проверьте логи в консоли - там будет отладочная информация
