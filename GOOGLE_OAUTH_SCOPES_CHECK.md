# Как проверить и добавить Scopes в Google Cloud Console

## Шаг 1: Открыть OAuth Consent Screen

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект (в верхней панели)
3. В левом меню нажмите **"APIs & Services"** → **"OAuth consent screen"**

## Шаг 2: Проверить Scopes

На странице "OAuth consent screen" вы увидите несколько вкладок:

### Вкладка "Scopes"

1. Прокрутите вниз до раздела **"Scopes"**
2. Там должен быть список добавленных scopes

**Проверьте, что есть следующие scopes:**

✅ `https://www.googleapis.com/auth/userinfo.email`
✅ `https://www.googleapis.com/auth/userinfo.profile`
✅ `https://www.googleapis.com/auth/webmasters.readonly`
✅ `https://www.googleapis.com/auth/webmasters`

### Если scopes отсутствуют - как добавить:

1. На странице "OAuth consent screen" нажмите кнопку **"ADD OR REMOVE SCOPES"** (или "Edit app")
2. В разделе "Scopes" нажмите **"ADD SCOPES"**
3. В появившемся окне выберите вкладку **"Manually add scopes"**
4. Добавьте следующие scopes (по одному):

   ```
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/webmasters.readonly
   https://www.googleapis.com/auth/webmasters
   ```

5. Нажмите **"ADD TO TABLE"** для каждого scope
6. Нажмите **"UPDATE"** внизу страницы
7. Нажмите **"SAVE AND CONTINUE"**

## Альтернативный способ (через Credentials)

Scopes также можно проверить при создании OAuth Client ID:

1. "APIs & Services" → "Credentials"
2. Нажмите на ваш OAuth 2.0 Client ID
3. В разделе "Authorized JavaScript origins" и "Authorized redirect URIs" проверьте настройки
4. Scopes запрашиваются динамически в коде, но они должны быть одобрены в OAuth consent screen

## Важные моменты

- **Scopes запрашиваются в коде** - они не хранятся в OAuth Client ID
- **OAuth consent screen** определяет, какие scopes разрешены для вашего приложения
- Если scope не добавлен в consent screen, пользователь не сможет его предоставить

## Проверка через тестирование

После настройки:

1. Попробуйте авторизоваться через Google
2. На странице разрешений Google вы должны увидеть запросы на доступ к:
   - Email адресу
   - Основной информации профиля
   - Google Search Console (если используете)

Если какого-то scope нет в списке разрешений - добавьте его в OAuth consent screen.
