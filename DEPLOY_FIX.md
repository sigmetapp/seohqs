# Исправление 404 на Vercel

## Проблема
Все запросы возвращают 404, сайт не работает.

## Решение

### 1. Проверьте структуру проекта
Убедитесь, что все файлы на месте:
- `app/page.tsx` - главная страница
- `app/layout.tsx` - layout
- `app/api/data/route.ts` - API для данных
- `app/api/upload/route.ts` - API для загрузки
- `app/api/migrate/route.ts` - API для миграций

### 2. Пересоберите проект на Vercel
1. Зайдите в настройки проекта на Vercel
2. Перейдите в раздел "Deployments"
3. Нажмите "Redeploy" на последнем деплое
4. Или сделайте новый коммит и пуш

### 3. Проверьте переменные окружения
В настройках проекта Vercel → Environment Variables должны быть:
- `POSTGRES_URL` или `DATABASE_URL` - строка подключения к PostgreSQL

### 4. Выполните миграцию SQL вручную
Скопируйте SQL из `migrations/manual_migration.sql` и выполните в вашей базе данных.

### 5. Проверьте логи деплоя
В Vercel Dashboard → Deployments → выберите последний деплой → View Function Logs
Проверьте, есть ли ошибки при сборке или запуске.

## SQL для миграции (выполните вручную):

```sql
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

CREATE INDEX IF NOT EXISTS idx_affiliate_offers_name ON affiliate_offers(name);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_topic ON affiliate_offers(topic);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_country ON affiliate_offers(country);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_model ON affiliate_offers(model);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_source ON affiliate_offers(source);
```

## После миграции
1. Откройте главную страницу сайта
2. Должна появиться форма для загрузки CSV файлов
3. Загрузите файлы - они сохранятся в базу данных
4. Данные отобразятся в таблице
