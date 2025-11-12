# Инструкция по настройке

## 1. Выполните миграцию SQL вручную

Откройте файл `migrations/manual_migration.sql` и выполните SQL в вашей базе данных PostgreSQL.

Или скопируйте и выполните этот SQL:

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

## 2. Проверьте переменные окружения на Vercel

Убедитесь, что в настройках проекта Vercel установлены:
- `POSTGRES_URL` или `DATABASE_URL` - строка подключения к PostgreSQL

## 3. Сайт должен работать

После выполнения миграции:
1. Откройте главную страницу
2. Вы увидите форму для загрузки CSV файлов
3. Загрузите файлы - они сохранятся в базу данных
4. Данные отобразятся в таблице

## Что изменилось

- ✅ Убраны автоматические миграции при запуске
- ✅ Сайт работает даже если таблицы еще не созданы (показывает форму загрузки)
- ✅ Улучшена обработка ошибок
- ✅ Создан файл `migrations/manual_migration.sql` для ручной миграции
