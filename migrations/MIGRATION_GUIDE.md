# Руководство по миграциям базы данных

## ⚠️ Важно для Supabase

**Для Supabase используется ТОЛЬКО миграция `006_integrations_table_supabase.sql` для таблицы integrations.**
Не создавайте дополнительные миграции для Supabase - используйте только файлы с суффиксом `_supabase.sql`.

## Порядок выполнения миграций

Выполняйте миграции в следующем порядке:

### 1. Базовые таблицы (уже должны быть выполнены)
- ✅ `001_initial_schema.sql` или `supabase_migration.sql` - таблица `affiliate_offers`

### 2. Таблицы для сайтов
- `002_sites_table_supabase.sql` (для Supabase) или `002_sites_table.sql` (для PostgreSQL)
- Если была ошибка с AUTOINCREMENT, используйте `002_sites_table_supabase_fix.sql`

### 3. Таблицы для ссылочного профиля
- `003_link_projects_table_supabase.sql` (для Supabase) или `003_link_projects_table.sql` (для PostgreSQL)
- `004_project_links_table_supabase.sql` (для Supabase) или `004_project_links_table.sql` (для PostgreSQL)

### 4. Таблицы для данных сайтов
- `005_google_ahrefs_postbacks_tables_supabase.sql` (для Supabase) или `005_google_ahrefs_postbacks_tables.sql` (для PostgreSQL)

### 5. Таблица настроек интеграций
- `006_integrations_table_supabase.sql` (для Supabase) или `006_integrations_table.sql` (для PostgreSQL)
- **Важно**: Для Supabase нужно выполнить ТОЛЬКО миграцию `006_integrations_table_supabase.sql`. Не создавайте дополнительные миграции для Supabase.

## Для Supabase

Выполните в Supabase SQL Editor в следующем порядке:

1. `002_sites_table_supabase.sql` (или `002_sites_table_supabase_fix.sql` если была ошибка)
2. `003_link_projects_table_supabase.sql`
3. `004_project_links_table_supabase.sql`
4. `005_google_ahrefs_postbacks_tables_supabase.sql`
5. `006_integrations_table_supabase.sql` - **только эта миграция для Supabase**

## Для PostgreSQL

Выполните в вашей PostgreSQL базе данных:

1. `002_sites_table.sql`
2. `003_link_projects_table.sql`
3. `004_project_links_table.sql`
4. `005_google_ahrefs_postbacks_tables.sql`
5. `006_integrations_table.sql`

## Для SQLite (локальная разработка)

Выполните в SQLite:

1. `002_sites_table_sqlite.sql`
2. `003_link_projects_table_sqlite.sql`
3. `004_project_links_table_sqlite.sql`
4. `005_google_ahrefs_postbacks_tables_sqlite.sql`
5. `006_integrations_table_sqlite.sql`

## Список создаваемых таблиц

1. **sites** - сайты с категориями
2. **link_projects** - проекты ссылочного профиля
3. **project_links** - ссылки в проектах
4. **google_search_console_data** - данные Google Search Console
5. **ahrefs_data** - данные Ahrefs
6. **postbacks** - постбеки с партнерок
7. **integrations** - настройки интеграций (Google Service Account, Ahrefs API и т.д.)

## Важно

- Все таблицы связаны внешними ключами (foreign keys)
- Для Supabase включены политики Row Level Security (RLS)
- Уникальные индексы предотвращают дублирование данных
- При удалении родительской записи дочерние записи удаляются автоматически (ON DELETE CASCADE)
