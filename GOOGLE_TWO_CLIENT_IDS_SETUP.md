# Настройка двух OAuth 2.0 Client IDs

Если у вас **два разных OAuth 2.0 Client ID** в Google Cloud Console:
1. Один для **авторизации пользователей** через Google
2. Другой для **связи с Google Search Console**

Вам нужно добавить **отдельные переменные окружения** в Vercel для каждого случая.

## Переменные окружения в Vercel

### Для авторизации пользователей (Google Sign-In):

| Variable | Value | Environment | Описание |
|----------|-------|-------------|----------|
| `GOOGLE_USER_CLIENT_ID` | Client ID для авторизации пользователей | Production, Preview | OAuth Client ID для авторизации пользователей |
| `GOOGLE_USER_CLIENT_SECRET` | Client Secret для авторизации пользователей | Production, Preview | OAuth Client Secret для авторизации пользователей |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://seohqs.vercel.app/api/auth/user/google/callback` | Production, Preview | Redirect URI для авторизации пользователей |

### Для Google Search Console:

| Variable | Value | Environment | Описание |
|----------|-------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Client ID для Search Console | Production, Preview | OAuth Client ID для Google Search Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret для Search Console | Production, Preview | OAuth Client Secret для Google Search Console |

## Как найти Client ID и Secret

### Для авторизации пользователей:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. **APIs & Services** → **Credentials**
4. Найдите OAuth 2.0 Client ID, который используется для авторизации пользователей
5. Скопируйте:
   - **Client ID** → вставьте в `GOOGLE_USER_CLIENT_ID`
   - **Client secret** → вставьте в `GOOGLE_USER_CLIENT_SECRET`

### Для Google Search Console:

1. В том же разделе найдите OAuth 2.0 Client ID для Search Console
2. Скопируйте:
   - **Client ID** → вставьте в `GOOGLE_CLIENT_ID`
   - **Client secret** → вставьте в `GOOGLE_CLIENT_SECRET`

## Настройка redirect URIs в Google Cloud Console

### Для Client ID авторизации пользователей:

1. Найдите OAuth 2.0 Client ID для авторизации пользователей
2. Нажмите на карандаш (редактировать)
3. В разделе **Authorized redirect URIs** добавьте:
   - `https://seohqs.vercel.app/api/auth/user/google/callback`
   - `http://localhost:3000/api/auth/user/google/callback` (для локальной разработки)
4. Сохраните

### Для Client ID Google Search Console:

1. Найдите OAuth 2.0 Client ID для Search Console
2. Нажмите на карандаш (редактировать)
3. В разделе **Authorized redirect URIs** добавьте:
   - `https://seohqs.vercel.app/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (для локальной разработки)
4. Сохраните

## Обратная совместимость

Если вы не добавите `GOOGLE_USER_CLIENT_ID` и `GOOGLE_USER_CLIENT_SECRET`, код будет использовать `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` (для обратной совместимости).

Но **рекомендуется** использовать отдельные переменные, если у вас два разных Client ID.

## Итоговый список переменных в Vercel

После настройки у вас должно быть:

### Для авторизации пользователей:
1. ✅ `GOOGLE_USER_CLIENT_ID` - Client ID для авторизации пользователей
2. ✅ `GOOGLE_USER_CLIENT_SECRET` - Client Secret для авторизации пользователей
3. ✅ `GOOGLE_OAUTH_REDIRECT_URI` - `https://seohqs.vercel.app/api/auth/user/google/callback`

### Для Google Search Console:
1. ✅ `GOOGLE_CLIENT_ID` - Client ID для Search Console
2. ✅ `GOOGLE_CLIENT_SECRET` - Client Secret для Search Console

### Общие:
1. ✅ `NEXT_PUBLIC_APP_URL` - `https://seohqs.vercel.app` (без завершающего слэша)
2. ✅ `AUTH_SECRET` - секретный ключ для JWT токенов

## Проверка после настройки

1. Убедитесь, что все переменные добавлены в Vercel
2. Убедитесь, что в каждом Client ID добавлены правильные redirect URIs
3. Перезапустите деплой в Vercel
4. Попробуйте авторизоваться через Google
5. Проверьте логи в Vercel - там будет указано, какой Client ID используется

## Важно

- **Каждый Client ID должен иметь свой redirect URI** в Google Cloud Console
- **Client ID для авторизации пользователей** должен иметь redirect URI: `https://seohqs.vercel.app/api/auth/user/google/callback`
- **Client ID для Search Console** должен иметь redirect URI: `https://seohqs.vercel.app/api/auth/google/callback`
- Не путайте Client IDs между собой!
