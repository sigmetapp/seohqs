# Исправление ошибки redirect_uri_mismatch в Vercel

## Проблема

Если вы получаете ошибку `redirect_uri_mismatch` при авторизации через Google на Vercel, это обычно связано с тем, что:

1. `NEXT_PUBLIC_APP_URL` имеет завершающий слэш
2. Или используется внутренний preview URL Vercel вместо основного домена

## Решение

### Вариант 1: Исправить NEXT_PUBLIC_APP_URL (рекомендуется)

1. Перейдите в настройки проекта в Vercel: **Settings → Environment Variables**
2. Найдите переменную `NEXT_PUBLIC_APP_URL`
3. Убедитесь, что значение **НЕ имеет завершающего слэша**:
   - ✅ Правильно: `https://seohqs.vercel.app`
   - ❌ Неправильно: `https://seohqs.vercel.app/`
4. Если есть завершающий слэш, удалите его и сохраните
5. Перезапустите деплой

### Вариант 2: Явно указать GOOGLE_OAUTH_REDIRECT_URI

Если проблема сохраняется, добавьте переменную окружения `GOOGLE_OAUTH_REDIRECT_URI`:

1. Перейдите в **Settings → Environment Variables**
2. Добавьте новую переменную:
   - **Name**: `GOOGLE_OAUTH_REDIRECT_URI`
   - **Value**: `https://seohqs.vercel.app/api/auth/user/google/callback`
   - **Environment**: Production (и Preview, если нужно)
3. Сохраните
4. Перезапустите деплой

## Проверка в Google Cloud Console

Убедитесь, что в Google Cloud Console добавлен **точно такой же** redirect URI:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. **APIs & Services** → **Credentials**
4. Найдите ваш OAuth 2.0 Client ID
5. Нажмите на карандаш (редактировать)
6. В разделе **Authorized redirect URIs** проверьте, что есть:
   - `https://seohqs.vercel.app/api/auth/user/google/callback`
7. **Важно**: URI должен быть **точно таким же**, без завершающего слэша и без лишних символов

## Проверка после исправления

1. Проверьте логи в Vercel после попытки авторизации
2. В логах должно быть:
   ```
   [User Google OAuth] Redirect URI: https://seohqs.vercel.app/api/auth/user/google/callback
   ```
3. Этот URI должен **точно совпадать** с тем, что в Google Cloud Console

## Частые ошибки

- ❌ `https://seohqs.vercel.app/api/auth/user/google/callback/` (лишний слэш в конце)
- ❌ `http://seohqs.vercel.app/api/auth/user/google/callback` (http вместо https)
- ❌ `https://seohqs-bes569ozp-sigmetapps-projects.vercel.app/api/auth/user/google/callback` (внутренний preview URL)

## Если проблема не решается

1. Проверьте логи в Vercel - там будет указан точный redirect_uri, который используется
2. Убедитесь, что этот URI **точно совпадает** с тем, что в Google Cloud Console
3. Попробуйте добавить переменную `GOOGLE_OAUTH_REDIRECT_URI` явно (Вариант 2)
4. Убедитесь, что используете правильный OAuth Client ID (тот же, что и для Search Console)
