# Быстрое исправление redirect_uri_mismatch

## Проблема

В логах видно, что используется `GOOGLE_CLIENT_ID` (для Search Console), но в этом Client ID не добавлен redirect URI для авторизации пользователей.

## Решение (выберите один вариант)

### Вариант 1: Добавить отдельные переменные (рекомендуется)

Если у вас **два разных Client ID**, добавьте в Vercel:

1. **GOOGLE_USER_CLIENT_ID** = Client ID для авторизации пользователей
2. **GOOGLE_USER_CLIENT_SECRET** = Client Secret для авторизации пользователей
3. **GOOGLE_OAUTH_REDIRECT_URI** = `https://seohqs.vercel.app/api/auth/user/google/callback`

И в Google Cloud Console в **Client ID для авторизации пользователей** добавьте redirect URI:
- `https://seohqs.vercel.app/api/auth/user/google/callback`

### Вариант 2: Использовать один Client ID для обоих случаев

Если вы хотите использовать **один Client ID** для обоих случаев:

1. В Google Cloud Console найдите ваш `GOOGLE_CLIENT_ID` (который используется для Search Console)
2. Редактируйте его
3. В разделе **Authorized redirect URIs** добавьте:
   - `https://seohqs.vercel.app/api/auth/user/google/callback` (для авторизации пользователей)
   - `https://seohqs.vercel.app/api/auth/google/callback` (для Search Console - если еще нет)
4. Сохраните

## Как проверить, какой Client ID используется

В логах Vercel после попытки авторизации будет:
- `GOOGLE_USER_CLIENT_ID установлен: true/false`
- `GOOGLE_CLIENT_ID установлен: true/false`

Если `GOOGLE_USER_CLIENT_ID установлен: false`, значит используется `GOOGLE_CLIENT_ID`.

## После исправления

1. Перезапустите деплой в Vercel
2. Попробуйте авторизоваться снова
3. Проверьте логи - должно быть `GOOGLE_USER_CLIENT_ID установлен: true` (если используете Вариант 1)
