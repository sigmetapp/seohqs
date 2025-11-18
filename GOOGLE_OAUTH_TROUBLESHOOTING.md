# Устранение проблем с Google OAuth redirect_uri_mismatch

## Проверка 1: Режим приложения в Google Cloud Console

Если ваше приложение находится в режиме **Testing** (тестирования), то могут быть ограничения:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **OAuth consent screen**
3. Проверьте статус приложения:
   - **Testing** - только пользователи, добавленные в "Test users", могут авторизоваться
   - **In production** - все пользователи могут авторизоваться

### Ошибка 403: access_denied

Если вы видите ошибку **403: access_denied** с сообщением о том, что приложение находится в режиме тестирования, это означает, что приложение в Google Cloud Console находится в режиме **Testing**, и пользователь не добавлен в список тестовых пользователей.

**Подробная инструкция по решению:** См. [GOOGLE_OAUTH_TESTING_MODE_FIX.md](./GOOGLE_OAUTH_TESTING_MODE_FIX.md)

### Если приложение в режиме Testing:

1. Добавьте пользователя в **Test users**:
   - В разделе "OAuth consent screen" найдите "Test users"
   - Нажмите "+ ADD USERS"
   - Добавьте email пользователя, который пытается авторизоваться
   - Сохраните
   - Подождите 1-2 минуты для применения изменений

2. Или переведите приложение в Production:
   - Нажмите "PUBLISH APP"
   - Заполните необходимую информацию (если требуется):
     - Privacy Policy URL (обязательно)
     - Terms of Service URL (обязательно)
     - Application home page
   - Обратите внимание: для Production может потребоваться верификация приложения Google
   - После публикации любой пользователь сможет авторизоваться

## Проверка 2: Точное совпадение redirect_uri

**КРИТИЧЕСКИ ВАЖНО**: redirect_uri в запросе должен **точно совпадать** с тем, что в Google Cloud Console.

### Шаги проверки:

1. **Проверьте логи в Vercel** после попытки авторизации:
   - Найдите строку: `[User Google OAuth] Redirect URI:`
   - Скопируйте точное значение

2. **Проверьте в Google Cloud Console**:
   - **APIs & Services** → **Credentials**
   - Найдите ваш OAuth 2.0 Client ID
   - Нажмите на карандаш (редактировать)
   - В разделе "Authorized redirect URIs" проверьте список

3. **Убедитесь, что они совпадают ТОЧНО**:
   - ✅ `https://seohqs.vercel.app/api/auth/user/google/callback`
   - ❌ `https://seohqs.vercel.app/api/auth/user/google/callback/` (лишний слэш)
   - ❌ `http://seohqs.vercel.app/api/auth/user/google/callback` (http вместо https)
   - ❌ `https://seohqs.vercel.app/api/auth/user/google/callback ` (пробел в конце)

## Проверка 3: Правильный OAuth Client ID

Убедитесь, что используете **правильный** OAuth Client ID:

1. В Vercel проверьте переменную `GOOGLE_CLIENT_ID`
2. В Google Cloud Console найдите этот Client ID
3. Убедитесь, что в этом Client ID добавлен нужный redirect_uri

## Проверка 4: Переменные окружения в Vercel

Проверьте следующие переменные:

1. **NEXT_PUBLIC_APP_URL**:
   - Должно быть: `https://seohqs.vercel.app` (без завершающего слэша)
   - Не должно быть: `https://seohqs.vercel.app/`

2. **GOOGLE_OAUTH_REDIRECT_URI** (опционально, но рекомендуется):
   - Установите явно: `https://seohqs.vercel.app/api/auth/user/google/callback`
   - Это гарантирует, что будет использоваться правильный redirect_uri

3. **GOOGLE_CLIENT_ID** и **GOOGLE_CLIENT_SECRET**:
   - Убедитесь, что они установлены и правильные

## Проверка 5: Логи в Vercel

После попытки авторизации проверьте логи:

1. Перейдите в Vercel → ваш проект → **Deployments** → выберите последний деплой
2. Откройте **Functions** → найдите `/api/auth/user/google`
3. Проверьте логи, найдите строки:
   - `[User Google OAuth] Redirect URI:` - это тот URI, который отправляется в Google
   - `[User Google OAuth] Redirect URI в authUrl:` - это тот URI, который Google видит в запросе

Эти два значения должны совпадать и совпадать с тем, что в Google Cloud Console.

## Решение проблемы

### Шаг 1: Добавьте GOOGLE_OAUTH_REDIRECT_URI в Vercel

1. Vercel → Settings → Environment Variables
2. Добавьте:
   - **Name**: `GOOGLE_OAUTH_REDIRECT_URI`
   - **Value**: `https://seohqs.vercel.app/api/auth/user/google/callback`
   - **Environment**: Production (и Preview, если нужно)

### Шаг 2: Проверьте Google Cloud Console

1. Убедитесь, что в "Authorized redirect URIs" есть **точно такой же** URI:
   - `https://seohqs.vercel.app/api/auth/user/google/callback`
2. Если его нет - добавьте и сохраните

### Шаг 3: Перезапустите деплой

1. В Vercel перезапустите деплой или подождите автоматического перезапуска
2. Попробуйте авторизоваться снова

### Шаг 4: Проверьте логи

Если проблема сохраняется, проверьте логи и убедитесь, что:
- Redirect URI в логах совпадает с тем, что в Google Cloud Console
- Используется правильный Client ID

## Если ничего не помогает

1. **Проверьте, не используете ли вы другой OAuth Client ID** для авторизации пользователей
2. **Попробуйте создать новый OAuth Client ID** специально для авторизации пользователей
3. **Проверьте, не блокирует ли что-то запросы** (firewall, proxy и т.д.)

## Дополнительная информация

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
