# Создание пользователя admin@buylink.pro в Supabase

⚠️ **ВАЖНО**: Проект использует только Supabase. SQLite не используется.

## Предварительные требования

Убедитесь, что переменные окружения Supabase установлены в `.env.local` или `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# или
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Способ 1: Через API endpoint (рекомендуется)

1. Запустите сервер разработки:
   ```bash
   npm run dev
   ```

2. В другом терминале выполните:
   ```bash
   node scripts/create-admin-user-api.js
   ```

   Или используйте curl:
   ```bash
   curl -X POST http://localhost:3000/api/admin/create-user \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@buylink.pro","password":"Sasha1991","name":"Admin"}'
   ```

## Способ 2: Напрямую через Supabase скрипт

Если переменные окружения установлены в системе:

```bash
node scripts/create-admin-user-supabase.js
```

## Учетные данные

- **Email**: admin@buylink.pro
- **Пароль**: Sasha1991
- **Имя**: Admin

## Как это работает

API endpoint `/api/admin/create-user` автоматически использует Supabase, если переменные окружения настроены правильно. Функция `createOrUpdateUser` из `lib/db-users.ts` проверяет наличие `NEXT_PUBLIC_SUPABASE_URL` и использует Supabase клиент.

## Проверка

После создания пользователя вы можете войти в систему с указанными учетными данными.
