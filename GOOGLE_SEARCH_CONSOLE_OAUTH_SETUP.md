# Настройка Google Search Console через OAuth 2.0

## Описание

Теперь Google Search Console можно настроить через OAuth 2.0 авторизацию - это намного проще, чем настройка Service Account! Пользователь просто авторизуется через свой Google аккаунт, и приложение получает доступ к данным Search Console.

## Преимущества OAuth 2.0

✅ **Проще настройка** - не нужно создавать Service Account и скачивать JSON ключи  
✅ **Безопаснее** - токены автоматически обновляются  
✅ **Быстрее** - один клик для авторизации  
✅ **Доступ к вашим сайтам** - автоматически получаете доступ ко всем сайтам, к которым у вас есть доступ в Google Search Console

## Требования

1. **Google Cloud Project** с включенным Google Search Console API
2. **OAuth 2.0 Client ID** и **Client Secret**
3. **Redirect URI** настроен в Google Cloud Console

## Настройка

### Шаг 1: Создание OAuth 2.0 Credentials в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект (или создайте новый)
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. Если это первый раз, настройте OAuth consent screen:
   - Выберите тип пользователя (Internal или External)
   - Заполните обязательные поля (App name, User support email, Developer contact)
   - Добавьте scopes: `https://www.googleapis.com/auth/webmasters.readonly` и `https://www.googleapis.com/auth/webmasters`
   - Сохраните и продолжите
6. Создайте OAuth client ID:
   - **Application type**: Web application
   - **Name**: например, "SEO HQ Search Console"
   - **Authorized redirect URIs**: 
     - Для локальной разработки: `http://localhost:3000/api/auth/google/callback`
     - Для продакшена: `https://yourdomain.com/api/auth/google/callback`
     - ⚠️ **Важно:** Добавьте все домены, на которых будет работать приложение (localhost для разработки и продакшен домен)
     - ⚠️ **Важно:** Redirect URI должен точно совпадать, включая протокол (http/https), домен, порт (если используется) и путь
   - Нажмите **Create**
7. Скопируйте **Client ID** и **Client Secret**

### Шаг 2: Включение Google Search Console API

1. В Google Cloud Console перейдите в **APIs & Services** → **Library**
2. Найдите **Google Search Console API**
3. Нажмите **Enable**

### Шаг 3: Настройка переменных окружения

#### Для локальной разработки

Создайте файл `.env.local` в корне проекта:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Для Vercel (Production)

1. Откройте ваш проект в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменные:

   **GOOGLE_CLIENT_ID:**
   - **Name**: `GOOGLE_CLIENT_ID`
   - **Value**: `your-client-id.apps.googleusercontent.com`
   - **Environment**: Production, Preview, Development

   **GOOGLE_CLIENT_SECRET:**
   - **Name**: `GOOGLE_CLIENT_SECRET`
   - **Value**: `your-client-secret`
   - **Environment**: Production, Preview, Development

   **NEXT_PUBLIC_APP_URL:**
   - **Name**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://yourdomain.com`
   - **Environment**: Production, Preview, Development

4. Нажмите **Save**
5. **Перезапустите деплой** для применения изменений

### Шаг 4: Авторизация в приложении

1. Откройте приложение и перейдите в раздел **Интеграции**
2. Найдите секцию **Google Search Console**
3. Нажмите кнопку **"Авторизоваться через Google"**
4. Вас перенаправит на страницу авторизации Google
5. Выберите Google аккаунт, к которому привязаны сайты в Search Console
6. Предоставьте необходимые разрешения
7. После успешной авторизации вы вернетесь в приложение

### Шаг 5: Настройка URL сайта

1. В секции **Google Search Console** введите URL сайта из Google Search Console
2. Поддерживаются форматы:
   - `sc-domain:example.com` (для доменов)
   - `https://example.com` (для префиксов URL)
   - Полный URL из интерфейса Search Console
3. Нажмите **"Сохранить настройки"**

### Шаг 6: Синхронизация данных

1. Перейдите на страницу сайта
2. Откройте вкладку **Google Console**
3. Нажмите кнопку **Синхронизировать**
4. Данные за последние 30 дней будут загружены автоматически

## Использование

После настройки OAuth вы можете:

- Автоматически синхронизировать данные из Google Search Console
- Получать данные о кликах, показах, CTR и позициях
- Просматривать исторические данные

## Обратная совместимость

Приложение поддерживает оба способа авторизации:

1. **OAuth 2.0** (новый способ, рекомендуется) - проще и удобнее
2. **Service Account** (старый способ) - для обратной совместимости

Если у вас уже настроен Service Account, он продолжит работать. Но рекомендуется перейти на OAuth 2.0 для упрощения настройки.

## Обновление токенов

OAuth токены автоматически обновляются при истечении. Вам не нужно ничего делать - приложение само обновит токены используя refresh token.

## Безопасность

⚠️ **Важные правила безопасности:**

1. **Никогда не коммитьте** файлы с Client Secret в git
2. **Не публикуйте** Client Secret публично
3. Используйте `.env.local` для локальной разработки (он должен быть в `.gitignore`)
4. В Vercel используйте Environment Variables (они зашифрованы)
5. Если Client Secret был скомпрометирован, немедленно удалите его в Google Cloud Console и создайте новый

## Устранение проблем

### Ошибка: "GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET должны быть установлены"

**Причина:** Переменные окружения не настроены  
**Решение:** Убедитесь, что `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` установлены в переменных окружения

### Ошибка: "redirect_uri_mismatch"

**Причина:** Redirect URI в Google Cloud Console не совпадает с URL приложения  
**Решение:** 
1. Определите текущий URL вашего приложения:
   - Для локальной разработки: `http://localhost:3000`
   - Для продакшена: ваш домен (например, `https://yourdomain.com`)
2. Добавьте в Google Cloud Console Redirect URI в формате: `{ваш_домен}/api/auth/google/callback`
   - Для локальной разработки: `http://localhost:3000/api/auth/google/callback`
   - Для продакшена: `https://yourdomain.com/api/auth/google/callback`
3. **Важно:** Redirect URI должен точно совпадать, включая:
   - Протокол (http или https)
   - Домен (localhost или ваш домен)
   - Порт (если используется нестандартный порт)
   - Путь (`/api/auth/google/callback`)
4. После добавления Redirect URI в Google Cloud Console подождите несколько минут для применения изменений
5. Попробуйте авторизоваться снова

**Как добавить Redirect URI в Google Cloud Console:**
1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Найдите ваш OAuth 2.0 Client ID и нажмите на него для редактирования
5. В разделе **Authorized redirect URIs** нажмите **Add URI**
6. Введите ваш Redirect URI (например, `https://yourdomain.com/api/auth/google/callback`)
7. Нажмите **Save**
8. Подождите 1-2 минуты и попробуйте авторизоваться снова

### Ошибка: "access_denied"

**Причина:** Пользователь отменил авторизацию или не предоставил разрешения  
**Решение:** Попробуйте авторизоваться снова и убедитесь, что предоставили все необходимые разрешения

### Ошибка: "invalid_grant"

**Причина:** Refresh token истек или недействителен  
**Решение:** Авторизуйтесь заново через кнопку "Авторизоваться через Google"

### Ошибка доступа к сайту (403)

**Причина:** У авторизованного Google аккаунта нет доступа к сайту в Search Console  
**Решение:** 
1. Убедитесь, что вы авторизовались с правильным Google аккаунтом
2. Проверьте, что у этого аккаунта есть доступ к сайту в Google Search Console
3. Добавьте аккаунт как пользователя в Google Search Console, если необходимо

## Дополнительная информация

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
