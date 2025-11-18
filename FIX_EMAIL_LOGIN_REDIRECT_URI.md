# Исправление ошибки redirect_uri_mismatch при авторизации через почту

## Проблема

При попытке авторизации через Google (кнопка "Войти через Google" на странице логина) возникает ошибка:
```
Ошибка 400: redirect_uri_mismatch
```

## Решение

Код был обновлен для поддержки отдельного Client ID для авторизации пользователей. Теперь нужно настроить переменные окружения.

### Вариант 1: Использовать отдельный Client ID для авторизации пользователей (рекомендуется)

Если у вас **два разных Client ID** в Google Cloud Console:
1. Один для авторизации пользователей
2. Другой для Google Search Console

#### Шаг 1: Добавьте переменные окружения в Vercel

Перейдите в **Vercel Dashboard** → ваш проект → **Settings** → **Environment Variables** и добавьте:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GOOGLE_USER_CLIENT_ID` | Client ID для авторизации пользователей | Production, Preview |
| `GOOGLE_USER_CLIENT_SECRET` | Client Secret для авторизации пользователей | Production, Preview |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://seohqs.vercel.app/api/auth/user/google/callback` | Production, Preview |

#### Шаг 2: Добавьте redirect URI в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. **APIs & Services** → **Credentials**
4. Найдите OAuth 2.0 Client ID, который вы используете для авторизации пользователей (тот, который указан в `GOOGLE_USER_CLIENT_ID`)
5. Нажмите на карандаш (редактировать)
6. В разделе **Authorized redirect URIs** добавьте:
   - `https://seohqs.vercel.app/api/auth/user/google/callback`
   - `http://localhost:3000/api/auth/user/google/callback` (для локальной разработки)
7. Сохраните

### Вариант 2: Использовать один Client ID для обоих случаев

Если вы хотите использовать **один Client ID** для авторизации пользователей и для Search Console:

1. В Google Cloud Console найдите ваш `GOOGLE_CLIENT_ID` (который используется для Search Console)
2. Редактируйте его
3. В разделе **Authorized redirect URIs** добавьте:
   - `https://seohqs.vercel.app/api/auth/user/google/callback` (для авторизации пользователей)
   - `https://seohqs.vercel.app/api/auth/google/callback` (для Search Console - если еще нет)
4. Сохраните

**Примечание**: В этом случае код автоматически будет использовать `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` (обратная совместимость).

## После настройки

1. **Перезапустите деплой в Vercel** (важно!)
2. Попробуйте авторизоваться через Google снова
3. Проверьте логи в Vercel - там будет указано:
   - Какой Client ID используется (`GOOGLE_USER_CLIENT_ID` или `GOOGLE_CLIENT_ID`)
   - Какой redirect URI используется

## Проверка

После настройки в логах Vercel вы должны увидеть:
```
[Google User OAuth] Using Client ID: GOOGLE_USER_CLIENT_ID (или GOOGLE_CLIENT_ID)
[Google User OAuth] Redirect URI: https://seohqs.vercel.app/api/auth/user/google/callback
```

## Важно

- **Redirect URI должен точно совпадать** с тем, что в Google Cloud Console (включая протокол `https://` и отсутствие завершающего слэша)
- **Каждый Client ID должен иметь свой redirect URI** в Google Cloud Console
- **Перезапуск деплоя обязателен** после изменения переменных окружения

## Если проблема сохраняется

1. Проверьте логи в Vercel - там будет указан точный redirect_uri, который используется
2. Убедитесь, что этот redirect_uri **точно** добавлен в Google Cloud Console (без лишних пробелов, с правильным протоколом)
3. Убедитесь, что вы используете правильный Client ID (тот, в котором добавлен redirect URI)
