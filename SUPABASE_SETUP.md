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

-- Удаляем существующие политики, если они есть (для повторного запуска)
DROP POLICY IF EXISTS "Allow public read access" ON affiliate_offers;
DROP POLICY IF EXISTS "Allow public insert access" ON affiliate_offers;
DROP POLICY IF EXISTS "Allow public delete access" ON affiliate_offers;

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

## Миграции для Supabase

Для полной настройки приложения выполните все миграции в Supabase SQL Editor в следующем порядке:

1. `migrations/002_sites_table_supabase.sql` (или `002_sites_table_supabase_fix.sql` если была ошибка)
2. `migrations/003_link_projects_table_supabase.sql`
3. `migrations/004_project_links_table_supabase.sql`
4. `migrations/005_google_ahrefs_postbacks_tables_supabase.sql`
5. `migrations/006_integrations_table_supabase.sql` - **только эта миграция для Supabase**

**Важно**: Для Supabase нужно выполнить ТОЛЬКО миграцию `006_integrations_table_supabase.sql`. Не создавайте дополнительные миграции для Supabase.

Подробнее см. `migrations/MIGRATION_GUIDE.md`

## Проверка:

После деплоя:
1. Откройте сайт
2. Откройте консоль браузера (F12)
3. Нажмите "Загрузить тестовые данные"
4. Проверьте логи в консоли - там будет отладочная информация
