# Настройка авторизации пользователей через Google OAuth

## Что было реализовано

1. **Таблица пользователей (users)**
   - Создана миграция `009_users_table.sql` для создания таблицы users
   - Добавлен `user_id` во все таблицы (sites, link_projects, integrations, google_accounts и т.д.)

2. **API роуты для авторизации**
   - `/api/auth/user/google` - начало OAuth flow
   - `/api/auth/user/google/callback` - обработка callback от Google
   - `/api/auth/user/logout` - выход из системы
   - `/api/auth/user/me` - получение информации о текущем пользователе

3. **Система сессий**
   - Используется JWT токены (библиотека `jose`)
   - Токены хранятся в httpOnly cookies
   - Срок действия: 30 дней

4. **Middleware для защиты роутов**
   - `requireAuth()` - проверяет авторизацию пользователя
   - Все защищенные API роуты должны использовать этот middleware

5. **Обновление функций БД**
   - Все функции БД теперь принимают `userId` и фильтруют данные по пользователю
   - Обновлены функции для SQLite (db.ts)
   - Обновлены адаптеры (db-adapter.ts)

6. **Обновление API роутов**
   - `/api/sites` - защищен авторизацией, фильтрует по user_id
   - `/api/integrations` - защищен авторизацией, фильтрует по user_id
   - Остальные роуты нужно обновить аналогично

7. **Navigation компонент**
   - Добавлена кнопка "Войти через Google"
   - Отображается информация о пользователе (имя, фото)
   - Кнопка "Выйти" для выхода из системы

## Переменные окружения

Необходимо установить следующие переменные:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_SECRET=your-secret-key-for-jwt (или NEXTAUTH_SECRET)
NEXT_PUBLIC_APP_URL=https://your-domain.com (для продакшена)
```

## Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте authorized redirect URIs:
   - Для разработки: `http://localhost:3000/api/auth/user/google/callback`
   - Для продакшена: `https://your-domain.com/api/auth/user/google/callback`
6. Установите scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

## Миграции

Необходимо выполнить миграцию для создания таблицы users и добавления user_id:

- PostgreSQL: `migrations/009_users_table.sql`
- SQLite: `migrations/009_users_table_sqlite.sql`
- Supabase: `migrations/009_users_table_supabase.sql`

## Что еще нужно сделать

1. Обновить функции БД для PostgreSQL (db-postgres.ts) и Supabase (db-supabase.ts) для поддержки user_id
2. Обновить остальные API роуты для использования авторизации:
   - `/api/link-profile/projects/*`
   - `/api/google-accounts/*`
   - `/api/sites/[id]/*`
   - И другие защищенные роуты
3. Обновить фронтенд страницы для проверки авторизации перед отображением данных

## Примечания

- Для существующих данных в БД нужно будет добавить user_id вручную или создать скрипт миграции
- В Supabase версии добавлены RLS политики для автоматической фильтрации по пользователю
- Для продакшена рекомендуется использовать более безопасный AUTH_SECRET
