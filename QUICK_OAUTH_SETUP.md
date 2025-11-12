# Быстрая настройка OAuth для Google Search Console

## Шаг 1: Создание OAuth Credentials в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите проект (или создайте новый)
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. Если первый раз - настройте OAuth consent screen (заполните обязательные поля)
6. Создайте OAuth client:
   - **Application type**: Web application
   - **Name**: любое (например, "SEO HQ")
   - **Authorized redirect URIs**: 
     - Локально: `http://localhost:3000/api/auth/google/callback`
     - Vercel: `https://yourdomain.com/api/auth/google/callback`
7. Скопируйте **Client ID** и **Client Secret**

## Шаг 2: Включение API

1. В Google Cloud Console → **APIs & Services** → **Library**
2. Найдите **Google Search Console API**
3. Нажмите **Enable**

## Шаг 3: Настройка переменных окружения

### Для локальной разработки (.env.local):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Для Vercel:

1. Откройте проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. **Settings** → **Environment Variables**
3. Добавьте:
   - `GOOGLE_CLIENT_ID` = ваш Client ID
   - `GOOGLE_CLIENT_SECRET` = ваш Client Secret
   - `NEXT_PUBLIC_APP_URL` = ваш домен (например, `https://yourdomain.com`)
4. **Save** и **перезапустите деплой**

## Шаг 4: Авторизация в приложении

1. Откройте приложение → раздел **Интеграции**
2. Нажмите **"Авторизоваться через Google"**
3. Выберите Google аккаунт
4. Предоставьте разрешения
5. Готово! 🎉

## Проверка

После настройки переменных окружения и перезапуска приложения, кнопка "Авторизоваться через Google" должна работать без ошибок.
