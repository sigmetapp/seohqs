# Инструкция по настройке авторизации пользователей через Google

## Шаг 1: Создание OAuth приложения в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)

2. Выберите существующий проект или создайте новый:
   - Нажмите на выпадающий список проектов в верхней панели
   - Нажмите "New Project"
   - Введите название проекта (например, "SEO Tools")
   - Нажмите "Create"

3. Включите необходимые API:
   - Перейдите в "APIs & Services" → "Library"
   - Найдите и включите следующие API:
     - **Google+ API** (для получения информации о пользователе)
     - **Google Search Console API** (если планируете использовать функции Search Console)

4. Создайте OAuth 2.0 credentials:
   - Перейдите в "APIs & Services" → "Credentials"
   - Нажмите "Create Credentials" → "OAuth client ID"
   - Если появится запрос на настройку OAuth consent screen:
     - Выберите "External" (для тестирования) или "Internal" (для Google Workspace)
     - Заполните обязательные поля:
       - App name: "SEO Tools" (или ваше название)
       - User support email: ваш email
       - Developer contact information: ваш email
     - Нажмите "Save and Continue"
     - На шаге "Scopes" нажмите "Save and Continue"
     - На шаге "Test users" добавьте тестовые email (для внешних приложений)
     - Нажмите "Save and Continue" и "Back to Dashboard"

5. Создайте OAuth Client ID:
   - Application type: выберите "Web application"
   - Name: "SEO Tools Web Client" (или любое другое название)
   - Authorized redirect URIs: добавьте следующие URL:
     
     **Для локальной разработки:**
     ```
     http://localhost:3000/api/auth/user/google/callback
     ```
     
     **Для продакшена (замените на ваш домен):**
     ```
     https://your-domain.com/api/auth/user/google/callback
     https://your-app.vercel.app/api/auth/user/google/callback
     ```
     
     ⚠️ **Важно:** Добавьте все домены, на которых будет работать приложение!
   
   - Нажмите "Create"
   - Скопируйте **Client ID** и **Client Secret** (они понадобятся на следующем шаге)

## Шаг 2: Настройка переменных окружения

### Для локальной разработки (.env.local)

Создайте файл `.env.local` в корне проекта:

```env
# Google OAuth для авторизации пользователей
GOOGLE_CLIENT_ID=ваш_client_id_здесь
GOOGLE_CLIENT_SECRET=ваш_client_secret_здесь

# Секретный ключ для JWT токенов (сгенерируйте случайную строку)
AUTH_SECRET=ваш_случайный_секретный_ключ_минимум_32_символа

# URL приложения (для локальной разработки)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Для продакшена (Vercel)

1. Перейдите в ваш проект на [Vercel](https://vercel.com/)
2. Откройте "Settings" → "Environment Variables"
3. Добавьте следующие переменные:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GOOGLE_CLIENT_ID` | Ваш Client ID из Google Cloud Console | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | Ваш Client Secret из Google Cloud Console | Production, Preview, Development |
| `AUTH_SECRET` | Случайная строка минимум 32 символа | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | https://your-domain.com | Production |

**Как сгенерировать AUTH_SECRET:**
```bash
# В терминале выполните:
openssl rand -base64 32
```

Или используйте любой генератор случайных строк (минимум 32 символа).

## Шаг 3: Выполнение миграций базы данных

Перед использованием авторизации необходимо выполнить миграцию для создания таблицы `users` и добавления `user_id` во все таблицы.

### Для PostgreSQL:

```bash
# Подключитесь к вашей БД и выполните:
psql -U your_user -d your_database -f migrations/009_users_table.sql
```

### Для Supabase:

1. Перейдите в Supabase Dashboard → SQL Editor
2. Скопируйте содержимое файла `migrations/009_users_table_supabase.sql`
3. Вставьте в SQL Editor и выполните

### Для SQLite (только локальная разработка):

```bash
# Выполните миграцию вручную или через API
# SQLite не поддерживает все команды из миграции, 
# поэтому может потребоваться ручное выполнение
```

## Шаг 4: Проверка работы авторизации

1. Запустите приложение:
   ```bash
   npm run dev
   ```

2. Откройте браузер и перейдите на `http://localhost:3000`

3. В правом верхнем углу должна появиться кнопка **"Войти через Google"**

4. Нажмите на кнопку - вас перенаправит на страницу авторизации Google

5. Выберите аккаунт Google и разрешите доступ

6. После успешной авторизации вы будете перенаправлены обратно на сайт

7. В шапке должно отображаться:
   - Ваше имя или email
   - Фото профиля (если есть)
   - Кнопка "Выйти"

## Шаг 5: Проверка работы с данными

После авторизации все данные должны быть привязаны к вашему пользователю:

1. **Сайты** - создайте новый сайт, он будет привязан к вашему аккаунту
2. **Интеграции** - настройки интеграций теперь персональные для каждого пользователя
3. **Google аккаунты** - каждый пользователь видит только свои Google аккаунты

## Возможные проблемы и решения

### Ошибка: "redirect_uri_mismatch"

**Причина:** Redirect URI в Google Cloud Console не совпадает с тем, что используется в приложении.

**Решение:**
1. Проверьте, что в Google Cloud Console добавлен правильный redirect URI:
   - Для локальной разработки: `http://localhost:3000/api/auth/user/google/callback`
   - Для продакшена: `https://your-domain.com/api/auth/user/google/callback`
2. Убедитесь, что в `.env.local` или переменных окружения Vercel установлен правильный `NEXT_PUBLIC_APP_URL`
3. Перезапустите приложение после изменения переменных окружения

### Ошибка: "invalid_client"

**Причина:** Неправильный Client ID или Client Secret.

**Решение:**
1. Проверьте, что `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` правильно скопированы из Google Cloud Console
2. Убедитесь, что нет лишних пробелов в начале или конце значений
3. Перезапустите приложение

### Ошибка: "Требуется авторизация пользователя"

**Причина:** Пользователь не авторизован, но пытается получить доступ к защищенным данным.

**Решение:**
1. Убедитесь, что пользователь авторизован через Google
2. Проверьте, что cookie с сессией установлена (проверьте в DevTools → Application → Cookies)

### Данные не отображаются после авторизации

**Причина:** Миграция базы данных не выполнена или выполнена неправильно.

**Решение:**
1. Проверьте, что таблица `users` создана в базе данных
2. Проверьте, что во всех таблицах есть колонка `user_id`
3. Выполните миграцию заново, если необходимо

## Дополнительные настройки

### Настройка OAuth Consent Screen для продакшена

Если вы публикуете приложение для широкого использования:

1. Перейдите в "APIs & Services" → "OAuth consent screen"
2. Заполните все обязательные поля:
   - App name
   - User support email
   - App logo (опционально)
   - Application home page
   - Privacy policy link
   - Terms of service link
3. Добавьте scopes, которые использует приложение
4. Отправьте приложение на проверку Google (если требуется)

### Безопасность

1. **Никогда не коммитьте** `.env.local` в git
2. Используйте разные `AUTH_SECRET` для разработки и продакшена
3. Регулярно обновляйте секретные ключи
4. Используйте HTTPS в продакшене (Vercel делает это автоматически)

## Структура авторизации

После настройки авторизации:

- **Все пользователи** должны авторизоваться через Google для доступа к данным
- **Каждый пользователь** видит только свои данные (сайты, интеграции, Google аккаунты)
- **Сессия** хранится в httpOnly cookie и действительна 30 дней
- **Автоматический выход** при истечении сессии или удалении cookie

## API Endpoints

После настройки доступны следующие endpoints:

- `GET /api/auth/user/google` - начало OAuth flow
- `GET /api/auth/user/google/callback` - обработка callback от Google
- `GET /api/auth/user/me` - получение информации о текущем пользователе
- `POST /api/auth/user/logout` - выход из системы

Все остальные API endpoints теперь требуют авторизации и автоматически фильтруют данные по текущему пользователю.
