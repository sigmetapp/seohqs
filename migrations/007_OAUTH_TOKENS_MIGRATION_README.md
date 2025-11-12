# Миграция для добавления OAuth токенов в таблицу integrations

Эта миграция добавляет поля для хранения OAuth токенов Google Search Console в таблицу `integrations`.

## Поля, которые добавляются:
- `google_access_token` - Access token для Google Search Console API
- `google_refresh_token` - Refresh token для обновления access token
- `google_token_expiry` - Дата истечения access token

## Как применить миграцию:

### Для Supabase:
1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните SQL из файла: `migrations/007_add_oauth_tokens_to_integrations_supabase.sql`

### Для PostgreSQL:
Выполните SQL из файла: `migrations/007_add_oauth_tokens_to_integrations.sql`

### Для SQLite:
Выполните SQL из файла: `migrations/007_add_oauth_tokens_to_integrations_sqlite.sql`

**Примечание:** Если вы создаете новую установку, поля уже включены в миграцию `006_integrations_table*.sql`, поэтому дополнительная миграция не требуется.

## Что было исправлено:
- Добавлены поля для OAuth токенов в таблицу integrations
- Обновлены функции `getIntegrations()` и `updateIntegrations()` во всех адаптерах БД (Supabase, PostgreSQL, SQLite)
- Теперь токены сохраняются и загружаются из базы данных при авторизации через Google OAuth
