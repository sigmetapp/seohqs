# Исправление ошибки unauthorized_client при авторизации через Google

## Проблема

При попытке авторизации через Google (кнопка "Войти через Google") возникает ошибка:
```
Ошибка: unauthorized_client
```

## Причины ошибки unauthorized_client

Эта ошибка обычно означает, что:

1. **OAuth consent screen не настроен** или настроен неправильно
2. **Client ID неактивен** или неверный
3. **Приложение в режиме Testing** и пользователь не добавлен в Test users
4. **Запрашиваемые scopes не разрешены** для этого Client ID

## Решение

### Шаг 1: Проверьте OAuth consent screen

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **OAuth consent screen**
4. Убедитесь, что заполнены обязательные поля:
   - **App name** (название приложения)
   - **User support email** (email поддержки)
   - **Developer contact information** (контакт разработчика)

### Шаг 2: Проверьте режим приложения

В разделе **OAuth consent screen** проверьте статус:

#### Если приложение в режиме "Testing":

1. Найдите раздел **Test users** (внизу страницы)
2. Нажмите **"+ ADD USERS"**
3. Добавьте email пользователя, который пытается авторизоваться
4. Сохраните
5. Подождите 1-2 минуты для применения изменений

**Или** переведите приложение в Production:
1. Нажмите **"PUBLISH APP"** (вверху страницы)
2. Заполните необходимую информацию:
   - Privacy Policy URL (обязательно)
   - Terms of Service URL (обязательно)
   - Application home page
3. Подтвердите публикацию

#### Если приложение в режиме "In production":

Проверьте, что приложение опубликовано и не заблокировано Google.

### Шаг 3: Проверьте Client ID

1. Перейдите в **APIs & Services** → **Credentials**
2. Найдите OAuth 2.0 Client ID, который вы используете:
   - Если установлен `GOOGLE_USER_CLIENT_ID` - используйте этот Client ID
   - Иначе используйте `GOOGLE_CLIENT_ID`
3. Убедитесь, что Client ID:
   - **Активен** (не удален и не отключен)
   - Имеет правильный **Application type** (Web application)
   - Имеет правильный **redirect URI** в разделе "Authorized redirect URIs"

### Шаг 4: Проверьте запрашиваемые scopes

Приложение запрашивает следующие scopes:
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

Эти scopes должны быть доступны для вашего Client ID. Обычно они доступны по умолчанию, но проверьте:

1. В **OAuth consent screen** → **Scopes**
2. Убедитесь, что scopes для получения информации о пользователе добавлены

### Шаг 5: Проверьте переменные окружения

Убедитесь, что в Vercel установлены правильные переменные:

| Variable | Описание |
|----------|----------|
| `GOOGLE_USER_CLIENT_ID` | Client ID для авторизации пользователей (или `GOOGLE_CLIENT_ID`) |
| `GOOGLE_USER_CLIENT_SECRET` | Client Secret для авторизации пользователей (или `GOOGLE_CLIENT_SECRET`) |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://seohqs.vercel.app/api/auth/user/google/callback` (рекомендуется) |

**Важно**: После изменения переменных окружения **перезапустите деплой** в Vercel.

## Проверка после исправления

1. **Перезапустите деплой в Vercel** (если изменяли переменные окружения)
2. Попробуйте авторизоваться через Google снова
3. Проверьте логи в Vercel:
   - `[Google User OAuth] Using Client ID:` - какой Client ID используется
   - `[Google User OAuth] Client ID value:` - первые символы Client ID
   - `[Google User OAuth] Redirect URI:` - какой redirect URI используется

## Частые проблемы

### Проблема: "Приложение в режиме Testing"

**Решение**: Добавьте пользователя в Test users или переведите приложение в Production.

### Проблема: "Client ID неактивен"

**Решение**: 
1. Проверьте, что Client ID не был удален
2. Создайте новый Client ID, если старый был удален
3. Обновите переменные окружения в Vercel

### Проблема: "Scopes не разрешены"

**Решение**: 
1. В OAuth consent screen добавьте необходимые scopes
2. Если приложение в режиме Testing, добавьте пользователя в Test users
3. Если приложение в Production, убедитесь, что scopes одобрены Google

## Дополнительная информация

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [GOOGLE_OAUTH_TESTING_MODE_FIX.md](./GOOGLE_OAUTH_TESTING_MODE_FIX.md) - решение проблем с режимом Testing

## Если проблема сохраняется

1. Проверьте логи в Vercel - там будет указан точный Client ID и redirect URI
2. Убедитесь, что Client ID в логах совпадает с тем, что в Google Cloud Console
3. Убедитесь, что OAuth consent screen полностью настроен
4. Попробуйте создать новый OAuth Client ID специально для авторизации пользователей
