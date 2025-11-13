# Настройка переменных окружения в Vercel

## Использование существующих переменных

Если у вас уже настроены переменные для Google Search Console, **используйте те же самые**:

- ✅ `GOOGLE_CLIENT_ID` - уже есть, используйте его
- ✅ `GOOGLE_CLIENT_SECRET` - уже есть, используйте его

## Что нужно добавить

Добавьте только **одну новую переменную**:

| Variable | Value | Environment | Описание |
|----------|-------|-------------|----------|
| `AUTH_SECRET` | Случайная строка (минимум 32 символа) | Production, Preview, Development | Секретный ключ для JWT токенов сессий |

**Как сгенерировать AUTH_SECRET:**
```bash
openssl rand -base64 32
```

Или используйте любой онлайн генератор случайных строк.

## Настройка Google Cloud Console

В вашем существующем OAuth Client ID нужно добавить **еще один redirect URI**:

### Текущие redirect URIs (для Google Search Console):
```
https://your-domain.com/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

### Добавьте еще один redirect URI (для авторизации пользователей):
```
https://your-domain.com/api/auth/user/google/callback
http://localhost:3000/api/auth/user/google/callback
```

### Как добавить:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. "APIs & Services" → "Credentials"
4. Найдите ваш OAuth 2.0 Client ID (который используется для Search Console)
5. Нажмите на карандаш (редактировать)
6. В разделе "Authorized redirect URIs" добавьте:
   - `https://your-domain.com/api/auth/user/google/callback`
   - `http://localhost:3000/api/auth/user/google/callback` (для локальной разработки)
7. Нажмите "Save"

## Проверка Scopes

Убедитесь, что в OAuth consent screen включены следующие scopes:

- ✅ `https://www.googleapis.com/auth/userinfo.email` (для авторизации пользователей)
- ✅ `https://www.googleapis.com/auth/userinfo.profile` (для авторизации пользователей)
- ✅ `https://www.googleapis.com/auth/webmasters.readonly` (для Search Console)
- ✅ `https://www.googleapis.com/auth/webmasters` (для Search Console)

## Итоговый список переменных в Vercel

После настройки у вас должно быть:

1. ✅ `GOOGLE_CLIENT_ID` - уже есть (используется для обоих случаев)
2. ✅ `GOOGLE_CLIENT_SECRET` - уже есть (используется для обоих случаев)
3. ➕ `AUTH_SECRET` - **добавьте новую** (для JWT токенов)
4. ➕ `NEXT_PUBLIC_APP_URL` - добавьте, если еще нет (ваш домен, например: `https://your-app.vercel.app`)

## Важно

- **Один OAuth Client ID** может использоваться для нескольких redirect URIs
- **Один OAuth Client ID** может запрашивать разные scopes в разных запросах
- Не нужно создавать отдельные OAuth приложения для авторизации пользователей и Search Console

## Проверка после настройки

1. Убедитесь, что в Google Cloud Console добавлены оба redirect URI
2. Убедитесь, что в Vercel добавлен `AUTH_SECRET`
3. Перезапустите деплой в Vercel (или подождите автоматического перезапуска)
4. Проверьте работу авторизации на сайте
